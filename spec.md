# Mandate v2 — Enterprise AI Spending Firewall (`spec.md`)

## 1. Executive Summary
**Mandate v2** is a deterministic policy firewall and trust orchestration gateway that sits directly between autonomous AI agents and the **PayPal Developer Platform (Orders v2 API)**. It prevents LLM hallucinations, rogue autonomous purchases, prompt injection attacks, and runaway payment loops by enforcing mathematical boundaries before transactions reach PayPal.

---

## 2. Core Architectural Principles: Separation of Concerns
1. **The Probabilistic AI Agent**: Handles *Intent* (identifies what item or service needs to be purchased).
2. **The Deterministic Firewall (Mandate v2)**: Handles *Governance* (validates budget limits, category whitelist/blacklists, velocity ceilings, and semantic risk scores).
3. **The PayPal Platform (Orders v2 API)**: Handles *Settlement & Escrow* (creates cryptographic orders, authorization holds, and captures).

---

## 3. The 3 Demo Flows

| Scenario | Input | Firewall Logic | Result |
| :--- | :--- | :--- | :--- |
| **🟢 Green Path** | AI Agent requests **$29.00** for Cloud Hosting | Amount <= `$50.00` auto-approve limit; whitelisted category | **Auto-Approved**: Directly creates PayPal Order with approval URL |
| **🔴 Red Path** | AI Agent requests **$450.00** for Luxury Watch | Exceeds `$200.00` hard cap; category 'luxury' blacklisted | **Hard Blocked**: 403 Forbidden; PayPal API is **never** called |
| **🟡 Yellow Path** | AI Agent requests **$90.00** for Domain Names | Above `$50.00` auto-limit, below `$200.00` hard cap | **Human Escalation**: Pauses transaction; human approves in Command Center |

---

## 4. REST API Endpoints

### 4.1 `POST /api/mandate/intercept`
Autonomous AI agent purchase request gateway.

#### Request Body
```json
{
  "agentId": "devops-agent-01",
  "agentName": "DevOps Autonomous Provisioner",
  "item": "Compute Node & Cloud Hosting",
  "category": "cloud_hosting",
  "amount": 29.00,
  "currency": "USD",
  "merchant": "Cloud Provider Inc",
  "intent": "CAPTURE",
  "idempotencyKey": "req_unique_173143000"
}
```

### 4.2 `POST /api/transactions/:id/decision`
Supervisor Human-in-the-loop decision endpoint (`APPROVE` or `REJECT`).
