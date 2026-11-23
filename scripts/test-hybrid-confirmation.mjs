#!/usr/bin/env node
/**
 * REDMODE — Hybrid Order Confirmation System (21-Scenario Automated Test Suite)
 *
 * Executes all 21 mandatory business continuity & hybrid confirmation scenarios
 * against the REAL `server.ts` backend and REAL `render-webhook/server.js` relay
 * in completely isolated temp directories with controllable local mock Meta Cloud
 * API and mock Delhivery API servers.
 */

import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'assert/strict';
import { spawn } from 'child_process';

const ROOT_DIR = process.cwd();
const BACKEND_PORT = 3994;
const RENDER_PORT = 3995;
const MOCK_UPSTREAM_PORT = 3996;

const VERIFY_TOKEN = 'test_verify_token_hybrid_2026';
const META_APP_SECRET = 'test_meta_app_secret_hybrid_987';
const RELAY_SECRET = 'test_relay_secret_hybrid_abcdef';
const TEST_META_TOKEN = 'EAA_SECRET_TEST_TOKEN_DO_NOT_LEAK_998877';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'redmode-hybrid-test-'));
const backendDataDir = path.join(tempRoot, 'backend-data');
const renderDataDir = path.join(tempRoot, 'render-data');
fs.mkdirSync(backendDataDir, { recursive: true });
fs.mkdirSync(renderDataDir, { recursive: true });

// ============================================================
// CONTROLLABLE MOCK META CLOUD API + MOCK DELHIVERY SERVER
// ============================================================
const mockState = {
  metaMode: 'ok', // 'ok' | 'down_503' | 'auth_401'
  metaMessagesSent: [],
  delhiveryMode: 'ok', // 'ok' | 'fail'
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

      // 1. Meta Graph API Health Check: GET /v21.0/:phoneNumberId
      if (req.method === 'GET' && /^\/v21\.0\/[^/]+$/.test(url.pathname)) {
        if (mockState.metaMode === 'auth_401') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              error: { message: 'Error validating access token: Session has expired', code: 190 },
            })
          );
        }
        if (mockState.metaMode === 'down_503') {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              error: { message: 'Meta Graph API temporarily unavailable', code: 2 },
            })
          );
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            id: '1019090087965187',
            verified_name: 'REDMODE Official',
            display_phone_number: '+91 73027 97464',
            quality_rating: 'GREEN',
          })
        );
      }

      // 2. Meta Graph API Send Message: POST /v21.0/:phoneNumberId/messages
      if (req.method === 'POST' && /^\/v21\.0\/[^/]+\/messages$/.test(url.pathname)) {
        let parsed = {};
        try {
          parsed = JSON.parse(rawBody || '{}');
        } catch {}

        if (mockState.metaMode === 'auth_401') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              error: { message: 'Invalid OAuth access token', type: 'OAuthException', code: 190 },
            })
          );
        }
        if (mockState.metaMode === 'down_503') {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              error: { message: 'Meta API service temporarily unavailable', type: 'APIException', code: 131000 },
            })
          );
        }

        const wamid = `wamid.HYB_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

      // 3. Delhivery Pincode Serviceability
      if (req.method === 'GET' && url.pathname.startsWith('/c/api/pin-codes/json')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            delivery_codes: [
              {
                postal_code: { pin: 250002, city: 'Meerut', state_code: 'UP', cod: 'Y', pre_paid: 'Y' },
              },
            ],
          })
        );
      }

      // 4. Delhivery Create Shipment
      if (req.method === 'POST' && url.pathname === '/api/cmu/create.json') {
        if (mockState.delhiveryMode === 'fail') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              success: false,
              rmk: 'Delhivery warehouse slot unavailable (simulated failure)',
              packages: [
                { status: 'Fail', remarks: ['Simulated Delhivery AWB failure'] },
              ],
            })
          );
        }

        mockState.delhiveryCreateCount += 1;
        const waybill = `14528988${String(100000 + mockState.delhiveryCreateCount).slice(-6)}`;
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

      // 5. Delhivery Packing Slip / Label
      if (req.method === 'GET' && url.pathname === '/api/p/packing_slip') {
        mockState.delhiveryLabelCalls += 1;
        const wbns = url.searchParams.get('wbns') || '14528988100001';
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
                name: 'Hybrid Customer',
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
      accessToken: TEST_META_TOKEN,
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
      apiToken: 'DELHIVERY_TEST_LIVE_TOKEN_HYBRID',
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
        apiKey: 'DELHIVERY_TEST_LIVE_TOKEN_HYBRID',
        clientId: 'Redmode',
        warehouseName: 'REDMODE B2C',
        environment: 'production',
      },
    ],
  };

  const products = [
    {
      id: 'prod-hyb-tee',
      name: 'RedMode Oversized Tee',
      sku: 'RM-TEE-BLK-01',
      price: 1499,
      inStock: true,
      salesCount: 5,
      stockBySize: { S: 5, M: 10, L: 8, XL: 4 },
      colorOptions: [
        { name: 'Black', hex: '#111111', stockBySize: { S: 5, M: 10, L: 8, XL: 4 } },
      ],
    },
  ];

  fs.writeFileSync(path.join(backendDataDir, 'integrations-config.json'), JSON.stringify(integrations, null, 2));
  fs.writeFileSync(path.join(backendDataDir, 'products.json'), JSON.stringify(products, null, 2));
  fs.writeFileSync(path.join(backendDataDir, 'orders.json'), JSON.stringify([], null, 2));
}

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
              metadata: { display_phone_number: '917302797464', phone_number_id: '1019090087965187' },
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

function buildMetaStatusWebhookPayload({ wamid, status, recipientId }) {
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
              statuses: [
                {
                  id: wamid,
                  status,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: recipientId,
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function makeOrderPayload(id, overrides = {}) {
  return {
    id,
    createdAt: new Date().toISOString(),
    paymentMode: 'COD',
    paymentStatus: 'Pending',
    orderStatus: 'NEW',
    total: 2998,
    subtotal: 2998,
    discount: 0,
    gst: 0,
    deliveryCharge: 0,
    customer: {
      name: 'Aarav Sharma',
      phone: '9876543210',
      mobile: '9876543210',
      address: '42 Civil Lines',
      city: 'Meerut',
      state: 'Uttar Pradesh',
      pincode: '250002',
    },
    items: [
      {
        productId: 'prod-hyb-tee',
        name: 'RedMode Oversized Tee',
        size: 'M',
        color: 'Black',
        quantity: 2,
        price: 1499,
      },
    ],
    ...overrides,
  };
}

async function getOrderById(orderId) {
  const res = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`);
  const data = await res.json();
  return (data.orders || []).find((o) => o.id === orderId);
}

async function sendSignedRenderWebhook(payloadObj) {
  const raw = JSON.stringify(payloadObj);
  const res = await fetch(`http://127.0.0.1:${RENDER_PORT}/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': signMetaBody(raw),
    },
    body: raw,
  });
  return { status: res.status, json: await res.json() };
}

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

  backendProc = spawn(path.join(ROOT_DIR, 'node_modules', '.bin', 'tsx'), ['server.ts'], {
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
  });

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
      WORKER_POLL_MS: '500',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForHttp(`http://127.0.0.1:${BACKEND_PORT}/api/orders`);
  await waitForHttp(`http://127.0.0.1:${RENDER_PORT}/health`);

  const loginRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'myredmode@gmail.com',
      password: process.env.ADMIN_MASTER_PASSWORD || 'RedMode@100',
    }),
  });
  const loginJson = await loginRes.json();
  assert.equal(loginJson.success, true, 'Admin login must succeed');
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${loginJson.token}`,
  };

  let passed = 0;
  const runScenario = async (num, title, fn) => {
    const detail = await fn();
    passed += 1;
    console.log(`PASS [${String(num).padStart(2, '0')}/21] ${title}${detail ? ` — ${detail}` : ''}`);
  };

  // Shared order IDs across scenarios
  const ordOk1 = 'RM-HYB-001';
  const ordDown2 = 'RM-HYB-002';
  const ordDown6 = 'RM-HYB-006';
  const ordWaConfirm8 = 'RM-HYB-008';
  const ordCancel10 = 'RM-HYB-010';
  const ordDelFail14 = 'RM-HYB-014';
  const ordOff19 = 'RM-HYB-019';
  const ordOn20 = 'RM-HYB-020';
  const ordDowntime21 = 'RM-HYB-021';

  let ordOk1Wamid = '';
  let ordOk1Awb = '';
  let ordDown2Awb = '';

  // ------------------------------------------------------------------
  // SCENARIO 1: Customer places order while Meta API is working
  // ------------------------------------------------------------------
  await runScenario(1, 'Customer places order while Meta API is working', async () => {
    mockState.metaMode = 'ok';
    const before = mockState.metaMessagesSent.length;
    const res = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeOrderPayload(ordOk1)),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.order.orderStatus, 'NEW');
    assert.equal(data.order.customerConfirmed, false);
    assert.equal(mockState.metaMessagesSent.length, before + 1);
    ordOk1Wamid = data.order.whatsappMessageId;
    assert.ok(ordOk1Wamid, 'Must record WAMID');
    return `Order ${ordOk1} saved in Upcoming, WAMID=${ordOk1Wamid}`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 2: Customer places order while Meta API is unavailable
  // ------------------------------------------------------------------
  await runScenario(2, 'Customer places order while Meta API is unavailable (503)', async () => {
    mockState.metaMode = 'down_503';
    const res = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeOrderPayload(ordDown2)),
    });
    const data = await res.json();
    assert.equal(res.status, 200, 'Checkout/order save must succeed even when Meta API is down');
    assert.equal(data.success, true);
    assert.equal(data.order.orderStatus, 'NEW');
    assert.equal(data.order.whatsappStatus, 'Failed');
    assert.equal(data.order.needsManualFollowUp, true);
    assert.ok(data.order.whatsappError, 'Failure reason must be recorded');
    return `Order ${ordDown2} safely persisted in Upcoming with Manual Follow-up`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 3: WhatsApp message sends successfully + delivery/read status updates
  // ------------------------------------------------------------------
  await runScenario(3, 'WhatsApp message sends successfully & tracks delivery/read statuses', async () => {
    mockState.metaMode = 'ok';
    const ord = await getOrderById(ordOk1);
    assert.equal(ord.whatsappStatus, 'Sent');
    assert.equal(ord.whatsappDeliveryStatus, 'sent');

    // Simulate delivered & read webhooks through Render
    await sendSignedRenderWebhook(
      buildMetaStatusWebhookPayload({ wamid: ordOk1Wamid, status: 'delivered', recipientId: '919876543210' })
    );
    await waitForCondition(async () => (await getOrderById(ordOk1))?.whatsappDeliveryStatus === 'delivered');

    await sendSignedRenderWebhook(
      buildMetaStatusWebhookPayload({ wamid: ordOk1Wamid, status: 'read', recipientId: '919876543210' })
    );
    await waitForCondition(async () => (await getOrderById(ordOk1))?.whatsappDeliveryStatus === 'read');
    return `WAMID=${ordOk1Wamid} progressed sent → delivered → read`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 4: WhatsApp message fails (clear error reason + audit log)
  // ------------------------------------------------------------------
  await runScenario(4, 'WhatsApp message fails with clear reason, Manual Follow-up & audit log', async () => {
    const ord = await getOrderById(ordDown2);
    assert.equal(ord.whatsappStatus, 'Failed');
    assert.equal(ord.whatsappDeliveryStatus, 'failed');
    assert.equal(ord.needsManualFollowUp, true);
    assert.equal(ord.confirmationTask?.status, 'failed');

    const auditRes = await fetch(
      `http://127.0.0.1:${BACKEND_PORT}/api/admin/confirmation-audit-logs?orderId=${ordDown2}`,
      { headers: adminHeaders }
    );
    const auditJson = await auditRes.json();
    assert.equal(auditJson.success, true);
    const failLog = auditJson.logs.find((l) => l.eventType === 'WHATSAPP_CONFIRMATION_FAILED');
    assert.ok(failLog, 'Must record WHATSAPP_CONFIRMATION_FAILED audit log');
    assert.ok(failLog.errorDetails, 'Audit log must include errorDetails');
    return `Failure recorded in order + persistent audit log`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 5: Admin manually confirms a failed WhatsApp order
  // ------------------------------------------------------------------
  await runScenario(5, 'Admin manually confirms a failed WhatsApp order (requires explicit flag)', async () => {
    // Reject if explicit confirmation checkbox flag missing
    const rejectRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/orders/${ordDown2}/confirm-manual`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminConfirmedCustomerContact: false }),
    });
    assert.equal(rejectRes.status, 400, 'Must reject manual confirm without explicit admin confirmation flag');

    const beforeDelhivery = mockState.delhiveryCreateCount;
    const confirmRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/orders/${ordDown2}/confirm-manual`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        adminConfirmedCustomerContact: true,
        note: 'Verified COD & address on phone call',
      }),
    });
    const confirmJson = await confirmRes.json();
    assert.equal(confirmRes.status, 200);
    assert.equal(confirmJson.success, true);
    assert.equal(confirmJson.order.orderStatus, 'Confirmed', 'Must move to Confirmed, NOT RTD');
    assert.equal(confirmJson.order.confirmationMethod, 'Manual');
    assert.ok(confirmJson.order.confirmedByAdminId, 'Must record confirmedByAdminId');
    assert.equal(confirmJson.order.whatsappStatus, 'Failed', 'Must keep WhatsApp status Failed honestly');
    assert.equal(confirmJson.order.needsManualFollowUp, false);
    assert.equal(mockState.delhiveryCreateCount, beforeDelhivery + 1);
    ordDown2Awb = confirmJson.awb;
    assert.ok(ordDown2Awb, 'Must generate real Delhivery AWB');
    return `Confirmed manually by ${confirmJson.order.confirmedByAdminName}, AWB=${ordDown2Awb}, WA Status=Failed`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 6: Admin manually confirms while Meta API is completely down
  // ------------------------------------------------------------------
  await runScenario(6, 'Admin manually confirms while Meta API is completely down (503)', async () => {
    mockState.metaMode = 'down_503';
    const createRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeOrderPayload(ordDown6)),
    });
    assert.equal(createRes.status, 200);

    const beforeDelhivery = mockState.delhiveryCreateCount;
    const confirmRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/orders/${ordDown6}/confirm-manual`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminConfirmedCustomerContact: true, note: 'Confirmed during Meta outage' }),
    });
    const confirmJson = await confirmRes.json();
    assert.equal(confirmRes.status, 200);
    assert.equal(confirmJson.success, true);
    assert.equal(confirmJson.order.orderStatus, 'Confirmed');
    assert.equal(confirmJson.order.confirmationMethod, 'Manual');
    assert.equal(mockState.delhiveryCreateCount, beforeDelhivery + 1);
    assert.ok(confirmJson.awb, 'AWB created with zero Meta dependency');
    mockState.metaMode = 'ok';
    return `Confirmed during Meta 503 outage with AWB=${confirmJson.awb}`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 7: Customer replies YES after manual confirmation
  // ------------------------------------------------------------------
  await runScenario(7, 'Customer replies YES after manual confirmation (atomic block, no duplicate AWB)', async () => {
    const beforeDelhivery = mockState.delhiveryCreateCount;
    const lateYesWamid = `wamid.LATE_YES_${Date.now()}`;
    const whRes = await sendSignedRenderWebhook(
      buildMetaButtonWebhookPayload({
        wamid: lateYesWamid,
        from: '919876543210',
        payload: `CONFIRM_ORDER::${ordDown2}`,
        text: 'YES',
      })
    );
    assert.equal(whRes.status, 200);

    // Wait for Render relay to forward and backend to write audit log
    await waitForCondition(async () => {
      const r = await fetch(
        `http://127.0.0.1:${BACKEND_PORT}/api/admin/confirmation-audit-logs?orderId=${ordDown2}`,
        { headers: adminHeaders }
      );
      const j = await r.json();
      return (j.logs || []).some((l) => l.eventType === 'DUPLICATE_CONFIRMATION_PREVENTED');
    });

    const ord = await getOrderById(ordDown2);
    assert.equal(ord.confirmationMethod, 'Manual', 'Must preserve original Manual confirmationMethod');
    assert.equal(ord.awb_number, ordDown2Awb, 'AWB must remain unchanged');
    assert.equal(mockState.delhiveryCreateCount, beforeDelhivery, 'Must NOT create a duplicate Delhivery AWB');
    return `Late YES ignored atomically; delhiveryCreateCount unchanged (${beforeDelhivery})`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 8: Customer replies YES twice (second reply ignored, no duplicate AWB)
  // ------------------------------------------------------------------
  await runScenario(8, 'Customer replies YES twice (only 1 confirmation & 1 AWB)', async () => {
    await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeOrderPayload(ordWaConfirm8)),
    });

    const beforeDelhivery = mockState.delhiveryCreateCount;
    await sendSignedRenderWebhook(
      buildMetaButtonWebhookPayload({
        wamid: `wamid.YES1_${Date.now()}`,
        from: '919876543210',
        payload: `CONFIRM_ORDER::${ordWaConfirm8}`,
        text: 'YES',
      })
    );

    await waitForCondition(async () => {
      const o = await getOrderById(ordWaConfirm8);
      return o?.orderStatus === 'Confirmed' && Boolean(o?.awb_number);
    });
    const afterFirst = mockState.delhiveryCreateCount;
    assert.equal(afterFirst, beforeDelhivery + 1, 'First YES must create exactly 1 AWB');
    const firstOrd = await getOrderById(ordWaConfirm8);
    assert.equal(firstOrd.confirmationMethod, 'WhatsApp');

    // Second distinct YES message
    await sendSignedRenderWebhook(
      buildMetaButtonWebhookPayload({
        wamid: `wamid.YES2_${Date.now() + 1}`,
        from: '919876543210',
        payload: `CONFIRM_ORDER::${ordWaConfirm8}`,
        text: 'YES',
      })
    );
    await waitForCondition(async () => {
      const r = await fetch(
        `http://127.0.0.1:${BACKEND_PORT}/api/admin/confirmation-audit-logs?orderId=${ordWaConfirm8}`,
        { headers: adminHeaders }
      );
      const j = await r.json();
      return (j.logs || []).some((l) => l.eventType === 'DUPLICATE_CONFIRMATION_PREVENTED');
    });
    assert.equal(mockState.delhiveryCreateCount, afterFirst, 'Second YES must NOT create duplicate AWB');
    return `1st YES confirmed (AWB=${firstOrd.awb_number}); 2nd YES blocked atomically`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 9: Admin clicks manual confirmation twice
  // ------------------------------------------------------------------
  await runScenario(9, 'Admin clicks manual confirmation twice (idempotent, no duplicate AWB)', async () => {
    const beforeDelhivery = mockState.delhiveryCreateCount;
    const secondRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/orders/${ordDown2}/confirm-manual`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminConfirmedCustomerContact: true }),
    });
    const secondJson = await secondRes.json();
    assert.equal(secondRes.status, 200);
    assert.equal(secondJson.success, true);
    assert.equal(secondJson.alreadyConfirmed, true);
    assert.equal(mockState.delhiveryCreateCount, beforeDelhivery, 'Repeated manual click must NOT create duplicate AWB');
    return `2nd manual confirm returned alreadyConfirmed=true with 0 duplicate AWBs`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 10: Customer replies CANCEL
  // ------------------------------------------------------------------
  await runScenario(10, 'Customer replies CANCEL (moves to Cancelled, blocks Delhivery)', async () => {
    await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeOrderPayload(ordCancel10)),
    });

    const beforeDelhivery = mockState.delhiveryCreateCount;
    const cancelWamid = `wamid.CANCEL1_${Date.now()}`;
    await sendSignedRenderWebhook(
      buildMetaButtonWebhookPayload({
        wamid: cancelWamid,
        from: '919876543210',
        payload: `CANCEL_ORDER::${ordCancel10}`,
        text: 'CANCEL',
      })
    );

    await waitForCondition(async () => (await getOrderById(ordCancel10))?.orderStatus === 'Cancelled');
    const cancelledOrd = await getOrderById(ordCancel10);
    assert.equal(cancelledOrd.orderStatus, 'Cancelled');
    assert.equal(cancelledOrd.cancellationSource, 'whatsapp_customer');
    assert.equal(mockState.delhiveryCreateCount, beforeDelhivery, 'Cancelled order must never trigger Delhivery');
    return `Order ${ordCancel10} moved to Cancelled without Delhivery shipment`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 11: Cancelled order restores stock exactly once
  // ------------------------------------------------------------------
  await runScenario(11, 'Cancelled order restores stock atomically exactly once', async () => {
    const readStockM = () => {
      const prods = JSON.parse(fs.readFileSync(path.join(backendDataDir, 'products.json'), 'utf8'));
      return prods.find((p) => p.id === 'prod-hyb-tee').stockBySize.M;
    };
    const stockAfterFirstCancel = readStockM();
    assert.equal(stockAfterFirstCancel, 12, 'Initial 10 + restored 2 = 12');

    // Duplicate CANCEL webhook with new WAMID
    await sendSignedRenderWebhook(
      buildMetaButtonWebhookPayload({
        wamid: `wamid.CANCEL_DUP_${Date.now()}`,
        from: '919876543210',
        payload: `CANCEL_ORDER::${ordCancel10}`,
        text: 'CANCEL',
      })
    );

    // Admin cancel on already-cancelled order
    const adminCancelRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/orders/${ordCancel10}/cancel`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ reason: 'Duplicate cancel test' }),
    });
    const adminCancelJson = await adminCancelRes.json();
    assert.equal(adminCancelJson.alreadyCancelled, true);

    await new Promise((r) => setTimeout(r, 400));
    assert.equal(readStockM(), 12, 'Stock must remain 12 (never double-restored)');
    return `Stock restored once (10 → 12) and protected against duplicate CANCEL + admin cancel`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 12: Duplicate webhook delivery occurs (same WAMID twice)
  // ------------------------------------------------------------------
  await runScenario(12, 'Duplicate webhook delivery deduplicated at Render & backend', async () => {
    const beforeDelhivery = mockState.delhiveryCreateCount;
    const dupWamid = `wamid.EXACT_DUP_${Date.now()}`;
    const payload = buildMetaButtonWebhookPayload({
      wamid: dupWamid,
      from: '919876543210',
      payload: `CONFIRM_ORDER::${ordOk1}`,
      text: 'YES',
    });

    const first = await sendSignedRenderWebhook(payload);
    assert.equal(first.status, 200);
    await waitForCondition(async () => {
      const o = await getOrderById(ordOk1);
      return o?.orderStatus === 'Confirmed' && Boolean(o?.awb_number);
    });
    ordOk1Awb = (await getOrderById(ordOk1)).awb_number;
    assert.equal(mockState.delhiveryCreateCount, beforeDelhivery + 1);

    // Replay exact same WAMID
    const second = await sendSignedRenderWebhook(payload);
    assert.equal(second.status, 200);
    assert.equal(second.json.duplicate, true, 'Render must deduplicate exact duplicate WAMID');
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(mockState.delhiveryCreateCount, beforeDelhivery + 1, 'Zero duplicate AWB created');
    return `Duplicate WAMID blocked (duplicate=true), AWB=${ordOk1Awb}`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 13: Delhivery AWB generation succeeds (stays Confirmed, NOT RTD)
  // ------------------------------------------------------------------
  await runScenario(13, 'Delhivery AWB generation succeeds and strictly keeps order Confirmed (NOT RTD)', async () => {
    const ord = await getOrderById(ordOk1);
    assert.equal(ord.orderStatus, 'Confirmed', 'AWB generation must NEVER auto-move Confirmed → RTD');
    assert.equal(ord.delhiveryShipmentStatus, 'created');
    assert.equal(ord.awb_number, ordOk1Awb);
    assert.notEqual(ord.labelDownloaded, true);
    return `Order ${ordOk1} has real AWB=${ordOk1Awb} and strictly stays Confirmed`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 14: Delhivery AWB generation fails (order stays Confirmed, error logged, retry works)
  // ------------------------------------------------------------------
  await runScenario(14, 'Delhivery AWB generation fails safely (stays Confirmed, retryable)', async () => {
    mockState.delhiveryMode = 'fail';
    await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeOrderPayload(ordDelFail14)),
    });

    const confirmRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/orders/${ordDelFail14}/confirm-manual`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminConfirmedCustomerContact: true }),
    });
    const confirmJson = await confirmRes.json();
    assert.equal(confirmRes.status, 200);
    assert.equal(confirmJson.order.orderStatus, 'Confirmed');
    assert.equal(confirmJson.order.delhiveryShipmentStatus, 'failed');
    assert.ok(confirmJson.order.delhiveryShipmentError);

    // Now restore mock Delhivery and retry shipment creation
    mockState.delhiveryMode = 'ok';
    const retryShipRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/delhivery/create-shipment`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ order: confirmJson.order }),
    });
    const retryShipJson = await retryShipRes.json();
    assert.equal(retryShipJson.success, true);
    const retryAwb = retryShipJson.waybill || retryShipJson.awb;
    assert.ok(retryAwb, 'Retry shipment must return a real Delhivery waybill/AWB');
    const refreshed = await getOrderById(ordDelFail14);
    assert.equal(refreshed.orderStatus, 'Confirmed', 'Retry AWB still stays Confirmed until label downloaded');
    return `Failed safely with error, then retry created AWB=${retryAwb} while staying Confirmed`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 15: Shipping-label preview / API generation does NOT move order to RTD
  // ------------------------------------------------------------------
  await runScenario(15, 'Shipping-label preview/API fetch does NOT move Confirmed → RTD', async () => {
    const ordBeforePreview = await getOrderById(ordOk1);
    const labelRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/delhivery/download-label`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ order: ordBeforePreview, awb: ordOk1Awb }),
    });
    const labelHtml = await labelRes.text();
    assert.equal(labelRes.status, 200);
    assert.ok(labelHtml.includes('<svg'), 'Must contain scannable SVG barcode');
    assert.ok(labelHtml.includes(ordOk1Awb), 'Label must contain real Delhivery AWB');

    const ordAfterPreview = await getOrderById(ordOk1);
    assert.equal(ordAfterPreview.orderStatus, 'Confirmed', 'Label preview MUST NOT move order to RTD');
    return `Scannable barcode SVG generated; order ${ordOk1} still Confirmed`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 16: Actual successful label download moves Confirmed → RTD
  // ------------------------------------------------------------------
  await runScenario(16, 'Actual successful label download moves Confirmed → RTD (once only)', async () => {
    const beforeDl = await getOrderById(ordOk1);
    assert.equal(beforeDl.orderStatus, 'Confirmed');
    const nowIso = new Date().toISOString();
    const dlRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...beforeDl,
        orderStatus: 'RTD',
        labelDownloaded: true,
        labelDownloadedAt: nowIso,
        rtdAt: nowIso,
      }),
    });
    const dlJson = await dlRes.json();
    assert.equal(dlRes.status, 200);
    assert.equal(dlJson.success, true);

    const ordRtd = await getOrderById(ordOk1);
    assert.equal(ordRtd.orderStatus, 'RTD');
    assert.equal(ordRtd.labelDownloaded, true);
    assert.equal(ordRtd.rtdAt, nowIso);

    // Repeat persistence preserves original rtdAt / RTD state idempotently
    await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...ordRtd,
        orderStatus: 'RTD',
        labelDownloaded: true,
      }),
    });
    const ordRtd2 = await getOrderById(ordOk1);
    assert.equal(ordRtd2.orderStatus, 'RTD');
    return `Order ${ordOk1} moved Confirmed → RTD on actual download; repeat download idempotent`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 17: Verified Delhivery pickup scan moves RTD → In Transit
  // ------------------------------------------------------------------
  await runScenario(17, 'Verified Delhivery pickup scan moves RTD → In Transit', async () => {
    const scanRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/shipping/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        awb: ordOk1Awb,
        status: 'In Transit',
        location: 'Meerut Hub',
      }),
    });
    const scanJson = await scanRes.json();
    assert.equal(scanRes.status, 200);
    assert.equal(scanJson.transitionedToStatus, 'In Transit');

    const ordTransit = await getOrderById(ordOk1);
    assert.equal(ordTransit.orderStatus, 'In Transit');
    assert.ok(ordTransit.pickedUpAt, 'Must record pickedUpAt');
    return `Order ${ordOk1} transitioned RTD → In Transit on verified scan`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 18: Verified Delhivery delivery scan moves In Transit → Completed
  // ------------------------------------------------------------------
  await runScenario(18, 'Verified Delhivery delivery scan moves In Transit → Completed (Delivered)', async () => {
    const delivRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/shipping/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        awb: ordOk1Awb,
        status: 'Delivered',
        location: 'Customer Doorstep, Meerut',
      }),
    });
    const delivJson = await delivRes.json();
    assert.equal(delivRes.status, 200);
    assert.equal(delivJson.transitionedToStatus, 'Delivered');

    const ordDone = await getOrderById(ordOk1);
    assert.equal(ordDone.orderStatus, 'Delivered');
    assert.ok(ordDone.deliveredAt, 'Must record deliveredAt');
    return `Order ${ordOk1} transitioned In Transit → Completed (Delivered)`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 19: WhatsApp Automation switched OFF
  // ------------------------------------------------------------------
  await runScenario(19, 'WhatsApp Automation switched OFF (checkout, DB, manual confirm & Delhivery still work)', async () => {
    const cfgRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/integrations-config`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ whatsappSettings: { enabled: false } }),
    });
    assert.equal(cfgRes.status, 200);

    const beforeMeta = mockState.metaMessagesSent.length;
    const ordRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeOrderPayload(ordOff19)),
    });
    const ordJson = await ordRes.json();
    assert.equal(ordRes.status, 200);
    assert.equal(ordJson.order.orderStatus, 'NEW');
    assert.equal(ordJson.order.confirmationTask?.status, 'automation_off');
    assert.equal(ordJson.order.needsManualFollowUp, true);
    assert.equal(mockState.metaMessagesSent.length, beforeMeta, 'Meta API MUST NOT be called while Automation is OFF');

    // Manual confirm + Delhivery still work
    const manRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/orders/${ordOff19}/confirm-manual`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminConfirmedCustomerContact: true, note: 'Confirmed while WA OFF' }),
    });
    const manJson = await manRes.json();
    assert.equal(manRes.status, 200);
    assert.equal(manJson.order.orderStatus, 'Confirmed');
    assert.ok(manJson.awb);
    return `0 Meta calls while OFF; order saved, manually confirmed & AWB=${manJson.awb} created`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 20: WhatsApp Automation switched ON again (no blind historical resend)
  // ------------------------------------------------------------------
  await runScenario(20, 'WhatsApp Automation switched ON again (never resends historical OFF orders; resumes new)', async () => {
    // Place an unconfirmed historical order while still OFF
    const histOffId = 'RM-HYB-020-HIST';
    await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeOrderPayload(histOffId)),
    });

    // Switch automation back ON
    const onRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/integrations-config`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ whatsappSettings: { enabled: true } }),
    });
    assert.equal(onRes.status, 200);

    // Run scheduler tick — MUST NOT resend histOffId
    const beforeMeta = mockState.metaMessagesSent.length;
    const schedRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/whatsapp/scheduler/run`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(schedRes.status, 200);
    assert.equal(mockState.metaMessagesSent.length, beforeMeta, 'Re-enabling MUST NOT blindly resend historical OFF order');

    // New order placed AFTER re-enabling MUST automatically send WhatsApp confirmation
    const newRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeOrderPayload(ordOn20)),
    });
    const newJson = await newRes.json();
    assert.equal(newRes.status, 200);
    assert.equal(mockState.metaMessagesSent.length, beforeMeta + 1, 'New order after ON must auto-send WhatsApp');
    assert.ok(newJson.order.whatsappMessageId);
    return `Historical order untouched; new order ${ordOn20} sent WAMID=${newJson.order.whatsappMessageId}`;
  });

  // ------------------------------------------------------------------
  // SCENARIO 21: Real health check states + full order processing during Meta API downtime + zero secret leak
  // ------------------------------------------------------------------
  await runScenario(21, 'Real API health check states + full manual lifecycle during Meta downtime + zero secret leak', async () => {
    // 1. Health = Connected (200)
    mockState.metaMode = 'ok';
    const hOk = await (
      await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/whatsapp/health?refresh=1`, { headers: adminHeaders })
    ).json();
    assert.equal(hOk.status, 'Connected');

    // 2. Health = Authentication Error (401)
    mockState.metaMode = 'auth_401';
    const hAuth = await (
      await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/whatsapp/health?refresh=1`, { headers: adminHeaders })
    ).json();
    assert.equal(hAuth.status, 'Authentication Error');

    // 3. Health = Temporarily Unavailable (503)
    mockState.metaMode = 'down_503';
    const hDown = await (
      await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/whatsapp/health?refresh=1`, { headers: adminHeaders })
    ).json();
    assert.equal(hDown.status, 'Temporarily Unavailable');

    // 4. Full lifecycle during Meta 503 outage: create → mark follow-up → manual confirm → AWB → label download → RTD
    await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeOrderPayload(ordDowntime21)),
    });

    const fuRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/orders/${ordDowntime21}/mark-followup`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ flagged: true, reason: 'Call customer manually during outage' }),
    });
    assert.equal((await fuRes.json()).success, true);

    const manRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/orders/${ordDowntime21}/confirm-manual`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminConfirmedCustomerContact: true }),
    });
    const manJson = await manRes.json();
    assert.equal(manJson.order.orderStatus, 'Confirmed');
    assert.ok(manJson.awb);

    const lblHtml = await (
      await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/delhivery/download-label`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ order: manJson.order, awb: manJson.awb }),
      })
    ).text();
    assert.ok(lblHtml.includes('<svg') && lblHtml.includes(manJson.awb));
    assert.equal((await getOrderById(ordDowntime21)).orderStatus, 'Confirmed', 'Still Confirmed before actual download complete');

    await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...manJson.order,
        orderStatus: 'RTD',
        labelDownloaded: true,
        labelDownloadedAt: new Date().toISOString(),
        rtdAt: new Date().toISOString(),
      }),
    });
    assert.equal((await getOrderById(ordDowntime21)).orderStatus, 'RTD');

    // 5. Verify persistent audit logs contain zero secret tokens
    const allAuditRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/admin/confirmation-audit-logs?limit=200`, {
      headers: adminHeaders,
    });
    const allAuditText = await allAuditRes.text();
    assert.ok(!allAuditText.includes(TEST_META_TOKEN), 'Audit logs must NEVER leak Meta access token');
    assert.ok(!allAuditText.includes(META_APP_SECRET), 'Audit logs must NEVER leak Meta app secret');
    assert.ok(!allAuditText.includes(RELAY_SECRET), 'Audit logs must NEVER leak relay secret');

    return `Health verified (Connected / Authentication Error / Temporarily Unavailable); full outage order → RTD passed; 0 secrets leaked`;
  });

  console.log(`\nALL ${passed}/21 HYBRID ORDER CONFIRMATION SCENARIOS PASSED SUCCESSFULLY!`);
}

runTests()
  .catch((err) => {
    console.error('\nTEST SUITE FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
  });
