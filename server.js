import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { PolicyEngine } from './policyEngine.js';
import { createPayPalOrder, capturePayPalOrder } from './paypal.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Storage & Policy Engine
const policyEngine = new PolicyEngine();
const transactionStore = [];
const seenIdempotencyKeys = new Map(); // Idempotency check cache

// Broadcast events to all active connected UI dashboards
function broadcast(event, data) {
  const message = JSON.stringify({ type: event, payload: data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ----------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------

/**
 * 1. Health & Config endpoint
 */
app.get('/api/config', (req, res) => {
  res.json({
    status: 'ONLINE',
    policies: policyEngine.getPolicyConfig(),
    dailySpent: policyEngine.dailySpent,
    totalTransactions: transactionStore.length
  });
});

/**
 * 2. Update Policy Rules dynamically from Dashboard
 */
app.post('/api/policies/update', (req, res) => {
  const updated = policyEngine.updateGlobalPolicy(req.body);
  broadcast('POLICY_UPDATED', updated);
  res.json({ success: true, policies: updated });
});

/**
 * 3. Core Mandate Firewall Entrypoint: /api/mandate/intercept
 * Autonomous AI agents send purchase requests here instead of directly calling PayPal
 */
app.post('/api/mandate/intercept', async (req, res) => {
  const {
    agentId = 'autonomous-agent-default',
    agentName = 'AI Autonomous Agent',
    item = 'Unspecified Item',
    category = 'dev_tools',
    amount = 0,
    currency = 'USD',
    merchant = 'Merchant Partner',
    idempotencyKey = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    intent = 'AUTHORIZE'
  } = req.body;

  console.log(`\n🛡️ [FIREWALL INTERCEPT] Agent ${agentName} (${agentId}) requested $${amount} for '${item}' [${category}]`);

  // Idempotency Protection (Crucial PayPal technical flex)
  if (seenIdempotencyKeys.has(idempotencyKey)) {
    console.log(`⚠️ [DUPLICATE DETECTED] Intercepted duplicate idempotency key: ${idempotencyKey}`);
    const existing = seenIdempotencyKeys.get(idempotencyKey);
    return res.status(200).json({
      idempotentCached: true,
      message: 'Duplicate request intercepted; returning existing transaction status',
      transaction: existing
    });
  }

  // 1. Evaluate policy
  const evaluation = policyEngine.evaluate({
    agentId,
    amount,
    currency,
    category,
    merchant,
    idempotencyKey
  });

  const transactionRecord = {
    id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    agentId,
    agentName,
    item,
    category,
    amount: parseFloat(amount),
    currency,
    merchant,
    idempotencyKey,
    intent,
    verdict: evaluation.verdict,
    code: evaluation.code,
    reasons: evaluation.reasons,
    paypalOrder: null,
    status: evaluation.verdict === 'AUTO_APPROVED' ? 'APPROVED' : evaluation.verdict === 'HARD_BLOCKED' ? 'REJECTED' : 'PENDING_HUMAN_APPROVAL'
  };

  seenIdempotencyKeys.set(idempotencyKey, transactionRecord);

  // 2. Action based on Firewall Verdict
  if (evaluation.verdict === 'AUTO_APPROVED') {
    try {
      console.log(`✅ [FIREWALL PASS] Generating PayPal Order (Intent: ${intent})`);
      const paypalOrder = await createPayPalOrder({
        amount,
        currency,
        description: `Mandate Authorized: ${item} for ${agentName}`,
        intent,
        idempotencyKey
      });

      transactionRecord.paypalOrder = {
        id: paypalOrder.id,
        status: paypalOrder.status,
        approvalUrl: (paypalOrder.links?.find(l => l.rel === 'approve') || {}).href,
        authorizeUrl: (paypalOrder.links?.find(l => l.rel === 'authorize') || {}).href,
        isSimulated: !!paypalOrder.isSimulated
      };

      transactionStore.unshift(transactionRecord);
      broadcast('TRANSACTION_CREATED', transactionRecord);

      return res.status(200).json({
        authorized: true,
        verdict: 'AUTO_APPROVED',
        transactionId: transactionRecord.id,
        paypalOrder: transactionRecord.paypalOrder,
        reasons: evaluation.reasons
      });
    } catch (err) {
      console.error(`❌ [PAYPAL ERROR] Failed to create order:`, err.message);
      transactionRecord.status = 'PAYPAL_ERROR';
      transactionRecord.error = err.message;
      transactionStore.unshift(transactionRecord);
      broadcast('TRANSACTION_CREATED', transactionRecord);
      return res.status(502).json({ error: 'PayPal API Error', details: err.message });
    }
  } else if (evaluation.verdict === 'HARD_BLOCKED') {
    console.log(`🚫 [FIREWALL BLOCKED] Hard policy breach: ${evaluation.reasons.join('; ')}`);
    transactionStore.unshift(transactionRecord);
    broadcast('TRANSACTION_CREATED', transactionRecord);

    return res.status(403).json({
      authorized: false,
      verdict: 'HARD_BLOCKED',
      code: evaluation.code,
      transactionId: transactionRecord.id,
      reasons: evaluation.reasons
    });
  } else {
    // ESCALATE_HUMAN (Yellow Path)
    console.log(`⏳ [HUMAN ESCALATION] Pausing agent request for human supervisor review`);
    transactionStore.unshift(transactionRecord);
    broadcast('TRANSACTION_CREATED', transactionRecord);

    return res.status(202).json({
      authorized: false,
      verdict: 'ESCALATE_HUMAN',
      code: evaluation.code,
      transactionId: transactionRecord.id,
      message: 'Transaction paused. Awaiting human administrator approval in Mandate Command Center',
      reasons: evaluation.reasons
    });
  }
});

/**
 * 4. Human Decision Endpoint (Approve / Reject escalated transaction)
 */
app.post('/api/transactions/:id/decision', async (req, res) => {
  const { id } = req.params;
  const { decision, reviewer = 'Human Administrator' } = req.body; // decision: 'APPROVE' | 'REJECT'

  const record = transactionStore.find(t => t.id === id);
  if (!record) {
    return res.status(404).json({ error: 'Transaction record not found' });
  }

  if (record.status !== 'PENDING_HUMAN_APPROVAL') {
    return res.status(400).json({ error: `Cannot decide on transaction with status ${record.status}` });
  }

  record.reviewedBy = reviewer;
  record.reviewedAt = new Date().toISOString();

  if (decision === 'APPROVE') {
    try {
      console.log(`🧑‍⚖️ [HUMAN APPROVED] Creating PayPal order for escalated request ${record.id}`);
      const paypalOrder = await createPayPalOrder({
        amount: record.amount,
        currency: record.currency,
        description: `Mandate Manual Approval: ${record.item} for ${record.agentName}`,
        intent: record.intent || 'AUTHORIZE',
        idempotencyKey: record.idempotencyKey
      });

      record.status = 'APPROVED';
      record.paypalOrder = {
        id: paypalOrder.id,
        status: paypalOrder.status,
        approvalUrl: (paypalOrder.links?.find(l => l.rel === 'approve') || {}).href,
        authorizeUrl: (paypalOrder.links?.find(l => l.rel === 'authorize') || {}).href,
        isSimulated: !!paypalOrder.isSimulated
      };

      broadcast('TRANSACTION_UPDATED', record);
      return res.json({ success: true, transaction: record });
    } catch (err) {
      record.status = 'PAYPAL_ERROR';
      record.error = err.message;
      broadcast('TRANSACTION_UPDATED', record);
      return res.status(502).json({ error: 'PayPal API Error', details: err.message });
    }
  } else {
    record.status = 'REJECTED';
    record.verdict = 'MANUALLY_REJECTED';
    record.reasons.push(`Rejected manually by ${reviewer}`);
    broadcast('TRANSACTION_UPDATED', record);
    return res.json({ success: true, transaction: record });
  }
});

/**
 * 5. Get all transactions for Dashboard
 */
app.get('/api/transactions', (req, res) => {
  res.json({ transactions: transactionStore });
});

/**
 * 6. Capture an approved authorization
 */
app.post('/api/orders/:orderId/capture', async (req, res) => {
  const { orderId } = req.params;
  try {
    const result = await capturePayPalOrder(orderId);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 MANDATE AI SPENDING FIREWALL IS RUNNING`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`🛡️ Intercept API: http://localhost:${PORT}/api/mandate/intercept`);
  console.log(`======================================================\n`);
});
