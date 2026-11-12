# Mandate — Functional Specification (`spec.md`)

## 1. Overview
**Mandate** is a deterministic policy firewall and trust orchestration gateway designed to sit directly between autonomous AI agents and the **PayPal Orders v2 API**. It prevents unintended, malicious, or hallucinatory agent transactions through cryptographic idempotency keys, budget rules, velocity limits, and human-in-the-loop escalation workflows.

---

## 2. Problem Statement
Autonomous AI agents are being granted web-browsing, reasoning, and tool-calling execution rights to procure services, book infrastructure, purchase licenses, and conduct commerce. 

However, LLM reasoning is inherently probabilistic:
- **Hallucination risk**: An agent can misinterpret pricing tiers (e.g., ordering $5,000 enterprise clusters instead of $50 test instances).
- **Prompt Injection & Hijacking**: Malicious input can trick an agent into buying prohibited assets (e.g., crypto, luxury goods).
- **Execution loops**: Buggy agent loops can spam checkout endpoints, exhausting company bank balances in minutes.

Mandate solves this by establishing **Separation of Concerns**:
- **The AI Agent** manages *intent* (finding the right product/service).
- **Mandate** deterministically controls *execution and funds* (enforcing real-world financial policies before calling PayPal).

---

## 3. System Architecture & Flow

```
┌─────────────────┐       POST /api/mandate/intercept       ┌────────────────────────┐
│ Autonomous Agent│ ──────────────────────────────────────> │  Mandate Firewall      │
└─────────────────┘                                         │  Deterministic Engine  │
                                                            └───────────┬────────────┘
                                                                        │
                                      ┌─────────────────────────────────┼────────────────────────────────┐
                                      ▼                                 ▼                                ▼
                          [Green Path: <= $50]               [Yellow Path: $50-$200]             [Red Path: > $200]
                             Auto-Approve                       Human Escalation                    Hard Block
                                      │                                 │                                │
                                      ▼                                 ▼                                ▼
                        ┌───────────────────────────┐      ┌───────────────────────────┐   ┌───────────────────────────┐
                        │ Calls PayPal Orders v2    │      │ Pauses transaction;       │   │ Rejects immediately (403);│
                        │ Intent: CAPTURE/AUTHORIZE │      │ Alerts Human Supervisor   │   │ PayPal API is NEVER called│
                        └───────────────────────────┘      └────────────┬──────────────┘   └───────────────────────────┘
                                                                        │ (Human Approves)
                                                                        ▼
                                                           ┌───────────────────────────┐
                                                           │ Calls PayPal Orders v2    │
                                                           └───────────────────────────┘
```

---

## 4. API Specification

### Endpoint: `POST /api/mandate/intercept`
Intercepts an autonomous purchase request.

#### Request Schema:
```json
{
  "agentId": "devops-agent-01",
  "agentName": "DevOps Autonomous Provisioner",
  "item": "Compute Node & Cloud Hosting (vCPU 4x)",
  "category": "cloud_hosting",
  "amount": 29.00,
  "currency": "USD",
  "merchant": "CloudScale Infrastructure Inc",
  "intent": "CAPTURE",
  "idempotencyKey": "req_1731429000_abc123"
}
```

#### Response Schemas:

**Scenario 1: Auto-Approved (`HTTP 200`)**
```json
{
  "authorized": true,
  "verdict": "AUTO_APPROVED",
  "transactionId": "TX-1731429012-302",
  "paypalOrder": {
    "id": "MANDATE-PP-87B6A9F",
    "status": "CREATED",
    "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=MANDATE-PP-87B6A9F"
  },
  "reasons": [
    "Amount $29.00 is within autonomous budget ($50.00)"
  ]
}
```

**Scenario 2: Hard Blocked (`HTTP 403`)**
```json
{
  "authorized": false,
  "verdict": "HARD_BLOCKED",
  "code": "ERR_HARD_CAP_EXCEEDED",
  "transactionId": "TX-1731429050-411",
  "reasons": [
    "Requested amount $450.00 exceeds hard cap of $200.00"
  ]
}
```

**Scenario 3: Human Escalation Required (`HTTP 202`)**
```json
{
  "authorized": false,
  "verdict": "ESCALATE_HUMAN",
  "code": "REQUIRE_HUMAN_CONFIRMATION",
  "transactionId": "TX-1731429080-519",
  "message": "Transaction paused. Awaiting human administrator approval in Mandate Command Center",
  "reasons": [
    "Amount $90.00 exceeds autonomous threshold ($50.00) but within safety cap ($200.00)"
  ]
}
```
