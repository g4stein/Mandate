# Mandate — AI Spending Firewall for Agentic Commerce

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PayPal Orders v2](https://img.shields.io/badge/PayPal-Orders%20v2%20API-003087?logo=paypal&logoColor=white)](https://developer.paypal.com/docs/api/orders/v2/)
[![Hackathon](https://img.shields.io/badge/PayPal%20AI%20Hackathon-2026-brightgreen)](https://developer.paypal.com)

> **Mandate** is a deterministic policy firewall and trust orchestration gateway that sits directly between autonomous AI agents and the PayPal Developer Platform. It prevents LLM hallucinations, prompt injections, and run-away loops from draining funds, enabling safe **Agentic Commerce**.

---

## 🏆 Built for PayPal AI Hackathon 2026

- **Target Category:** Grand Prize & Best Use of Agentic Commerce
- **Key PayPal APIs:** PayPal Orders API `v2/checkout/orders` with `AUTHORIZE` and `CAPTURE` intents, `PayPal-Request-Id` Idempotency header, OAuth 2.0 Client Credentials flow.

---

## 💡 The Core Innovation: Separation of Concerns

Probabilistic AI agents should decide **what** to buy, but deterministic policy engines must decide **if money moves**.

```
[ Autonomous AI Agent ] 
         │  (Expresses Intent: Product & Price)
         ▼
[ MANDATE AI FIREWALL ] ──> Evaluates Budgets, Categories, Velocity & Idempotency
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

## 🚀 Quick Start (Run in 60 Seconds)

### 1. Prerequisites
- Node.js v18+ 
- (Optional) PayPal Developer Sandbox account (`PAYPAL_CLIENT_ID` & `PAYPAL_CLIENT_SECRET`)

### 2. Installation
```bash
git clone https://github.com/your-username/mandate-firewall.git
cd mandate-firewall
npm install
```

### 3. Configure Credentials (Optional for local demo)
Copy the example environment file:
```bash
cp .env.example .env
```
*(Note: If no real credentials are provided, Mandate automatically runs in mock sandbox mode so the entire demo flow works out of the box!)*

### 4. Start the Mandate Server & Dashboard
```bash
npm start
```
Open your browser at **[http://localhost:3000](http://localhost:3000)** to view the Command Center dashboard.

---

## 🎬 3 Demo Scenarios (One-Click or CLI)

You can trigger the 3 demo scenarios either by clicking the buttons at the top of the UI dashboard or running the CLI commands:

| Scenario | Input | Firewall Logic | Outcome | CLI Command |
| :--- | :--- | :--- | :--- | :--- |
| **🟢 Green Path** | AI Agent requests **$29.00** for Cloud Hosting | Within `$50.00` auto-approve limit; whitelisted category | **Auto-Approved**: Directly creates PayPal Order with approval URL | `npm run simulate:green` |
| **🔴 Red Path** | AI Agent requests **$450.00** for Luxury Watch | Exceeds `$200.00` hard safety cap & prohibited category | **Hard Blocked**: 403 Forbidden; PayPal API is **never** called | `npm run simulate:red` |
| **🟡 Yellow Path**| AI Agent requests **$90.00** for Domain Names | Above `$50.00` auto-limit, below `$200.00` hard cap | **Escalated**: Human supervisor reviews & approves in dashboard | `npm run simulate:yellow` |

---

## 🛡️ Key Technical Features

1. **Deterministic Rule Engine**: Multi-tier evaluation (Auto-Approve, Human Escalation, Hard Cap, Category Allow/Deny, Velocity limits).
2. **True Idempotency**: Intercepts duplicate requests using `PayPal-Request-Id` to prevent double-spending from network retries.
3. **Dual Intent Mechanics**: Supports both `CAPTURE` (immediate purchase) and `AUTHORIZE` (holding funds until human/agent receipt verification).
4. **Real-Time WebSocket Feed**: Zero-latency dashboard updates for live monitoring and supervisory approvals.

---

## 📜 License
MIT License. Free for open-source and commercial agentic commerce development.
