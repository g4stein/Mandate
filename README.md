# Mandate v2 — Enterprise AI Spending Firewall for Agentic Commerce

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PayPal Orders v2 API](https://img.shields.io/badge/PayPal-Orders%20v2%20API-003087?logo=paypal&logoColor=white)](https://developer.paypal.com/docs/api/orders/v2/)
[![PayPal AI Hackathon](https://img.shields.io/badge/PayPal%20AI%20Hackathon-2026-brightgreen)](https://developer.paypal.com)

> **Mandate v2** is an enterprise deterministic policy firewall and trust orchestration gateway designed to sit directly between autonomous AI agents and the **PayPal Developer Platform**. It prevents LLM hallucinations, prompt injections, and infinite purchase loops by enforcing mathematical boundaries before transactions reach PayPal.

---

## 🏆 Built for PayPal AI Hackathon 2026

- **Target Category:** Grand Prize & Best Use of Agentic Commerce
- **Key PayPal APIs:** 
  - PayPal Orders v2 API (`/v2/checkout/orders`)
  - Dual Intent Mechanics (`AUTHORIZE` & `CAPTURE`)
  - Cryptographic Idempotency via `PayPal-Request-Id`
  - OAuth 2.0 Client Credentials flow

---

## 💡 The Core Innovation: Separation of Concerns

Probabilistic AI agents should decide **what** to buy, but deterministic policy engines must decide **if money moves**.

```
[ Autonomous AI Agent ] 
         │  (Expresses Intent: Product & Price)
         ▼
[ MANDATE v2 FIREWALL ] ──> Evaluates Budgets, Categories, Velocity & Idempotency
         │
   ┌─────┴──────────────────────────────────┐
   ▼                                        ▼
[ Auto-Approved / Human Approved ]     [ Hard Blocked ]
   │                                        │
   ▼                                        ▼
[ PayPal Orders v2 Sandbox ]           [ Transaction Intercepted & Logged ]
 (Funds Transacted Safely)              (Zero PayPal Charges)
```

---

## 🚀 Quick Start (60 Seconds)

### 1. Installation
```bash
git clone https://github.com/g4stein/Mandate.git
cd Mandate
npm install
```

### 2. Launch Mandate v2
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** to view the Command Center Dashboard.

---

## 🎬 3 Demo Scenarios (One-Click or CLI)

| Scenario | Input | Firewall Logic | Outcome | CLI Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **🟢 Green Path** | Agent requests **$29.00** for Cloud Hosting | Within `$50.00` auto-approve limit; whitelisted category | **Auto-Approved**: Directly creates PayPal Order with approval URL | `node simulate.js` |
| **🔴 Red Path** | Agent requests **$450.00** for Luxury Watch | Exceeds `$200.00` hard safety cap & blacklisted category | **Hard Blocked**: 403 Forbidden; PayPal API is **never** called | `node simulate.js` |
| **🟡 Yellow Path**| Agent requests **$90.00** for Domain Names | Above `$50.00` auto-limit, below `$200.00` hard cap | **Escalated**: Human supervisor reviews & approves in dashboard | `node simulate.js` |

---

## 🛡️ Key Technical Features

1. **Deterministic Rule Engine**: Multi-tier evaluation (Auto-Approve, Human Escalation, Hard Cap, Category Allow/Deny, Velocity limits).
2. **True Idempotency**: Intercepts duplicate requests using `PayPal-Request-Id` to prevent double-spending from network retries.
3. **Dual Intent Mechanics**: Supports both `CAPTURE` (immediate purchase) and `AUTHORIZE` (holding funds until human/agent receipt verification).
4. **Real-Time WebSocket Feed**: Zero-latency dashboard updates for live monitoring and supervisory approvals.
5. **Custom Agent Simulator**: Built right into the web dashboard for ad-hoc agent testing.

---

## 📜 License
MIT License. Free for open-source and commercial agentic commerce development.
