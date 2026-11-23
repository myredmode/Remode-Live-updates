/**
 * REDMODE — Official Meta WhatsApp Cloud API Webhook Relay Service (Render)
 * Repository: myredmode/redmode-whatsapp-webhook
 * Live Service: https://redmode-whatsapp-webhook.onrender.com
 *
 * Zero extra npm dependencies beyond `express` (uses Node.js 18+ built-ins).
 *
 * Key guarantees:
 * 1. Meta GET /webhook verification with fail-closed constant-time token check.
 * 2. Meta POST /webhook strict X-Hub-Signature-256 verification on exact raw bytes.
 * 3. Fast HTTP 200 acknowledgement to Meta immediately after durable disk enqueue.
 * 4. Durable disk-backed retry queue (queue.json) + dead-letter queue (dead-letter.json)
 *    + persistent event deduplication (processed.json) using atomic write+rename.
 *    Mount a Render Persistent Disk at /var/data (or set QUEUE_DATA_DIR) so queued
 *    events survive Render restarts and deployments.
 * 5. Signed Render-to-RedMode forwarding to REDMODE_BACKEND_WEBHOOK_URL using:
 *    - X-Redmode-Relay-Signature: sha256=<HMAC-SHA256(timestamp + "." + rawBody, REDMODE_RELAY_SECRET)>
 *    - X-Redmode-Relay-Timestamp: <unix ms> (refreshed on each retry attempt)
 *    - X-Redmode-Relay-Source: render
 *    - X-Redmode-Relay-Event-Id: <durable queue item id>
 *    - X-Hub-Signature-256: <original Meta signature preserved for double verification>
 * 6. Forwards BOTH incoming customer messages (YES/CANCEL quick replies + Order IDs)
 *    AND message delivery/read/failed statuses to the single RedMode backend endpoint
 *    (/api/whatsapp/webhook) without creating duplicate webhook routes.
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();

// ============================================================
// CONFIGURATION (Environment Variables)
// ============================================================
const PORT = Number(process.env.PORT || 3000);
const VERIFY_TOKEN = String(
  process.env.VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || ''
).trim();
const META_APP_SECRET = String(
  process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || ''
).trim();
const REDMODE_BACKEND_WEBHOOK_URL = String(
  process.env.REDMODE_BACKEND_WEBHOOK_URL || ''
).trim();
const REDMODE_RELAY_SECRET = String(process.env.REDMODE_RELAY_SECRET || '').trim();

const FORWARD_TIMEOUT_MS = Math.max(
  3000,
  Number(process.env.FORWARD_TIMEOUT_MS || 15000)
);
const WORKER_POLL_MS = Math.max(
  1000,
  Number(process.env.WORKER_POLL_MS || 3000)
);
const MAX_RETRY_ATTEMPTS = Math.max(
  3,
  Number(process.env.MAX_RETRY_ATTEMPTS || 20)
);
const MAX_PROCESSED_KEYS = Math.max(
  500,
  Number(process.env.MAX_PROCESSED_KEYS || 5000)
);
const MAX_DEAD_LETTER_ITEMS = Math.max(
  100,
  Number(process.env.MAX_DEAD_LETTER_ITEMS || 500)
);

const BACKOFF_DELAYS_MS = [
  5 * 1000,       // Attempt 1 retry: 5s
  15 * 1000,      // Attempt 2 retry: 15s
  45 * 1000,      // Attempt 3 retry: 45s
  2 * 60 * 1000,  // Attempt 4 retry: 2m
  5 * 60 * 1000,  // Attempt 5 retry: 5m
  15 * 60 * 1000, // Attempt 6+ retry: 15m
];

// ============================================================
// DURABLE STORAGE DIRECTORY (Atomic write + rename)
// ============================================================
function resolveStorageDir() {
  if (process.env.QUEUE_DATA_DIR && String(process.env.QUEUE_DATA_DIR).trim()) {
    return path.resolve(String(process.env.QUEUE_DATA_DIR).trim());
  }
  // Auto-use Render Persistent Disk if mounted at /var/data
  try {
    if (fs.existsSync('/var/data')) {
      const renderDir = '/var/data/redmode-webhook';
      fs.mkdirSync(renderDir, { recursive: true });
      fs.accessSync(renderDir, fs.constants.W_OK);
      return renderDir;
    }
  } catch {
    // Fallback to local ./data directory
  }
  const fallbackDir = path.join(__dirname, 'data');
  fs.mkdirSync(fallbackDir, { recursive: true });
  return fallbackDir;
}

const DATA_DIR = resolveStorageDir();
fs.mkdirSync(DATA_DIR, { recursive: true });

const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');
const DEAD_LETTER_FILE = path.join(DATA_DIR, 'dead-letter.json');
const PROCESSED_FILE = path.join(DATA_DIR, 'processed.json');

function writeJsonAtomic(filePath, data) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function readJsonSafe(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return parsed;
    }
  } catch (err) {
    console.error(`[STORAGE] Failed reading ${path.basename(filePath)}:`, err.message);
  }
  return fallback;
}

// ============================================================
// IN-MEMORY + DISK-BACKED STATE
// ============================================================
let durableQueue = readJsonSafe(QUEUE_FILE, []);
if (!Array.isArray(durableQueue)) durableQueue = [];

let deadLetterQueue = readJsonSafe(DEAD_LETTER_FILE, []);
if (!Array.isArray(deadLetterQueue)) deadLetterQueue = [];

let processedMap = readJsonSafe(PROCESSED_FILE, {});
if (!processedMap || typeof processedMap !== 'object' || Array.isArray(processedMap)) {
  processedMap = {};
}

const stats = {
  startedAt: new Date().toISOString(),
  receivedWebhooks: 0,
  rejectedSignatures: 0,
  enqueuedEvents: 0,
  deduplicatedEvents: 0,
  deliveredEvents: 0,
  failedForwardAttempts: 0,
  deadLetteredEvents: 0,
  lastEventAt: null,
  lastDeliveredAt: null,
  lastError: null,
};

function persistQueue() {
  writeJsonAtomic(QUEUE_FILE, durableQueue);
}

function persistDeadLetter() {
  if (deadLetterQueue.length > MAX_DEAD_LETTER_ITEMS) {
    deadLetterQueue = deadLetterQueue.slice(0, MAX_DEAD_LETTER_ITEMS);
  }
  writeJsonAtomic(DEAD_LETTER_FILE, deadLetterQueue);
}

function persistProcessed() {
  const entries = Object.entries(processedMap);
  if (entries.length > MAX_PROCESSED_KEYS) {
    entries.sort((a, b) => String(b[1]).localeCompare(String(a[1])));
    processedMap = Object.fromEntries(entries.slice(0, MAX_PROCESSED_KEYS));
  }
  writeJsonAtomic(PROCESSED_FILE, processedMap);
}

// ============================================================
// CRYPTOGRAPHIC HELPERS (Constant-Time Verification)
// ============================================================
function timingSafeEqualString(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyMetaSignature(rawBodyBuffer, signatureHeader) {
  if (!META_APP_SECRET) {
    return { valid: false, status: 500, reason: 'META_APP_SECRET is not configured on Render.' };
  }
  const header = String(signatureHeader || '').trim();
  if (!header || !header.startsWith('sha256=')) {
    return { valid: false, status: 401, reason: 'Missing or malformed X-Hub-Signature-256 header.' };
  }
  const providedHex = header.slice(7).trim().toLowerCase();
  const expectedHex = crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(rawBodyBuffer)
    .digest('hex')
    .toLowerCase();

  if (!timingSafeEqualString(expectedHex, providedHex)) {
    return { valid: false, status: 401, reason: 'Invalid Meta X-Hub-Signature-256 signature.' };
  }
  return { valid: true, status: 200 };
}

function signRelayPayload(rawBodyBuffer, timestampMs) {
  const ts = String(timestampMs);
  const digest = crypto
    .createHmac('sha256', REDMODE_RELAY_SECRET)
    .update(`${ts}.`)
    .update(rawBodyBuffer)
    .digest('hex');
  return `sha256=${digest}`;
}

// ============================================================
// PAYLOAD INSPECTION & EVENT DEDUPLICATION EXTRACTION
// ============================================================
function extractActionAndOrderId(msg) {
  let rawPayload = '';
  let rawText = '';

  if (msg && msg.type === 'button' && msg.button) {
    rawPayload = String(msg.button.payload || '').trim();
    rawText = String(msg.button.text || '').trim();
  } else if (msg && msg.type === 'interactive' && msg.interactive) {
    if (msg.interactive.button_reply) {
      rawPayload = String(msg.interactive.button_reply.id || '').trim();
      rawText = String(msg.interactive.button_reply.title || '').trim();
    } else if (msg.interactive.list_reply) {
      rawPayload = String(msg.interactive.list_reply.id || '').trim();
      rawText = String(msg.interactive.list_reply.title || '').trim();
    }
  } else if (msg && msg.type === 'text' && msg.text) {
    rawText = String(msg.text.body || '').trim();
  }

  let action = 'OTHER';
  let orderId = null;

  const confirmMatch = rawPayload.match(/^CONFIRM_ORDER::(.+)$/i);
  const cancelMatch = rawPayload.match(/^CANCEL_ORDER::(.+)$/i);
  if (confirmMatch) {
    action = 'YES';
    orderId = confirmMatch[1].trim();
  } else if (cancelMatch) {
    action = 'CANCEL';
    orderId = cancelMatch[1].trim();
  } else {
    const upper = `${rawPayload} ${rawText}`.toUpperCase();
    if (/\b(YES|CONFIRM|APPROVE)\b/.test(upper)) action = 'YES';
    else if (/\b(CANCEL|REJECT|STOP|NO)\b/.test(upper)) action = 'CANCEL';
    const orderMatch = upper.match(/\b(RM[-_]?[A-Z0-9-]+|ORD[-_]?[A-Z0-9-]+)\b/);
    if (orderMatch) orderId = orderMatch[1];
  }

  return { action, orderId, rawPayload, rawText };
}

function inspectMetaWebhookPayload(payload, rawBodyBuffer) {
  const dedupeKeys = [];
  const messageSummaries = [];
  const statusSummaries = [];

  const entries = Array.isArray(payload && payload.entry) ? payload.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry && entry.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = (change && change.value) || {};

      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const msg of messages) {
        const wamid = String(msg && msg.id ? msg.id : '').trim();
        if (wamid) dedupeKeys.push(`msg:${wamid}`);
        const parsed = extractActionAndOrderId(msg);
        messageSummaries.push({
          wamid: wamid || null,
          from: msg && msg.from ? String(msg.from) : null,
          type: msg && msg.type ? String(msg.type) : 'unknown',
          action: parsed.action,
          orderId: parsed.orderId,
        });
      }

      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const st of statuses) {
        const wamid = String(st && st.id ? st.id : '').trim();
        const statusName = String(st && st.status ? st.status : '').toLowerCase();
        const ts = String(st && st.timestamp ? st.timestamp : '');
        if (wamid && statusName) {
          dedupeKeys.push(`status:${wamid}:${statusName}:${ts}`);
        }
        statusSummaries.push({
          wamid: wamid || null,
          status: statusName || 'unknown',
          recipientId: st && st.recipient_id ? String(st.recipient_id) : null,
          errorCode:
            Array.isArray(st && st.errors) && st.errors[0]
              ? String(st.errors[0].code || '')
              : null,
        });
      }
    }
  }

  // Fallback hash key for valid Meta payloads without message/status IDs
  if (dedupeKeys.length === 0) {
    const bodyHash = crypto.createHash('sha256').update(rawBodyBuffer).digest('hex');
    dedupeKeys.push(`raw:${bodyHash}`);
  }

  return {
    dedupeKeys: Array.from(new Set(dedupeKeys)),
    messageSummaries,
    statusSummaries,
  };
}

// ============================================================
// DURABLE FORWARDING WORKER
// ============================================================
let workerBusy = false;

function computeNextRetryAt(attemptCount) {
  const idx = Math.min(Math.max(0, attemptCount - 1), BACKOFF_DELAYS_MS.length - 1);
  return new Date(Date.now() + BACKOFF_DELAYS_MS[idx]).toISOString();
}

async function forwardSingleQueueItem(item) {
  if (!REDMODE_BACKEND_WEBHOOK_URL) {
    throw new Error('REDMODE_BACKEND_WEBHOOK_URL is not configured on Render.');
  }
  if (!REDMODE_RELAY_SECRET) {
    throw new Error('REDMODE_RELAY_SECRET is not configured on Render.');
  }

  const rawBodyBuffer = Buffer.from(item.rawBodyBase64, 'base64');
  const timestampMs = Date.now();
  const relaySignature = signRelayPayload(rawBodyBuffer, timestampMs);

  const headers = {
    'Content-Type': 'application/json',
    'X-Redmode-Relay-Source': 'render',
    'X-Redmode-Relay-Event-Id': item.id,
    'X-Redmode-Relay-Timestamp': String(timestampMs),
    'X-Redmode-Relay-Signature': relaySignature,
  };

  if (item.originalMetaSignature) {
    headers['X-Hub-Signature-256'] = item.originalMetaSignature;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);

  try {
    const response = await fetch(REDMODE_BACKEND_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: rawBodyBuffer,
      signal: controller.signal,
    });

    const responseText = await response.text().catch(() => '');
    return {
      ok: response.ok,
      status: response.status,
      bodyPreview: responseText.slice(0, 300),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function processDurableQueue() {
  if (workerBusy || durableQueue.length === 0) return;
  workerBusy = true;

  try {
    const nowMs = Date.now();
    // Process due items sequentially to preserve event ordering
    for (let i = 0; i < durableQueue.length; ) {
      const item = durableQueue[i];
      const nextAtMs = item.nextAttemptAt ? Date.parse(item.nextAttemptAt) : 0;
      if (nextAtMs && nextAtMs > nowMs) {
        i += 1;
        continue;
      }

      item.attempts = Number(item.attempts || 0) + 1;
      item.lastAttemptAt = new Date().toISOString();

      try {
        const result = await forwardSingleQueueItem(item);
        if (result.ok) {
          // Successfully forwarded to RedMode backend — remove from durable queue
          durableQueue.splice(i, 1);
          persistQueue();
          stats.deliveredEvents += 1;
          stats.lastDeliveredAt = new Date().toISOString();
          console.log(
            `[RELAY DELIVERED] id=${item.id} http=${result.status} attempts=${item.attempts} msgs=${item.meta.messageCount} statuses=${item.meta.statusCount}`
          );
          continue;
        }

        // Non-2xx response from RedMode backend
        const errMsg = `Backend returned HTTP ${result.status}: ${result.bodyPreview || 'no body'}`;
        item.lastError = errMsg;
        stats.failedForwardAttempts += 1;
        stats.lastError = errMsg;

        const isRetryable =
          result.status >= 500 ||
          result.status === 429 ||
          result.status === 408 ||
          result.status === 401; // Retry 401 briefly in case REDMODE_RELAY_SECRET is mid-rotation

        const maxAllowed = result.status === 401 ? Math.min(5, MAX_RETRY_ATTEMPTS) : MAX_RETRY_ATTEMPTS;

        if (!isRetryable || item.attempts >= maxAllowed) {
          durableQueue.splice(i, 1);
          deadLetterQueue.unshift({
            ...item,
            deadLetteredAt: new Date().toISOString(),
            reason: errMsg,
          });
          persistQueue();
          persistDeadLetter();
          stats.deadLetteredEvents += 1;
          console.error(`[RELAY DEAD-LETTER] id=${item.id} attempts=${item.attempts} error=${errMsg}`);
          continue;
        }

        item.nextAttemptAt = computeNextRetryAt(item.attempts);
        persistQueue();
        console.warn(
          `[RELAY RETRY SCHEDULED] id=${item.id} attempt=${item.attempts}/${maxAllowed} next=${item.nextAttemptAt} error=${errMsg}`
        );
        i += 1;
      } catch (err) {
        const errMsg = err && err.name === 'AbortError'
          ? `Forwarding timed out after ${FORWARD_TIMEOUT_MS}ms`
          : (err && err.message) || 'Unknown forwarding error';

        item.lastError = errMsg;
        stats.failedForwardAttempts += 1;
        stats.lastError = errMsg;

        if (item.attempts >= MAX_RETRY_ATTEMPTS) {
          durableQueue.splice(i, 1);
          deadLetterQueue.unshift({
            ...item,
            deadLetteredAt: new Date().toISOString(),
            reason: errMsg,
          });
          persistQueue();
          persistDeadLetter();
          stats.deadLetteredEvents += 1;
          console.error(`[RELAY DEAD-LETTER] id=${item.id} attempts=${item.attempts} error=${errMsg}`);
          continue;
        }

        item.nextAttemptAt = computeNextRetryAt(item.attempts);
        persistQueue();
        console.warn(
          `[RELAY RETRY SCHEDULED] id=${item.id} attempt=${item.attempts}/${MAX_RETRY_ATTEMPTS} next=${item.nextAttemptAt} error=${errMsg}`
        );
        i += 1;
      }
    }
  } finally {
    workerBusy = false;
  }
}

// ============================================================
// EXPRESS MIDDLEWARE (Preserve exact raw bytes for HMAC)
// ============================================================
app.disable('x-powered-by');

app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  })
);

// ============================================================
// ROUTES
// ============================================================

app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'redmode-whatsapp-webhook',
    status: 'ok',
    queueDepth: durableQueue.length,
    deadLetterDepth: deadLetterQueue.length,
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'redmode-whatsapp-webhook',
    uptimeSeconds: Math.round(process.uptime()),
    storageDir: DATA_DIR,
    persistentDiskDetected: DATA_DIR.startsWith('/var/data'),
    configured: {
      verifyToken: Boolean(VERIFY_TOKEN),
      metaAppSecret: Boolean(META_APP_SECRET),
      backendWebhookUrl: Boolean(REDMODE_BACKEND_WEBHOOK_URL),
      relaySecret: Boolean(REDMODE_RELAY_SECRET),
    },
    queue: {
      pending: durableQueue.length,
      deadLetter: deadLetterQueue.length,
      dedupeKeysTracked: Object.keys(processedMap).length,
    },
    stats,
  });
});

/**
 * 1. Meta Webhook Verification (GET /webhook)
 * Fail-closed: rejects if VERIFY_TOKEN is missing or does not match in constant time.
 */
app.get('/webhook', (req, res) => {
  const mode = String(req.query['hub.mode'] || '');
  const token = String(req.query['hub.verify_token'] || '');
  const challenge = String(req.query['hub.challenge'] || '');

  if (!VERIFY_TOKEN) {
    console.error('[WEBHOOK VERIFY] VERIFY_TOKEN env var is not configured.');
    return res.status(500).send('VERIFY_TOKEN is not configured');
  }

  if (mode === 'subscribe' && challenge && timingSafeEqualString(token, VERIFY_TOKEN)) {
    console.log('[WEBHOOK VERIFY] Meta webhook challenge verified successfully.');
    return res.status(200).send(challenge);
  }

  console.warn('[WEBHOOK VERIFY] Rejected webhook verification attempt.');
  return res.sendStatus(403);
});

/**
 * 2. Meta Incoming Webhook Receiver (POST /webhook)
 * - Strictly verifies X-Hub-Signature-256 on exact raw body bytes.
 * - Deduplicates against persistent processed.json.
 * - Durably appends to queue.json BEFORE acknowledging Meta with fast HTTP 200.
 * - Immediately triggers asynchronous signed forwarding to REDMODE_BACKEND_WEBHOOK_URL.
 */
app.post('/webhook', (req, res) => {
  stats.receivedWebhooks += 1;
  stats.lastEventAt = new Date().toISOString();

  const rawBodyBuffer = Buffer.isBuffer(req.rawBody)
    ? req.rawBody
    : Buffer.from(JSON.stringify(req.body || {}), 'utf8');

  const metaSigHeader = String(req.headers['x-hub-signature-256'] || '').trim();
  const sigCheck = verifyMetaSignature(rawBodyBuffer, metaSigHeader);

  if (!sigCheck.valid) {
    stats.rejectedSignatures += 1;
    console.warn(`[WEBHOOK REJECTED] ${sigCheck.reason}`);
    return res.status(sigCheck.status).json({ ok: false, error: sigCheck.reason });
  }

  const payload = req.body || {};
  const inspected = inspectMetaWebhookPayload(payload, rawBodyBuffer);

  // Persistent deduplication check: skip only if ALL event keys in this webhook were already seen
  const unseenKeys = inspected.dedupeKeys.filter((k) => !processedMap[k]);
  if (unseenKeys.length === 0) {
    stats.deduplicatedEvents += 1;
    console.log(`[WEBHOOK DUPLICATE] Skipped already-processed keys: ${inspected.dedupeKeys.join(', ')}`);
    return res.status(200).json({ ok: true, duplicate: true });
  }

  const nowIso = new Date().toISOString();
  for (const key of unseenKeys) {
    processedMap[key] = nowIso;
  }

  const queueItem = {
    id: `rmwh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    receivedAt: nowIso,
    nextAttemptAt: nowIso,
    attempts: 0,
    lastAttemptAt: null,
    lastError: null,
    originalMetaSignature: metaSigHeader,
    rawBodyBase64: rawBodyBuffer.toString('base64'),
    meta: {
      dedupeKeys: unseenKeys,
      messageCount: inspected.messageSummaries.length,
      statusCount: inspected.statusSummaries.length,
      messages: inspected.messageSummaries,
      statuses: inspected.statusSummaries,
    },
  };

  try {
    durableQueue.push(queueItem);
    persistQueue();
    persistProcessed();
    stats.enqueuedEvents += 1;
  } catch (err) {
    console.error('[WEBHOOK STORAGE ERROR] Failed to persist incoming event:', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to durably persist webhook event.' });
  }

  console.log(
    `[WEBHOOK ENQUEUED] id=${queueItem.id} msgs=${inspected.messageSummaries.length} statuses=${inspected.statusSummaries.length} orders=${
      inspected.messageSummaries.map((m) => m.orderId).filter(Boolean).join(',') || 'none'
    }`
  );

  // Fast HTTP 200 acknowledgement to Meta
  res.status(200).json({ ok: true, queued: true, eventId: queueItem.id });

  // Trigger immediate asynchronous delivery outside request lifecycle
  setImmediate(() => {
    processDurableQueue().catch((err) => {
      console.error('[RELAY WORKER ERROR]', err.message);
    });
  });
});

// ============================================================
// STARTUP & BACKGROUND RETRY LOOP
// ============================================================
const workerTimer = setInterval(() => {
  processDurableQueue().catch((err) => {
    console.error('[RELAY WORKER TICK ERROR]', err.message);
  });
}, WORKER_POLL_MS);

if (typeof workerTimer.unref === 'function') {
  workerTimer.unref();
}

const server = app.listen(PORT, () => {
  console.log(
    `[REDMODE RENDER WEBHOOK] Listening on port ${PORT} | dataDir=${DATA_DIR} | pendingOnBoot=${durableQueue.length}`
  );
  if (!VERIFY_TOKEN) console.warn('[WARN] VERIFY_TOKEN is not set.');
  if (!META_APP_SECRET) console.warn('[WARN] META_APP_SECRET is not set.');
  if (!REDMODE_BACKEND_WEBHOOK_URL) console.warn('[WARN] REDMODE_BACKEND_WEBHOOK_URL is not set.');
  if (!REDMODE_RELAY_SECRET) console.warn('[WARN] REDMODE_RELAY_SECRET is not set.');

  // Resume any events persisted before a restart/redeploy
  if (durableQueue.length > 0) {
    setImmediate(() => {
      processDurableQueue().catch((err) => {
        console.error('[RELAY BOOT FLUSH ERROR]', err.message);
      });
    });
  }
});

function gracefulShutdown(signal) {
  console.log(`[REDMODE RENDER WEBHOOK] Received ${signal}, shutting down cleanly...`);
  clearInterval(workerTimer);
  try {
    persistQueue();
    persistProcessed();
    persistDeadLetter();
  } catch (err) {
    console.error('[SHUTDOWN PERSIST ERROR]', err.message);
  }
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
