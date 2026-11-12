# Mandate v2 — System Design & Architecture (`design.md`)

## 1. High-Level Flow Architecture

```
┌─────────────────────────────────┐
│     Autonomous AI Agent         │
│  (Identifies purchase intent)   │
└────────────────┬────────────────┘
                 │
                 ▼ POST /api/mandate/intercept
┌────────────────────────────────────────────────────────┐
│             MANDATE v2 POLICY FIREWALL                 │
│                                                        │
│  ┌─────────────────────────┐ ┌──────────────────────┐  │
│  │   Deterministic Layer   │ │   AI Risk Auditor    │  │
│  │   - $50 Auto-Approve    │ │   - Semantic Scan    │  │
│  │   - $200 Hard Cap       │ │   - Prompt Anomaly   │  │
│  │   - Category Whitelist  │ │   - Risk Score (0-100│  │
│  └─────────────────────────┘ └──────────────────────┘  │
└────────────────────────┬───────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
  [GREEN PATH]     [YELLOW PATH]     [RED PATH]
  Auto-Approved    Human Escalation  Hard Blocked
        │                │                │
        │                ▼                ▼
        │         Supervisor Click   Transaction Rejection
        │          [Authorize]       (PayPal NOT called)
        │                │
        └────────────────┼────────────────┘
                         ▼
             ┌─────────────────────────┐
             │  PayPal Orders v2 API   │
             │   POST /v2/checkout     │
             │   - CAPTURE/AUTHORIZE   │
             │   - PayPal-Request-Id   │
             └─────────────────────────┘
```

## 2. Key Modules
1. **`paypal.js`**: OAuth 2.0 client credentials token management with automatic in-memory caching and order lifecycle execution (`v2/checkout/orders`).
2. **`policyEngine.js`**: Pure mathematical deterministic logic alongside semantic risk analysis for sub-millisecond evaluation.
3. **`server.js`**: Express server + WebSocket broadcast engine notifying connected supervisor dashboards.
4. **`public/index.html`**: Enterprise single-page application with real-time audio-visual feedback and custom agent simulation console.
