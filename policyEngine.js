/**
 * Mandate Deterministic Policy Engine
 * Evaluates Agent purchase requests against budget, velocity, merchant allowlists, and risk rules
 */

export const DEFAULT_POLICIES = {
  global: {
    autoApproveMax: 50.00,       // <= $50 auto-approved (Green)
    hardCapMax: 200.00,          // > $200 hard blocked (Red)
    dailyBudget: 500.00,         // Daily max budget
    requireHumanBetween: [50.01, 200.00], // Yellow escalation zone
    allowedCurrencies: ['USD', 'EUR', 'GBP'],
    prohibitedCategories: ['luxury', 'gambling', 'crypto', 'gift_cards', 'weapons'],
    allowedCategories: ['cloud_hosting', 'saas', 'domain', 'api_credits', 'infrastructure', 'dev_tools'],
    velocityLimitPerMinute: 5
  },
  agents: {
    'devops-agent-01': {
      name: 'DevOps Cloud Provisioner',
      allowedCategories: ['cloud_hosting', 'domain', 'infrastructure', 'dev_tools'],
      autoApproveMax: 75.00,
      hardCapMax: 250.00
    },
    'research-agent-02': {
      name: 'Market Intelligence Bot',
      allowedCategories: ['saas', 'api_credits'],
      autoApproveMax: 30.00,
      hardCapMax: 100.00
    }
  }
};

export class PolicyEngine {
  constructor(initialPolicies = DEFAULT_POLICIES) {
    this.policies = JSON.parse(JSON.stringify(initialPolicies));
    this.recentTransactions = []; // for velocity limit tracking
    this.dailySpent = 0;
  }

  getPolicyConfig() {
    return this.policies;
  }

  updateGlobalPolicy(updates) {
    this.policies.global = { ...this.policies.global, ...updates };
    return this.policies.global;
  }

  /**
   * Evaluate a transaction request
   * Returns: { verdict: 'AUTO_APPROVED' | 'ESCALATE_HUMAN' | 'HARD_BLOCKED', reasons: string[], ruleHit: string }
   */
  evaluate({ agentId, amount, currency = 'USD', category, merchant, idempotencyKey }) {
    const numericAmount = parseFloat(amount);
    const reasons = [];
    const now = Date.now();

    // 1. Currency Check
    if (!this.policies.global.allowedCurrencies.includes(currency.toUpperCase())) {
      return {
        verdict: 'HARD_BLOCKED',
        code: 'ERR_UNSUPPORTED_CURRENCY',
        reasons: [`Currency ${currency} is not permitted by global policy`]
      };
    }

    // 2. Velocity Limit Check (rate limit per minute)
    const oneMinuteAgo = now - 60000;
    const recentAgentRequests = this.recentTransactions.filter(
      t => t.agentId === agentId && t.timestamp > oneMinuteAgo
    );
    if (recentAgentRequests.length >= this.policies.global.velocityLimitPerMinute) {
      return {
        verdict: 'HARD_BLOCKED',
        code: 'ERR_VELOCITY_LIMIT_EXCEEDED',
        reasons: [`Velocity limit exceeded: max ${this.policies.global.velocityLimitPerMinute} requests per minute`]
      };
    }

    // 3. Prohibited Category Check
    const normalizedCategory = (category || 'unknown').toLowerCase().trim();
    if (this.policies.global.prohibitedCategories.includes(normalizedCategory)) {
      return {
        verdict: 'HARD_BLOCKED',
        code: 'ERR_PROHIBITED_CATEGORY',
        reasons: [`Category '${normalizedCategory}' is strictly blacklisted by security policy`]
      };
    }

    // Determine agent-specific or fallback global thresholds
    const agentPolicy = this.policies.agents[agentId] || {};
    const autoApproveLimit = agentPolicy.autoApproveMax ?? this.policies.global.autoApproveMax;
    const hardCapLimit = agentPolicy.hardCapMax ?? this.policies.global.hardCapMax;

    // 4. Hard Cap Check (> Hard Cap => Red Path)
    if (numericAmount > hardCapLimit) {
      return {
        verdict: 'HARD_BLOCKED',
        code: 'ERR_HARD_CAP_EXCEEDED',
        reasons: [`Requested amount $${numericAmount.toFixed(2)} exceeds hard cap of $${hardCapLimit.toFixed(2)}`]
      };
    }

    // 5. Daily Budget Check
    if (this.dailySpent + numericAmount > this.policies.global.dailyBudget) {
      return {
        verdict: 'HARD_BLOCKED',
        code: 'ERR_DAILY_BUDGET_EXCEEDED',
        reasons: [`Transaction would breach remaining daily budget limit of $${(this.policies.global.dailyBudget - this.dailySpent).toFixed(2)}`]
      };
    }

    // 6. Category Allowlist Check
    const allowedCategories = agentPolicy.allowedCategories ?? this.policies.global.allowedCategories;
    if (!allowedCategories.includes(normalizedCategory)) {
      return {
        verdict: 'ESCALATE_HUMAN',
        code: 'WARN_UNLISTED_CATEGORY',
        reasons: [`Category '${normalizedCategory}' is not on the pre-approved whitelist; requires human review`]
      };
    }

    // 7. Auto-Approve Check (<= Auto Limit => Green Path)
    if (numericAmount <= autoApproveLimit) {
      // Record transaction
      this.recentTransactions.push({ agentId, amount: numericAmount, timestamp: now });
      this.dailySpent += numericAmount;
      return {
        verdict: 'AUTO_APPROVED',
        code: 'PASS_WITHIN_LIMITS',
        reasons: [`Amount $${numericAmount.toFixed(2)} is within autonomous budget ($${autoApproveLimit.toFixed(2)})`]
      };
    }

    // 8. Escalation Zone (Yellow Path)
    return {
      verdict: 'ESCALATE_HUMAN',
      code: 'REQUIRE_HUMAN_CONFIRMATION',
      reasons: [`Amount $${numericAmount.toFixed(2)} exceeds autonomous threshold ($${autoApproveLimit.toFixed(2)}) but within safety cap ($${hardCapLimit.toFixed(2)})`]
    };
  }
}
