import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { PolicyEngine } from './policyEngine.js';
import { createOrder, captureOrder } from './paypal.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const policyEngine = new PolicyEngine();
const transactionStore = [];
const idempotencyCache = new Map();

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// REST Endpoints
app.get('/api/config', (req, res) => {
  res.json({
    status: 'ONLINE',
    policies: policyEngine.getPolicies(),
    dailySpent: policyEngine.dailySpent,
    totalTransactions: transactionStore.length
  });
});

app.post('/api/policies/update', (req, res) => {
  const updated = policyEngine.updatePolicies(req.body);
  broadcast('POLICY_UPDATED', updated);
  res.json({ success: true, policies: updated });
});

/**
 * Main Firewall Interception Route
 */
app.post('/api/mandate/intercept', async (req, res) => {
  const {
    agentId = 'agent-01',
    agentName = 'Autonomous Agent',
    item = 'Cloud Resource',
    category = 'cloud_hosting',
    amount = 25.00,
    currency = 'USD',
    merchant = 'Cloud Provider Inc',
    promptIntent = 'User requested additional server capacity',
    idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    intent = 'AUTHORIZE'
  } = req.body;

  console.log(`\n🛡️ [FIREWALL INTERCEPT] ${agentName} requested $${amount} for "${item}" [${category}]`);

  // Idempotency check
  if (idempotencyCache.has(idempotencyKey)) {
    console.log(`⚡ [IDEMPOTENCY HIT] Returning cached transaction for key: ${idempotencyKey}`);
    const existing = idempotencyCache.get(idempotencyKey);
    return res.status(200).json({
      idempotent: true,
      transaction: existing
    });
  }

  // Evaluate
  const evaluation = policyEngine.evaluate({
    agentId,
    amount,
    currency,
    category,
    item,
    promptIntent
  });

  const tx = {
    id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    agentId,
    agentName,
    item,
    category,
    amount: parseFloat(amount),
    currency,
    merchant,
    promptIntent,
    idempotencyKey,
    intent,
    verdict: evaluation.verdict,
    code: evaluation.code,
    reasons: evaluation.reasons,
    aiAudit: evaluation.aiAudit,
    paypalOrder: null,
    status: evaluation.verdict === 'AUTO_APPROVED' ? 'APPROVED' : evaluation.verdict === 'HARD_BLOCKED' ? 'REJECTED' : 'PENDING_HUMAN_APPROVAL'
  };

  idempotencyCache.set(idempotencyKey, tx);

  if (evaluation.verdict === 'AUTO_APPROVED') {
    try {
      const order = await createOrder({
        amount,
        currency,
        item,
        category,
        intent,
        idempotencyKey
      });

      tx.paypalOrder = {
        id: order.id,
        status: order.status,
        approvalUrl: (order.links?.find(l => l.rel === 'approve') || {}).href,
        isSimulated: !!order.isSimulated
      };

      transactionStore.unshift(tx);
      broadcast('TRANSACTION_CREATED', tx);

      return res.status(200).json({
        authorized: true,
        verdict: 'AUTO_APPROVED',
        transaction: tx
      });
    } catch (err) {
      tx.status = 'PAYPAL_ERROR';
      tx.error = err.message;
      transactionStore.unshift(tx);
      broadcast('TRANSACTION_CREATED', tx);
      return res.status(502).json({ error: 'PayPal API Error', details: err.message });
    }
  } else if (evaluation.verdict === 'HARD_BLOCKED') {
    transactionStore.unshift(tx);
    broadcast('TRANSACTION_CREATED', tx);
    return res.status(403).json({
      authorized: false,
      verdict: 'HARD_BLOCKED',
      code: evaluation.code,
      transaction: tx
    });
  } else {
    // ESCALATE_HUMAN
    transactionStore.unshift(tx);
    broadcast('TRANSACTION_CREATED', tx);
    return res.status(202).json({
      authorized: false,
      verdict: 'ESCALATE_HUMAN',
      code: evaluation.code,
      message: 'Transaction paused for human administrator review',
      transaction: tx
    });
  }
});

/**
 * Human In The Loop Decision API
 */
app.post('/api/transactions/:id/decision', async (req, res) => {
  const { id } = req.params;
  const { decision, reviewer = 'Admin Supervisor' } = req.body;

  const record = transactionStore.find(t => t.id === id);
  if (!record) return res.status(404).json({ error: 'Transaction not found' });
  if (record.status !== 'PENDING_HUMAN_APPROVAL') {
    return res.status(400).json({ error: 'Transaction not pending approval' });
  }

  record.reviewedBy = reviewer;
  record.reviewedAt = new Date().toISOString();

  if (decision === 'APPROVE') {
    try {
      const order = await createOrder({
        amount: record.amount,
        currency: record.currency,
        item: record.item,
        category: record.category,
        intent: record.intent,
        idempotencyKey: record.idempotencyKey
      });

      record.status = 'APPROVED';
      record.paypalOrder = {
        id: order.id,
        status: order.status,
        approvalUrl: (order.links?.find(l => l.rel === 'approve') || {}).href,
        isSimulated: !!order.isSimulated
      };

      broadcast('TRANSACTION_UPDATED', record);
      return res.json({ success: true, transaction: record });
    } catch (err) {
      record.status = 'PAYPAL_ERROR';
      record.error = err.message;
      broadcast('TRANSACTION_UPDATED', record);
      return res.status(502).json({ error: err.message });
    }
  } else {
    record.status = 'REJECTED';
    record.verdict = 'MANUALLY_REJECTED';
    record.reasons.push(`Rejected manually by supervisor (${reviewer})`);
    broadcast('TRANSACTION_UPDATED', record);
    return res.json({ success: true, transaction: record });
  }
});

app.get('/api/transactions', (req, res) => {
  res.json({ transactions: transactionStore });
});

// Capture PayPal Order
app.post('/api/orders/:id/capture', async (req, res) => {
  try {
    const result = await captureOrder(req.params.id);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛡️  MANDATE v2 ENTERPRISE FIREWALL IS ONLINE`);
  console.log(`🚀  Command Center: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
