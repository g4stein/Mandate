/**
 * Mandate v2 - 1-Click Simulation Runner
 */
const BASE_URL = 'http://localhost:3000';

const SCENARIOS = [
  {
    name: 'GREEN PATH (Auto-Approved)',
    data: {
      agentId: 'devops-agent-01',
      agentName: 'DevOps Autonomous Provisioner',
      item: 'Compute Node & Cloud Hosting (vCPU 4x)',
      category: 'cloud_hosting',
      amount: 29.00,
      currency: 'USD',
      merchant: 'CloudScale Infrastructure Inc',
      intent: 'CAPTURE',
      promptIntent: 'Spike in user load detected, spinning up container'
    }
  },
  {
    name: 'RED PATH (Hard Blocked)',
    data: {
      agentId: 'rogue-bot',
      agentName: 'Autonomous Procurement Agent',
      item: 'Limited Edition Chronograph Luxury Watch',
      category: 'luxury',
      amount: 450.00,
      currency: 'USD',
      merchant: 'Swiss Haute Horlogerie',
      intent: 'AUTHORIZE',
      promptIntent: 'Attempting to buy luxury personal item'
    }
  },
  {
    name: 'YELLOW PATH (Human Escalation)',
    data: {
      agentId: 'growth-agent',
      agentName: 'Growth AI Campaign Agent',
      item: 'Premium Brand Domain Names Bundle',
      category: 'domain',
      amount: 90.00,
      currency: 'USD',
      merchant: 'NameSecure Registrar',
      intent: 'AUTHORIZE',
      promptIntent: 'Registering campaign domains for Q4 launch'
    }
  }
];

async function run() {
  for (const s of SCENARIOS) {
    console.log(`\n======================================================`);
    console.log(`🤖 Firing Scenario: ${s.name}`);
    console.log(`======================================================`);

    try {
      const res = await fetch(`${BASE_URL}/api/mandate/intercept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s.data)
      });
      const json = await res.json();
      console.log(`Verdict:`, json.verdict || (json.transaction && json.transaction.verdict));
      console.log(`Details:`, JSON.stringify(json, null, 2));
    } catch (e) {
      console.error(`Error:`, e.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

run();
