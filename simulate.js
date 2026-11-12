/**
 * Agent Simulation Script
 * Triggers the 3 Winning Demo Scenarios:
 * 1. GREEN PATH: Auto-Approved ($29 Cloud Hosting)
 * 2. RED PATH: Hard Blocked ($450 Luxury Watch)
 * 3. YELLOW PATH: Human Escalation ($90 Domain Names)
 */

const scenario = process.argv[2] || 'all';
const BASE_URL = 'http://localhost:3000';

const SCENARIOS = {
  green: {
    agentId: 'devops-agent-01',
    agentName: 'DevOps Autonomous Provisioner',
    item: 'Compute Node & Cloud Hosting (vCPU 4x)',
    category: 'cloud_hosting',
    amount: 29.00,
    currency: 'USD',
    merchant: 'CloudScale Infrastructure Inc',
    intent: 'CAPTURE'
  },
  red: {
    agentId: 'rogue-shopping-agent',
    agentName: 'Autonomous Procurement Agent',
    item: 'Limited Edition Chronograph Luxury Watch',
    category: 'luxury',
    amount: 450.00,
    currency: 'USD',
    merchant: 'Swiss Haute Horlogerie',
    intent: 'AUTHORIZE'
  },
  yellow: {
    agentId: 'growth-marketing-agent',
    agentName: 'Growth AI Campaign Agent',
    item: 'Premium Brand Domain Names Bundle',
    category: 'domain',
    amount: 90.00,
    currency: 'USD',
    merchant: 'NameSecure Registrar',
    intent: 'AUTHORIZE'
  }
};

async function runScenario(name) {
  const payload = SCENARIOS[name];
  if (!payload) {
    console.error(`Unknown scenario: ${name}. Use 'green', 'red', or 'yellow'.`);
    return;
  }

  console.log(`\n=============================================================`);
  console.log(`🤖 [AGENT ACTION] Firing Scenario: ${name.toUpperCase()} PATH`);
  console.log(`🎯 Request: $${payload.amount} for "${payload.item}" (${payload.category})`);
  console.log(`=============================================================`);

  try {
    const res = await fetch(`${BASE_URL}/api/mandate/intercept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Firewall Response:`, JSON.stringify(data, null, 2));

    if (data.verdict === 'AUTO_APPROVED') {
      console.log(`\n🟢 >>> RESULT: AUTO-APPROVED & PAYPAL ORDER CREATED! <<<`);
      if (data.paypalOrder?.approvalUrl) {
        console.log(`🔗 PayPal Approval URL: ${data.paypalOrder.approvalUrl}`);
      }
    } else if (data.verdict === 'HARD_BLOCKED') {
      console.log(`\n🔴 >>> RESULT: FIREWALL HARD-BLOCKED! ZERO PAYPAL CHARGES. <<<`);
    } else if (data.verdict === 'ESCALATE_HUMAN') {
      console.log(`\n🟡 >>> RESULT: ESCALATED TO HUMAN DASHBOARD. AWAITING DECISION. <<<`);
    }
  } catch (err) {
    console.error(`Failed to trigger scenario:`, err.message);
  }
}

async function main() {
  if (scenario === 'all') {
    console.log('Running all 3 demo scenarios sequentially with 3-second delays...');
    await runScenario('green');
    await new Promise(r => setTimeout(r, 2500));
    await runScenario('red');
    await new Promise(r => setTimeout(r, 2500));
    await runScenario('yellow');
  } else {
    await runScenario(scenario);
  }
}

main();
