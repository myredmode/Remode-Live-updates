#!/usr/bin/env node
/**
 * REDMODE Phase 2 — Comprehensive Automated End-to-End Test Suite
 *
 * Runs completely isolated against temporary data directories and local mock
 * Meta Graph API + Delhivery servers, exercising the REAL `server.ts` backend
 * and the REAL drop-in `render-webhook/server.js` relay service.
 */

import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'assert/strict';
import { spawn } from 'child_process';

const ROOT_DIR = process.cwd();
const BACKEND_PORT = 3991;
const RENDER_PORT = 3992;
const MOCK_UPSTREAM_PORT = 3993;

const VERIFY_TOKEN = 'test_verify_token_redmode_2026';
const META_APP_SECRET = 'test_meta_app_secret_987654321';
const RELAY_SECRET = 'test_relay_secret_abcdef123456';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'redmode-wa-phase2-'));
const backendDataDir = path.join(tempRoot, 'backend-data');
const renderDataDir = path.join(tempRoot, 'render-data');
fs.mkdirSync(backendDataDir, { recursive: true });
fs.mkdirSync(renderDataDir, { recursive: true });

// ============================================================
// MOCK META GRAPH API + MOCK DELHIVERY SERVER
// ============================================================
const mockState = {
  metaShouldFail: false,
  metaFailCode: 131026,
  metaMessagesSent: [],
  delhiveryCreateCount: 0,
  delhiveryCreatedOrders: [],
  delhiveryLabelCalls: 0,
};

function createMockUpstreamServer() {
  return http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      const url = new URL(req.url || '/', `http://127.0.0.1:${MOCK_UPSTREAM_PORT}`);

      // 1. Meta Graph API: POST /v21.0/:phoneNumberId/messages
      if (req.method === 'POST' && /^\/v21\.0\/[^/]+\/messages$/.test(url.pathname)) {
        let parsed = {};
        try {
          parsed = JSON.parse(rawBody || '{}');
        } catch {}

        if (mockState.metaShouldFail) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              error: {
                message: 'Message undeliverable (simulated upstream failure)',
                type: 'OAuthException',
                code: mockState.metaFailCode,
              },
            })
          );
        }

        const wamid = `wamid.TEST_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        mockState.metaMessagesSent.push({
          wamid,
          timestamp: new Date().toISOString(),
          payload: parsed,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            messaging_product: 'whatsapp',
            contacts: [{ input: parsed.to, wa_id: parsed.to }],
            messages: [{ id: wamid }],
          })
        );
      }

      // 2. Delhivery Pincode Serviceability
      if (req.method === 'GET' && url.pathname.startsWith('/c/api/pin-codes/json')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            delivery_codes: [
              {
                postal_code: {
                  pin: 250002,
                  city: 'Meerut',
                  state_code: 'UP',
                  cod: 'Y',
                  pre_paid: 'Y',
                },
              },
            ],
          })
        );
      }

      // 3. Delhivery Create Shipment
      if (req.method === 'POST' && url.pathname === '/api/cmu/create.json') {
        mockState.delhiveryCreateCount += 1;
        const waybill = `14528976${String(100000 + mockState.delhiveryCreateCount).slice(-6)}`;
        let orderRef = 'UNKNOWN';
        try {
          const params = new URLSearchParams(rawBody);
          const dataJson = JSON.parse(params.get('data') || '{}');
          orderRef = dataJson?.shipments?.[0]?.order || 'UNKNOWN';
        } catch {}
        mockState.delhiveryCreatedOrders.push({ orderRef, waybill });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            success: true,
            rmk: 'Shipment created successfully',
            packages: [
              {
                status: 'Success',
                waybill,
                refnum: orderRef,
                sort_code: 'UP/MRT/01',
                remarks: ['Manifested'],
              },
            ],
          })
        );
      }

      // 4. Delhivery Packing Slip / Label
      if (req.method === 'GET' && url.pathname === '/api/p/packing_slip') {
        mockState.delhiveryLabelCalls += 1;
        const wbns = url.searchParams.get('wbns') || '14528976100001';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            packages: [
              {
                wbn: wbns,
                oid: 'TEST',
                sort_code: 'UP/MRT/01',
                destination: 'Meerut',
                pin: '250002',
                pt: 'COD',
                cod: 1999,
                name: 'Test Customer',
                address: '42 Civil Lines, Meerut',
              },
            ],
          })
        );
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Unhandled mock route ${req.method} ${url.pathname}` }));
    });
  });
}

// ============================================================
// SEED ISOLATED BACKEND DATA
// ============================================================
function seedBackendData() {
  const integrations = {
    whatsappIntegrationDeleted: false,
    whatsappAppSecret: META_APP_SECRET,
    redmodeRelaySecret: RELAY_SECRET,
    whatsappSettings: {
      enabled: true,
      provider: 'meta_cloud_api',
      phoneNumber: '+917302797464',
      phoneNumberId: '1019090087965187',
      wabaId: '954586127319428',
      accessToken: 'EAA_TEST_SYSTEM_USER_TOKEN_1234567890',
      webhookVerifyToken: VERIFY_TOKEN,
      apiEndpoint: `http://127.0.0.1:${MOCK_UPSTREAM_PORT}/v21.0`,
      orderConfirmationEnabled: true,
      reminder23hEnabled: true,
      confirmCodOrders: true,
      confirmPrepaidOrders: true,
      respectSendingWindow: false,
      sendingWindowStartHour: 10,
      sendingWindowEndHour: 21,
      reminderDelayHours: 23,
      manualFollowUpHours: 26,
      confirmationTemplateName: 'redmode_order_confirmation',
      reminderTemplateName: 'redmode_order_reminder_23h',
      templateLanguageCode: 'en',
    },
    delhiverySettings: {
      enabled: true,
      apiToken: 'DELHIVERY_TEST_LIVE_TOKEN_9876543210',
      clientName: 'Redmode',
      warehouseName: 'REDMODE B2C',
      pickupPincode: '250002',
      pickupAddress: 'Shop 12, RedMode Studio, Meerut',
      pickupPhone: '7302797464',
      environment: 'production',
    },
    activeShippingChannelId: 'delhivery',
    shippingChannels: [
      {
        id: 'delhivery',
        provider: 'delhivery',
        name: 'Delhivery Logistics',
        enabled: true,
        apiKey: 'DELHIVERY_TEST_LIVE_TOKEN_9876543210',
        clientId: 'Redmode',
        warehouseName: 'REDMODE B2C',
        environment: 'production',
      },
    ],
  };

  const products = [
    {
      id: 'prod-test-hoodie',
      name: 'RedMode Heavyweight Street Hoodie',
      sku: 'RM-HD-BLK-01',
      price: 1999,
      inStock: true,
      salesCount: 10,
      stockBySize: { S: 4, M: 6, L: 5, XL: 3 },
      colorOptions: [
        {
          name: 'Black',
          hex: '#111111',
          stockBySize: { S: 4, M: 6, L: 5, XL: 3 },
        },
      ],
    },
  ];

  fs.writeFileSync(path.join(backendDataDir, 'integrations-config.json'), JSON.stringify(integrations, null, 2));
  fs.writeFileSync(path.join(backendDataDir, 'products.json'), JSON.stringify(products, null, 2));
  fs.writeFileSync(path.join(backendDataDir, 'orders.json'), JSON.stringify([], null, 2));
}

// ============================================================
// HELPERS
// ============================================================
async function waitForHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForCondition(fn, timeoutMs = 10000, intervalMs = 150) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fn();
      if (res) return res;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw lastErr || new Error('Condition timed out');
}

function signMetaBody(rawJsonString) {
  const digest = crypto.createHmac('sha256', META_APP_SECRET).update(rawJsonString, 'utf8').digest('hex');
  return `sha256=${digest}`;
}

function buildMetaButtonWebhookPayload({ wamid, from, payload, text }) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '954586127319428',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '917302797464',
                phone_number_id: '1019090087965187',
              },
              messages: [
                {
                  from,
                  id: wamid,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'button',
                  button: { payload, text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function buildMetaStatusWebhookPayload({ wamid, status, recipientId, errorCode, errorMessage }) {
  const stObj = {
    id: wamid,
    status,
    timestamp: String(Math.floor(Date.now() / 1000)),
    recipient_id: recipientId,
  };
  if (errorCode) {
    stObj.errors = [{ code: errorCode, title: errorMessage || 'Delivery failed', message: errorMessage || 'Delivery failed' }];
  }
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '954586127319428',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: '1019090087965187' },
              statuses: [stObj],
            },
          },
        ],
      },
    ],
  };
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================
let mockServer;
let backendProc;
let renderProc;

async function cleanup() {
  try {
    if (renderProc && !renderProc.killed) renderProc.kill('SIGTERM');
  } catch {}
  try {
    if (backendProc && !backendProc.killed) backendProc.kill('SIGTERM');
  } catch {}
  try {
    if (mockServer) await new Promise((r) => mockServer.close(() => r()));
  } catch {}
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch {}
}

async function runTests() {
  seedBackendData();

  mockServer = createMockUpstreamServer();
  await new Promise((resolve) => mockServer.listen(MOCK_UPSTREAM_PORT, '127.0.0.1', resolve));

  backendProc = spawn(
    path.join(ROOT_DIR, 'node_modules', '.bin', 'tsx'),
    ['server.ts'],
    {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        PORT: String(BACKEND_PORT),
        HOST: '127.0.0.1',
        REDMODE_DATA_DIR: backendDataDir,
        ALLOW_LOCAL_TEST_ENDPOINTS: 'true',
        WHATSAPP_TEST_API_ENDPOINT: `http://127.0.0.1:${MOCK_UPSTREAM_PORT}/v21.0`,
        DELHIVERY_TEST_BASE_URL: `http://127.0.0.1:${MOCK_UPSTREAM_PORT}`,
        WHATSAPP_APP_SECRET: META_APP_SECRET,
        REDMODE_RELAY_SECRET: RELAY_SECRET,
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: VERIFY_TOKEN,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  renderProc = spawn('node', [path.join(ROOT_DIR, 'render-webhook', 'server.js')], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PORT: String(RENDER_PORT),
      VERIFY_TOKEN,
      META_APP_SECRET,
      REDMODE_RELAY_SECRET: RELAY_SECRET,
      REDMODE_BACKEND_WEBHOOK_URL: `http://127.0.0.1:${BACKEND_PORT}/api/whatsapp/webhook`,
      QUEUE_DATA_DIR: renderDataDir,
      WORKER_POLL_MS: '1000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForHttp(`http://127.0.0.1:${BACKEND_PORT}/api/orders`);
  await waitForHttp(`http://127.0.0.1:${RENDER_PORT}/health`);

  // Authenticate as Super Admin to access protected admin endpoints
  const loginRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'myredmode@gmail.com', password: process.env.ADMIN_MASTER_PASSWORD || 'RedMode@100' }),
  });
  const loginJson = await loginRes.json();
  assert.equal(loginJson.success, true, 'Admin login must succeed for test harness');
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${loginJson.token}`,
  };

  const results = [];
  const runCase = async (name, fn) => {
    try {
      const detail = await fn();
      results.push({ name, passed: true, detail });
      console.log(`PASS | ${name}${detail ? ` — ${detail}` : ''}`);
    } catch (err) {
      results.push({ name, passed: false, detail: err.message });
      console.error(`FAIL | ${name} — ${err.message}`);
      throw err;
    }
  };

  let codOrderId = 'RM-TEST-COD-001';
  let prepaidOrderId = 'RM-TEST-PREPAID-002';
  let reminderOrderId = 'RM-TEST-REMIND-003';
  let failOrderId = 'RM-TEST-FAIL-004';
  let codSentWamid = '';

  // ------------------------------------------------------------
  // TEST 1: COD Order -> Automatic WhatsApp Confirmation (+ IST Window Check)
  // ------------------------------------------------------------
  await runCase('1. COD Order -> Automatic WhatsApp Confirmation & IST Window', async () => {
    const beforeCount = mockState.metaMessagesSent.length;
    const res = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: codOrderId,
        date: new Date().toISOString(),
        customer: {
          name: 'Aarav Sharma',
          mobile: '9876543210',
          address: '42 Civil Lines',
          city: 'Meerut',
          state: 'Uttar Pradesh',
          pincode: '250002',
        },
        paymentMode: 'COD',
        paymentStatus: 'Pending',
        total: 1999,
        items: [
          {
            productId: 'prod-test-hoodie',
            name: 'RedMode Heavyweight Street Hoodie',
            size: 'L',
            color: 'Black',
            quantity: 1,
            price: 1999,
          },
        ],
      }),
    });
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(json.order.orderStatus, 'NEW', 'COD order must stay in Upcoming (NEW)');
    assert.equal(json.order.customerConfirmed, false);
    assert.equal(json.order.whatsappStatus, 'Sent');
    assert.equal(json.order.whatsappDeliveryStatus, 'sent');
    assert.ok(json.order.whatsappMessageId, 'Must persist real WAMID on order');
    codSentWamid = json.order.whatsappMessageId;

    assert.equal(mockState.metaMessagesSent.length, beforeCount + 1);
    const sent = mockState.metaMessagesSent[mockState.metaMessagesSent.length - 1].payload;
    assert.equal(sent.type, 'template');
    assert.equal(sent.template.name, 'redmode_order_confirmation');
    const bodyParams = sent.template.components.find((c) => c.type === 'body').parameters.map((p) => p.text);
    assert.ok(bodyParams[0].includes('Aarav Sharma'), 'Template must include customer name');
    assert.ok(bodyParams[1].includes(codOrderId), 'Template must include order ID');
    assert.ok(
      bodyParams[2].includes('RedMode Heavyweight Street Hoodie') &&
        bodyParams[2].includes('Size: L') &&
        bodyParams[2].includes('x 1'),
      'Template must include product name, size, and quantity'
    );
    assert.ok(bodyParams[3].toUpperCase().includes('COD'));
    assert.ok(bodyParams[4].includes('1,999'));
    assert.ok(bodyParams[5].includes('Meerut') && bodyParams[5].includes('250002'));

    const btnPayloads = sent.template.components
      .filter((c) => c.type === 'button')
      .map((c) => c.parameters?.[0]?.payload);
    assert.deepEqual(btnPayloads, [`CONFIRM_ORDER::${codOrderId}`, `CANCEL_ORDER::${codOrderId}`]);

    // Verify 10 AM - 9 PM IST night window queueing deterministically
    const cfgPath = path.join(backendDataDir, 'integrations-config.json');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    cfg.whatsappSettings.respectSendingWindow = true;
    cfg.whatsappSettings.sendingWindowStartHour = 25; // Impossible current hour -> forces outside-window scheduling
    cfg.whatsappSettings.sendingWindowEndHour = 25;
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

    const nightRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'RM-TEST-NIGHT-001',
        date: new Date().toISOString(),
        customer: {
          name: 'Night Buyer',
          mobile: '9876543219',
          address: '10 Mall Road',
          city: 'Meerut',
          state: 'Uttar Pradesh',
          pincode: '250002',
        },
        paymentMode: 'COD',
        total: 1999,
        items: [{ productId: 'prod-test-hoodie', name: 'RedMode Heavyweight Street Hoodie', size: 'L', color: 'Black', quantity: 1, price: 1999 }],
      }),
    });
    const nightJson = await nightRes.json();
    assert.equal(nightJson.order.whatsappStatus, 'Scheduled', 'Outside-window order must be Scheduled, not sent immediately');
    assert.ok(nightJson.order.scheduledConfirmationTime, 'Scheduled timestamp must be saved');

    // Restore sendingWindow config for remaining deterministic tests
    cfg.whatsappSettings.respectSendingWindow = false;
    cfg.whatsappSettings.sendingWindowStartHour = 10;
    cfg.whatsappSettings.sendingWindowEndHour = 21;
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

    return `WAMID=${codSentWamid}, quick-reply buttons & IST scheduling verified`;
  });

  // ------------------------------------------------------------
  // TEST 2: Prepaid Order -> Automatic WhatsApp Confirmation
  // ------------------------------------------------------------
  await runCase('2. Prepaid Order -> Automatic WhatsApp Confirmation', async () => {
    const beforeCount = mockState.metaMessagesSent.length;
    const res = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: prepaidOrderId,
        date: new Date().toISOString(),
        customer: {
          name: 'Riya Verma',
          mobile: '9811223344',
          address: '18 Saket',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110017',
        },
        paymentMode: 'Prepaid',
        paymentStatus: 'Paid',
        total: 3998,
        items: [
          {
            productId: 'prod-test-hoodie',
            name: 'RedMode Heavyweight Street Hoodie',
            size: 'L',
            color: 'Black',
            quantity: 2,
            price: 1999,
          },
        ],
      }),
    });
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.order.orderStatus, 'NEW', 'Prepaid order must also enter Upcoming per policy');
    assert.equal(json.order.customerConfirmed, false);
    assert.equal(json.order.whatsappStatus, 'Sent');
    assert.equal(json.order.whatsappDeliveryStatus, 'sent');
    assert.equal(mockState.metaMessagesSent.length, beforeCount + 1);
    const sent = mockState.metaMessagesSent[mockState.metaMessagesSent.length - 1].payload;
    const bodyParams = sent.template.components.find((c) => c.type === 'body').parameters.map((p) => p.text);
    assert.ok(bodyParams[3].toUpperCase().includes('PREPAID'));
    return `Prepaid order entered Upcoming & sent WAMID=${json.order.whatsappMessageId}`;
  });

  // ------------------------------------------------------------
  // TEST 3: YES via Render Relay -> Confirmed + Automatic Real AWB (STAYS Confirmed)
  // ------------------------------------------------------------
  await runCase('3. YES Webhook via Render Relay -> Confirmed + Auto Real AWB (NOT RTD)', async () => {
    const yesPayload = buildMetaButtonWebhookPayload({
      wamid: 'wamid.INCOMING_YES_001',
      from: '919876543210',
      payload: `CONFIRM_ORDER::${codOrderId}`,
      text: 'YES',
    });
    const rawBody = JSON.stringify(yesPayload);
    const t0 = Date.now();
    const relayRes = await fetch(`http://127.0.0.1:${RENDER_PORT}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signMetaBody(rawBody),
      },
      body: rawBody,
    });
    const elapsedMs = Date.now() - t0;
    assert.equal(relayRes.status, 200, 'Render must acknowledge Meta with fast HTTP 200');
    const relayJson = await relayRes.json();
    assert.equal(relayJson.queued, true);

    // Wait for signed Render -> RedMode relay and automatic Delhivery AWB creation
    const confirmedOrder = await waitForCondition(async () => {
      const ordersRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`);
      const ordersJson = await ordersRes.json();
      const found = ordersJson.orders.find((o) => o.id === codOrderId);
      if (found && found.orderStatus === 'Confirmed' && found.awb_number) return found;
      return null;
    });

    assert.equal(confirmedOrder.orderStatus, 'Confirmed', 'Order MUST stay Confirmed (never auto-RTD)');
    assert.notEqual(confirmedOrder.orderStatus, 'RTD');
    assert.equal(confirmedOrder.customerConfirmed, true);
    assert.ok(confirmedOrder.customerConfirmedAt, 'Must record confirmation timestamp');
    assert.ok(confirmedOrder.awb_number && /^\d{10,}$/.test(confirmedOrder.awb_number), 'Must save real Delhivery AWB');
    assert.equal(confirmedOrder.delhiveryShipmentStatus, 'created');
    assert.notEqual(confirmedOrder.labelDownloaded, true);
    assert.equal(mockState.delhiveryCreateCount, 1);

    // Confirm customer received acknowledgement text via Meta
    const ackSent = mockState.metaMessagesSent.some(
      (m) => m.payload.type === 'text' && String(m.payload.text?.body || '').includes(codOrderId)
    );
    assert.equal(ackSent, true, 'Customer must receive YES confirmation acknowledgement');

    return `Render ACK ${elapsedMs}ms -> Confirmed, AWB=${confirmedOrder.awb_number}, status=Confirmed (NOT RTD)`;
  });

  // ------------------------------------------------------------
  // TEST 4: CANCEL via Render Relay -> Cancelled + Atomic Once-Only Stock Restore + Block Delhivery
  // ------------------------------------------------------------
  await runCase('4. CANCEL Webhook -> Cancelled + Atomic Stock Restore + Blocks Delhivery', async () => {
    const cancelPayload = buildMetaButtonWebhookPayload({
      wamid: 'wamid.INCOMING_CANCEL_001',
      from: '919811223344',
      payload: `CANCEL_ORDER::${prepaidOrderId}`,
      text: 'CANCEL',
    });
    const rawBody = JSON.stringify(cancelPayload);
    const relayRes = await fetch(`http://127.0.0.1:${RENDER_PORT}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signMetaBody(rawBody),
      },
      body: rawBody,
    });
    assert.equal(relayRes.status, 200);

    const cancelledOrder = await waitForCondition(async () => {
      const ordersRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`);
      const ordersJson = await ordersRes.json();
      const found = ordersJson.orders.find((o) => o.id === prepaidOrderId);
      if (found && found.orderStatus === 'Cancelled' && found.inventoryRestored === true) return found;
      return null;
    });

    assert.equal(cancelledOrder.cancellationSource, 'whatsapp_customer');
    assert.ok(cancelledOrder.cancelledAt);
    assert.equal(cancelledOrder.inventoryRestored, true);

    // Check product stock restored by exact quantity (2 units: 5 -> 7)
    const prodRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/products`);
    const prodJson = await prodRes.json();
    const hoodie = prodJson.products.find((p) => p.id === 'prod-test-hoodie');
    assert.equal(hoodie.stockBySize.L, 7, 'Main size L stock must restore from 5 -> 7');
    assert.equal(hoodie.colorOptions[0].stockBySize.L, 7, 'Color Black size L stock must restore from 5 -> 7');
    assert.equal(hoodie.salesCount, 8, 'Sales count must decrement from 10 -> 8');

    // Verify cancelled order is BLOCKED from entering Delhivery shipment creation
    const delBefore = mockState.delhiveryCreateCount;
    const shipAttempt = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/delhivery/create-shipment`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ order: cancelledOrder }),
    });
    assert.equal(shipAttempt.status, 400, 'Cancelled order must be rejected from Delhivery processing');
    assert.equal(mockState.delhiveryCreateCount, delBefore, 'Delhivery API must NOT be called for cancelled order');

    return 'Order Cancelled, stock restored 5->7 once, Delhivery blocked (HTTP 400)';
  });

  // ------------------------------------------------------------
  // TEST 5: No Reply -> 23-Hour Reminder (Atomic One-Time Guard)
  // ------------------------------------------------------------
  await runCase('5. No Reply after 23h -> One-Time Reminder (Atomic Guard)', async () => {
    const createRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: reminderOrderId,
        date: new Date().toISOString(),
        customer: {
          name: 'Kabir Mehta',
          mobile: '9822334455',
          address: '88 MG Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
        },
        paymentMode: 'COD',
        total: 1999,
        items: [{ productId: 'prod-test-hoodie', name: 'RedMode Heavyweight Street Hoodie', size: 'M', color: 'Black', quantity: 1, price: 1999 }],
      }),
    });
    assert.equal((await createRes.json()).success, true);

    // Backdate confirmationSentAt & whatsappSentAt to 23.2 hours ago on disk
    const ordersPath = path.join(backendDataDir, 'orders.json');
    const diskOrders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
    const idx = diskOrders.findIndex((o) => o.id === reminderOrderId);
    const backdatedIso = new Date(Date.now() - 23.2 * 60 * 60 * 1000).toISOString();
    diskOrders[idx].whatsappSentAt = backdatedIso;
    diskOrders[idx].confirmationSentAt = backdatedIso;
    fs.writeFileSync(ordersPath, JSON.stringify(diskOrders, null, 2));

    const beforeReminders = mockState.metaMessagesSent.filter(
      (m) => m.payload.template?.name === 'redmode_order_reminder_23h'
    ).length;

    // Run scheduler TWICE consecutively to prove atomic once-only guard
    const run1 = await (await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/whatsapp/scheduler/run`, {
      method: 'POST',
      headers: adminHeaders,
    })).json();
    const run2 = await (await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/whatsapp/scheduler/run`, {
      method: 'POST',
      headers: adminHeaders,
    })).json();

    assert.equal(run1.result.remindersSent, 1, 'First scheduler tick must send exactly 1 reminder');
    assert.equal(run2.result.remindersSent, 0, 'Second scheduler tick must NOT send duplicate reminder');

    const afterReminders = mockState.metaMessagesSent.filter(
      (m) => m.payload.template?.name === 'redmode_order_reminder_23h'
    ).length;
    assert.equal(afterReminders, beforeReminders + 1);

    return 'Sent 1 reminder on tick #1, 0 duplicates on tick #2';
  });

  // ------------------------------------------------------------
  // TEST 6: Still No Reply -> needsManualFollowUp = true (Never Auto-Ships)
  // ------------------------------------------------------------
  await runCase('6. Still No Reply -> needsManualFollowUp = true (Never Auto-Ships)', async () => {
    const ordersPath = path.join(backendDataDir, 'orders.json');
    const diskOrders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
    const idx = diskOrders.findIndex((o) => o.id === reminderOrderId);
    const backdatedIso = new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString();
    diskOrders[idx].whatsappSentAt = backdatedIso;
    diskOrders[idx].confirmationSentAt = backdatedIso;
    fs.writeFileSync(ordersPath, JSON.stringify(diskOrders, null, 2));

    const delBefore = mockState.delhiveryCreateCount;
    const runRes = await (await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/whatsapp/scheduler/run`, {
      method: 'POST',
      headers: adminHeaders,
    })).json();
    assert.equal(runRes.result.manualFollowUpFlagged, 1);

    const ordersJson = await (await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`)).json();
    const flagged = ordersJson.orders.find((o) => o.id === reminderOrderId);
    assert.equal(flagged.needsManualFollowUp, true);
    assert.ok(flagged.manualFollowUpFlaggedAt);
    assert.equal(flagged.orderStatus, 'NEW', 'Unconfirmed order must stay in Upcoming');
    assert.equal(flagged.customerConfirmed, false);
    assert.equal(Boolean(flagged.awb_number), false, 'Unconfirmed order must NEVER auto-ship');
    assert.equal(mockState.delhiveryCreateCount, delBefore);

    return 'Flagged needsManualFollowUp=true, remained Upcoming, zero shipment created';
  });

  // ------------------------------------------------------------
  // TEST 7: Duplicate YES/CANCEL Webhooks + Signature Fail-Closed Security
  // ------------------------------------------------------------
  await runCase('7. Duplicate YES/CANCEL Webhooks & Invalid Signature Rejection', async () => {
    // 7a. Render GET /webhook verification (valid vs invalid token)
    const verifyOk = await fetch(
      `http://127.0.0.1:${RENDER_PORT}/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=CHALLENGE_999`
    );
    assert.equal(verifyOk.status, 200);
    assert.equal(await verifyOk.text(), 'CHALLENGE_999');

    const verifyBad = await fetch(
      `http://127.0.0.1:${RENDER_PORT}/webhook?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=CHALLENGE_999`
    );
    assert.equal(verifyBad.status, 403);

    // 7b. Unsigned & tampered POST rejected with HTTP 401 on BOTH Render and RedMode backend
    const badRender = await fetch(`http://127.0.0.1:${RENDER_PORT}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'sha256=deadbeef' },
      body: JSON.stringify({ object: 'whatsapp_business_account' }),
    });
    assert.equal(badRender.status, 401, 'Render must fail-closed with 401 on bad signature');

    const badBackend = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ object: 'whatsapp_business_account' }),
    });
    assert.equal(badBackend.status, 401, 'RedMode backend must fail-closed with 401 on missing signature');

    // 7c. Replay exact same YES wamid + brand-new YES wamid on already-confirmed order
    const delCountBefore = mockState.delhiveryCreateCount;
    const dupYes1 = JSON.stringify(
      buildMetaButtonWebhookPayload({
        wamid: 'wamid.INCOMING_YES_001',
        from: '919876543210',
        payload: `CONFIRM_ORDER::${codOrderId}`,
        text: 'YES',
      })
    );
    const dupYes1Res = await (await fetch(`http://127.0.0.1:${RENDER_PORT}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signMetaBody(dupYes1) },
      body: dupYes1,
    })).json();
    assert.equal(dupYes1Res.duplicate, true, 'Render must deduplicate identical wamid');

    const dupYes2 = JSON.stringify(
      buildMetaButtonWebhookPayload({
        wamid: 'wamid.INCOMING_YES_SECOND_CLICK',
        from: '919876543210',
        payload: `CONFIRM_ORDER::${codOrderId}`,
        text: 'YES',
      })
    );
    await fetch(`http://127.0.0.1:${RENDER_PORT}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signMetaBody(dupYes2) },
      body: dupYes2,
    });

    // 7d. Replay CANCEL with a brand-new wamid on already-cancelled order -> ZERO double stock restoration
    const dupCancel2 = JSON.stringify(
      buildMetaButtonWebhookPayload({
        wamid: 'wamid.INCOMING_CANCEL_SECOND_CLICK',
        from: '919811223344',
        payload: `CANCEL_ORDER::${prepaidOrderId}`,
        text: 'CANCEL',
      })
    );
    await fetch(`http://127.0.0.1:${RENDER_PORT}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signMetaBody(dupCancel2) },
      body: dupCancel2,
    });

    await new Promise((r) => setTimeout(r, 800));
    assert.equal(mockState.delhiveryCreateCount, delCountBefore, 'Duplicate YES must NOT create a second AWB');

    const prodJson = await (await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/products`)).json();
    const hoodie = prodJson.products.find((p) => p.id === 'prod-test-hoodie');
    assert.equal(hoodie.stockBySize.L, 7, 'Duplicate CANCEL must NOT restore stock a second time');
    assert.equal(hoodie.colorOptions[0].stockBySize.L, 7);

    return 'GET verify 200/403, invalid sigs 401, duplicate YES/CANCEL ignored, stock stayed 7';
  });

  // ------------------------------------------------------------
  // TEST 8: WhatsApp Delivery Failure -> Error Log + Safe Retry + Status Webhooks + Render Durable Queue
  // ------------------------------------------------------------
  await runCase('8. Delivery Failure -> Error Log, Safe Retry, Status Forwarding & Render Durable Queue', async () => {
    // 8a. Force Meta API failure when placing order
    mockState.metaShouldFail = true;
    const failOrderRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: failOrderId,
        date: new Date().toISOString(),
        customer: {
          name: 'Neha Singh',
          mobile: '9833445566',
          address: '5 Park Street',
          city: 'Kolkata',
          state: 'West Bengal',
          pincode: '700016',
        },
        paymentMode: 'COD',
        total: 1999,
        items: [{ productId: 'prod-test-hoodie', name: 'RedMode Heavyweight Street Hoodie', size: 'S', color: 'Black', quantity: 1, price: 1999 }],
      }),
    });
    const failOrderJson = await failOrderRes.json();
    assert.equal(failOrderJson.order.whatsappDeliveryStatus, 'failed');
    assert.ok(failOrderJson.order.whatsappError);

    const logsBeforeRetry = await (await fetch(
      `http://127.0.0.1:${BACKEND_PORT}/api/admin/whatsapp/logs?orderId=${failOrderId}`,
      { headers: adminHeaders }
    )).json();
    assert.ok(logsBeforeRetry.logs.length >= 1);
    const failedLog = logsBeforeRetry.logs[0];
    assert.equal(failedLog.status, 'failed');
    assert.equal(failedLog.errorCode, '131026');
    assert.equal(failedLog.retryStatus, 'scheduled');
    assert.ok(failedLog.nextRetryAt);

    // 8b. Recover Meta API and execute safe manual retry
    mockState.metaShouldFail = false;
    const retryRes = await (await fetch(
      `http://127.0.0.1:${BACKEND_PORT}/api/admin/whatsapp/logs/${failedLog.id}/retry`,
      { method: 'POST', headers: adminHeaders }
    )).json();
    assert.equal(retryRes.success, true);
    assert.ok(retryRes.wamid);

    // 8c. Forward Meta delivery/read status webhook through Render -> RedMode
    const statusRaw = JSON.stringify(
      buildMetaStatusWebhookPayload({
        wamid: codSentWamid,
        status: 'read',
        recipientId: '919876543210',
      })
    );
    const stRelayRes = await fetch(`http://127.0.0.1:${RENDER_PORT}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signMetaBody(statusRaw) },
      body: statusRaw,
    });
    assert.equal(stRelayRes.status, 200);

    await waitForCondition(async () => {
      const logsJson = await (await fetch(
        `http://127.0.0.1:${BACKEND_PORT}/api/admin/whatsapp/logs?orderId=${codOrderId}`,
        { headers: adminHeaders }
      )).json();
      return logsJson.logs.find((l) => l.wamid === codSentWamid && l.status === 'read');
    });

    // 8d. Verify Render durable disk queue persists on disk & retries after restart/outage
    const tempOutageDir = path.join(tempRoot, 'render-durable-outage');
    fs.mkdirSync(tempOutageDir, { recursive: true });
    let outageAllowSuccess = false;
    let outageDeliveries = 0;
    const flakyBackend = http.createServer((req, res) => {
      const c = [];
      req.on('data', (d) => c.push(d));
      req.on('end', () => {
        if (!outageAllowSuccess) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Temporary backend outage' }));
        }
        outageDeliveries += 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    });
    await new Promise((r) => flakyBackend.listen(3995, '127.0.0.1', r));

    const outageRender = spawn('node', [path.join(ROOT_DIR, 'render-webhook', 'server.js')], {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        PORT: '3994',
        VERIFY_TOKEN,
        META_APP_SECRET,
        REDMODE_RELAY_SECRET: RELAY_SECRET,
        REDMODE_BACKEND_WEBHOOK_URL: 'http://127.0.0.1:3995/api/whatsapp/webhook',
        QUEUE_DATA_DIR: tempOutageDir,
        WORKER_POLL_MS: '1000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    try {
      await waitForHttp('http://127.0.0.1:3994/health');
      const durablePayload = JSON.stringify(
        buildMetaStatusWebhookPayload({
          wamid: 'wamid.DURABLE_RETRY_TEST',
          status: 'delivered',
          recipientId: '919876543210',
        })
      );
      const r1 = await fetch('http://127.0.0.1:3994/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signMetaBody(durablePayload) },
        body: durablePayload,
      });
      assert.equal(r1.status, 200);

      // Confirm queue.json on disk retains the failed item while backend returns 503
      await waitForCondition(() => {
        const qPath = path.join(tempOutageDir, 'queue.json');
        if (!fs.existsSync(qPath)) return false;
        const q = JSON.parse(fs.readFileSync(qPath, 'utf8'));
        return Array.isArray(q) && q.length === 1 && q[0].attempts >= 1;
      });

      // Simulate Render restart by killing and respawning on the SAME QUEUE_DATA_DIR with backend healthy!
      outageRender.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 400));
      outageAllowSuccess = true;

      // Fast-forward nextAttemptAt on disk to now so boot flush delivers immediately
      const qPath = path.join(tempOutageDir, 'queue.json');
      const savedQ = JSON.parse(fs.readFileSync(qPath, 'utf8'));
      savedQ[0].nextAttemptAt = new Date(Date.now() - 1000).toISOString();
      fs.writeFileSync(qPath, JSON.stringify(savedQ, null, 2));

      const restartedRender = spawn('node', [path.join(ROOT_DIR, 'render-webhook', 'server.js')], {
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          PORT: '3994',
          VERIFY_TOKEN,
          META_APP_SECRET,
          REDMODE_RELAY_SECRET: RELAY_SECRET,
          REDMODE_BACKEND_WEBHOOK_URL: 'http://127.0.0.1:3995/api/whatsapp/webhook',
          QUEUE_DATA_DIR: tempOutageDir,
          WORKER_POLL_MS: '1000',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      try {
        await waitForCondition(() => outageDeliveries === 1, 8000);
        const finalQ = JSON.parse(fs.readFileSync(qPath, 'utf8'));
        assert.equal(finalQ.length, 0, 'Durable queue must empty once recovered delivery succeeds');
      } finally {
        restartedRender.kill('SIGTERM');
      }
    } finally {
      if (!outageRender.killed) outageRender.kill('SIGTERM');
      await new Promise((r) => flakyBackend.close(() => r()));
    }

    return 'Error logged (code=131026), retry succeeded, status=read synced, Render disk queue survived outage + restart';
  });

  // ------------------------------------------------------------
  // TEST 9: Confirmed Order -> Manual Label Download Still Required Before RTD
  // ------------------------------------------------------------
  await runCase('9. Confirmed Order -> Manual Label Download Required Before RTD', async () => {
    const ordersBefore = (await (await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`)).json()).orders;
    const codOrder = ordersBefore.find((o) => o.id === codOrderId);
    assert.equal(codOrder.orderStatus, 'Confirmed', 'Order must still be Confirmed prior to label download');
    assert.ok(codOrder.awb_number);

    // Calling label download API generates a genuine scannable Code-128 label WITHOUT auto-moving to RTD server-side
    const labelRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/delhivery/download-label`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        waybill: codOrder.awb_number,
        order: codOrder,
      }),
    });
    assert.equal(labelRes.status, 200);
    const labelHtml = await labelRes.text();
    assert.ok(labelHtml.includes('<svg') && labelHtml.includes(codOrder.awb_number), 'Label must contain scannable SVG Code-128 barcode & AWB');
    assert.ok(labelHtml.includes('Aarav Sharma'), 'Label must contain customer details');

    // Confirm order is STILL Confirmed until actual client download completion transitions it to RTD
    const ordersAfterApi = (await (await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`)).json()).orders;
    const stillConfirmed = ordersAfterApi.find((o) => o.id === codOrderId);
    assert.equal(stillConfirmed.orderStatus, 'Confirmed', 'API returning label MUST NOT auto-trigger RTD');

    // Now simulate the client completing manual label download -> explicitly moves Confirmed -> RTD
    const rtdRes = await (await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...stillConfirmed,
        orderStatus: 'RTD',
        labelDownloaded: true,
        labelDownloadedAt: new Date().toISOString(),
        rtdAt: new Date().toISOString(),
      }),
    })).json();
    assert.equal(rtdRes.success, true);
    assert.equal(rtdRes.order.orderStatus, 'RTD', 'Order moves to RTD ONLY after manual label download completes');
    assert.equal(rtdRes.order.labelDownloaded, true);

    return `Scannable barcode label generated for AWB ${codOrder.awb_number}; stayed Confirmed until explicit manual download -> RTD`;
  });

  console.log(`\nALL ${results.length}/${results.length} PHASE 2 AUTOMATED TESTS PASSED!`);
}

runTests()
  .then(async () => {
    await cleanup();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\nTEST SUITE FAILED:', err);
    await cleanup();
    process.exit(1);
  });
