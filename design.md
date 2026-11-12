# Mandate — System Design & Architecture (`design.md`)

## 1. High-Level Architectural Principles

1. **Deterministic Guardrails over Probabilistic Guessing**:
   Financial security boundaries must never rely on LLMs outputting JSON reliably. The policy verification layer is pure deterministic code that executes in sub-millisecond time.
2. **PayPal Direct Integration (`v2/checkout/orders`)**:
   Mandate is not a payment custodian (no illegal escrow). Instead, Mandate acts as an **Authorization Gateway**. If approved, it instructs the official PayPal Orders API to mint an order or authorization hold.
3. **Idempotency Guarantee**:
   Network retries by AI agents can cause duplicate orders. Mandate enforces unique idempotency keys via both in-memory caches and PayPal's official `PayPal-Request-Id` HTTP header.
4. **Dual Intent Engine (`AUTHORIZE` vs `CAPTURE`)**:
   Supports standard instant checkout (`CAPTURE`) and holding funds pending physical/digital delivery verification (`AUTHORIZE`).

---

## 2. Sequence Diagrams

### 2.1 The Green Path: Autonomous Auto-Approval
```
AI Agent              Mandate Firewall              PayPal Orders v2 API
   │                          │                              │
   │  POST /api/intercept     │                              │
   │─────────────────────────>│                              │
   │                          │  Evaluate Policies:          │
   │                          │  - Amount <= $50? (PASS)     │
   │                          │  - Category Allowed? (PASS)  │
   │                          │  - Velocity OK? (PASS)       │
   │                          │                              │
   │                          │  POST /v2/checkout/orders    │
   │                          │─────────────────────────────>│
   │                          │  <201 Created (Order ID)     │
   │                          │<─────────────────────────────│
   │  200 OK (Approved URL)   │                              │
   │<─────────────────────────│                              │
```

### 2.2 The Red Path: Hard Policy Breach
```
AI Agent              Mandate Firewall              PayPal Orders v2 API
   │                          │                              │
   │  POST /api/intercept     │                              │
   │  (Amount: $450)          │                              │
   │─────────────────────────>│                              │
   │                          │  Evaluate Policies:          │
   │                          │  - Amount > $200 Cap (FAIL!) │
   │                          │  - Log Violation in Audit DB │
   │  403 Forbidden           │  (PayPal NEVER CALLED)       │
   │<─────────────────────────│                              │
```

### 2.3 The Yellow Path: Human-in-the-Loop Escalation
```
AI Agent          Mandate Firewall           Supervisor UI           PayPal API
   │                      │                        │                      │
   │ POST /api/intercept  │                        │                      │
   │ (Amount: $90)        │                        │                      │
   │─────────────────────>│                        │                      │
   │                      │ Push Escalation Alert  │                      │
   │                      │───────────────────────>│                      │
   │ 202 Paused           │                        │                      │
   │<─────────────────────│                        │                      │
   │                      │                        │                      │
   │                      │ Supervisor Review      │                      │
   │                      │ & Clicks [Approve]     │                      │
   │                      │<───────────────────────│                      │
   │                      │                                               │
   │                      │ POST /v2/checkout/orders                      │
   │                      │──────────────────────────────────────────────>│
   │                      │ <201 Created (Order ID)                       │
   │                      │<──────────────────────────────────────────────│
   │                      │ Broadcast Update                              │
   │                      │───────────────────────>│                      │
```

---

## 3. Component Architecture
- **Web Layer**: Express.js HTTP Server exposing REST API and static UI dashboard.
- **WebSocket Gateway**: `ws` for zero-latency live updates when agent requests arrive.
- **Policy Engine**: Evaluates budget thresholds, merchant allowlists, velocity ceilings, and prohibited categories.
- **PayPal Client Module**: Manages OAuth2 client-credentials tokens, idempotency headers, order creation, and capture triggers.
