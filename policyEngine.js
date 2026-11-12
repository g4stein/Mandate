/**
 * Mandate v2 - Dual-Layer Policy & AI Risk Auditor Engine
 * 
 * Layer 1: Deterministic Rules Engine (Sub-millisecond mathematical enforcement)
 * Layer 2: Semantic AI Risk Auditor (Evaluates intent prompt, anomalies, risk scoring)
 */

export class PolicyEngine {
  constructor() {
    this.policies = {
      autoApproveMax: 50.00,
      hardCapMax: 200.00,
      dailyBudget: 500.00,
      allowedCurrencies: ['USD', 'EUR', 'GBP'],
      allowedCategories: ['cloud_hosting', 'saas', 'domain', 'api_credits', 'infrastructure', 'dev_tools'],
      prohibitedCategories: ['luxury', 'gambling', 'crypto', 'gift_cards', 'weapons'],
      velocityLimitPerMinute: 6
    };

    this.dailySpent = 0;
    this.recentRequests = [];
  }

  getPolicies() {
    return this.policies;
  }

  updatePolicies(newPolicies) {
    this.policies = { ...this.policies, ...newPolicies };
    return this.policies;
  }

  /**
   * AI Risk Auditor (Semantic & Contextual Risk Score 0 - 100)
   */
  auditAIRisk({ promptIntent = '', item = '', category = '', amount = 0 }) {
    let riskScore = 10;
    const flags = [];

    const suspiciousKeywords = ['urgent', 'wire', 'anonymous', 'bypass', 'gift', 'rolex', 'casino', 'bitcoin'];
    const lowerText = `${promptIntent} ${item} ${category}`.toLowerCase();

    for (const kw of suspiciousKeywords) {
      if (lowerText.includes(kw)) {
        riskScore += 35;
        flags.push(`Suspicious keyword pattern detected: '${kw}'`);
      }
    }

    if (amount > 150) {
      riskScore += 20;
      flags.push('High-value agent outlay detected');
    }

    return {
      riskScore: Math.min(riskScore, 100),
      riskLevel: riskScore > 60 ? 'HIGH' : riskScore > 30 ? 'MEDIUM' : 'LOW',
      flags
    };
  }

  /**
   * Deterministic Policy Evaluation
   */
  evaluate({ agentId, amount, currency = 'USD', category = 'dev_tools', item = '', promptIntent = '' }) {
    const numAmount = parseFloat(amount);
    const normCategory = (category || '').toLowerCase().trim();
    const now = Date.now();
    const reasons = [];

    // Layer 2: Semantic AI Risk Evaluation
    const aiAudit = this.auditAIRisk({ promptIntent, item, category: normCategory, amount: numAmount });

    // 1. Currency Restriction
    if (!this.policies.allowedCurrencies.includes(currency.toUpperCase())) {
      return {
        verdict: 'HARD_BLOCKED',
        code: 'ERR_UNSUPPORTED_CURRENCY',
        reasons: [`Currency ${currency} rejected by policy`],
        aiAudit
      };
    }

    // 2. Velocity Limit Check
    const oneMinAgo = now - 60000;
    const agentRecent = this.recentRequests.filter(r => r.agentId === agentId && r.timestamp > oneMinAgo);
    if (agentRecent.length >= this.policies.velocityLimitPerMinute) {
      return {
        verdict: 'HARD_BLOCKED',
        code: 'ERR_VELOCITY_BREACH',
        reasons: [`Velocity limit exceeded: max ${this.policies.velocityLimitPerMinute} requests/min`],
        aiAudit
      };
    }

    // 3. Prohibited Category Check
    if (this.policies.prohibitedCategories.includes(normCategory)) {
      return {
        verdict: 'HARD_BLOCKED',
        code: 'ERR_PROHIBITED_CATEGORY',
        reasons: [`Category '${normCategory}' is blacklisted by organizational security policy`],
        aiAudit
      };
    }

    // 4. Hard Cap Check
    if (numAmount > this.policies.hardCapMax) {
      return {
        verdict: 'HARD_BLOCKED',
        code: 'ERR_HARD_CAP_EXCEEDED',
        reasons: [`Amount $${numAmount.toFixed(2)} exceeds strict hard cap of $${this.policies.hardCapMax.toFixed(2)}`],
        aiAudit
      };
    }

    // 5. Daily Budget Ceiling
    if (this.dailySpent + numAmount > this.policies.dailyBudget) {
      return {
        verdict: 'HARD_BLOCKED',
        code: 'ERR_DAILY_BUDGET_EXHAUSTED',
        reasons: [`Would breach daily organization ceiling ($${this.policies.dailyBudget.toFixed(2)})`],
        aiAudit
      };
    }

    // 6. Category Allowlist Check -> Escalation if unknown
    if (!this.policies.allowedCategories.includes(normCategory)) {
      return {
        verdict: 'ESCALATE_HUMAN',
        code: 'WARN_UNLISTED_CATEGORY',
        reasons: [`Category '${normCategory}' is not on the pre-approved whitelist`],
        aiAudit
      };
    }

    // 7. Auto-Approve Check
    if (numAmount <= this.policies.autoApproveMax && aiAudit.riskLevel !== 'HIGH') {
      this.recentRequests.push({ agentId, amount: numAmount, timestamp: now });
      this.dailySpent += numAmount;
      return {
        verdict: 'AUTO_APPROVED',
        code: 'PASS_AUTONOMOUS_POLICY',
        reasons: [`Amount $${numAmount.toFixed(2)} is within autonomous budget ($${this.policies.autoApproveMax.toFixed(2)})`],
        aiAudit
      };
    }

    // 8. Human Escalation Path
    return {
      verdict: 'ESCALATE_HUMAN',
      code: 'REQUIRE_HUMAN_APPROVAL',
      reasons: [`Amount $${numAmount.toFixed(2)} requires supervisor confirmation before PayPal order creation`],
      aiAudit
    };
  }
}
