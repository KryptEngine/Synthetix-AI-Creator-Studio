# Synthetix AI Creator Studio — Complete Source Code

A multi-platform AI video creator studio and SaaS suite: a multi-track timeline editor with live canvas preview, server-side AI script generation across 26 free-tier LLM providers, a super-admin telemetry dashboard with encrypted API-key management, a content calendar, a double-entry creator wallet with Razorpay checkout and payouts, and a mobile PWA companion.

Every piece of business data lives on the server. The browser never holds an API key, and every screen hydrates from a single authenticated call.

---

## 🚀 Key Features

**1. Desktop Pro Video Studio**
- Multi-track timeline (Video Track 1, Video Track 2 Overlays, Audio Narration & Ambient, Kinetic Subtitles).
- Live canvas preview with playhead scrub, scene trimming, and aspect ratio switching (`16:9` Widescreen vs `9:16` Shorts).
- Social scheduling drawer with connected YouTube and Facebook accounts.
- Browser-side video export via `MediaRecorder` (WebM) — no server-side FFmpeg required.

**2. Super Admin Telemetry (`PLATFORM_CORE`)**
- Metrics computed from live state: active leases, quota burn per provider, project count, aggregate API spend.
- Dynamic API Key Manager with atomic capacity leases and rate-limit cooldowns.
- AES-256-GCM encrypted key registration modal.
- Live connectivity sweep (`POST /api/keys/pulse`) that calls every provider holding a credential and records latency and outcome.

**3. Mobile PWA Companion**
- Responsive smartphone shell with notch and bottom navigation.
- Mobile Home with "+ Create New Video" action, calendar strip, and recent projects.
- Review & Publish drawer with editable titles and AI-suggested thumbnails.
- Biometric App Protection: Face ID and Touch ID device locks on Wallet & Earnings with a 6-digit passcode fallback.

**4. Monetization & Creator Wallet**
- Double-entry accounting ledger with an audit trail.
- Shorts Marketplace with commercial licence key generation (`LIC-...`), sold through real Razorpay checkout.
- Creator withdrawals through RazorpayX payouts, with the amount held in escrow until settlement.
- Cloaked affiliate link generator with FTC/ASC disclosure copy.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Motion, Recharts, Lucide Icons, Canvas-Confetti.
- **Backend API**: Node.js, Express 4, TypeScript, tsx.
- **Storage**: Encrypted JSON state on disk under `.data/` (no external database required).
- **AI Integrations**: Any OpenAI-compatible chat API plus Google Gemini, with a deterministic offline fallback.

---

## 📦 Local Installation & Setup

### 1. Prerequisites
- Node.js >= 20.x

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Then edit `.env`:

| Variable | Required | Purpose |
|---|---|---|
| `ENCRYPTION_MASTER_KEY` | yes | 64 hex chars. Encrypts provider API keys at rest. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | yes | Seeds the super admin on first boot. `ADMIN_PASSWORD` stays authoritative until you change it inside the app |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | for payments | Marketplace checkout. Without them the app runs fine and reports "payments not configured" |
| `RAZORPAY_WEBHOOK_SECRET` | for payments | Verifies incoming `payment.captured` webhooks |
| `RAZORPAY_PAYOUT_ACCOUNT_ID` | for payouts | RazorpayX account for creator withdrawals |
| `CORS_ORIGINS` | if split hosts | Comma-separated allowed browser origins |
| `HTTPS` / `COOKIE_SECURE` | in production | Set to `on` so session cookies get the `Secure` flag and HSTS is enabled |
| `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, … | optional | Provider credentials — see the provider table below |

### 4. Running in Development
Two processes run in parallel — the Vite client and the Express API:

```bash
npm run server   # Express API on :3001 (tsx watch)
npm run dev      # Vite client on :3000, proxies /api and /assets to :3001
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`.

### 5. Production
```bash
npm run build    # bundles the client into dist/
npm start        # NODE_ENV=production tsx server.ts — serves dist/ + /api on :3001
```

### 6. Docker
```bash
docker-compose up --build
```
The container serves the app on `:3001` and persists `.data/` in the `studiodata` volume. Set `ENCRYPTION_MASTER_KEY` and `ADMIN_PASSWORD` in your shell or `.env` first — Compose refuses to start without them.

---

## 🚀 Deployment (Render / Railway)

Both render and Railway use the project's own `npm ci` + `npm run build` + `npm start`, so no Docker is needed locally — and `npm ci` works on both platforms because the lockfile is in sync. `tsx` is a production dependency so it survives `--omit=dev`.

### Option A — Render (Blueprint)

```yaml
# render.yaml
services:
  - type: web
    name: synthetix-ai-creator-studio
    runtime: node
    buildCommand: npm ci --include=dev && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    disk:
      name: studiodata
      mountPath: /opt/render/project/src/.data
      sizeGB: 1
```

Apply via the Dashboard `New → Blueprint → select repo`. After deployment, add these env vars in the **Env tab** (`sync: false`):

| Key | Value |
|---|---|
| `ENCRYPTION_MASTER_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAIL` | your email |
| `ADMIN_PASSWORD` | a strong password |
| `APP_URL` | `https://<service>.onrender.com` |
| `HTTPS` / `COOKIE_SECURE` | `on` |
| `CORS_ORIGINS` | `https://<service>.onrender.com` |

Provider keys are added from inside the Admin dashboard (encrypted at rest).

### Option B — Railway

Apply via the Dashboard or CLI:
```bash
railway up --platform node        # or: railway create
railway add --volume studiodata:/app/.data   # one-time; created automatically on first deploy
```

Then set env vars (`sync: false`) in the Railway **Variables tab**: `ENCRYPTION_MASTER_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `APP_URL=https://<your-railway.app>`, `HTTPS=on`, `CORS_ORIGINS=https://<your-railway.app>`, plus your payment keys if wiring payments.

## 🔐 Authentication & Roles

Every business route requires a session; only `/api/health` and the signed Razorpay webhook are public.

- Sessions are HttpOnly, `SameSite=Strict` cookies holding a random 32-byte token, valid for 7 days.
- Passwords are hashed with `scrypt` and a per-user salt, compared in constant time.
- Roles: `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `USER`. Admin-only areas (key registry, metrics, payouts, source download) are gated server-side by `requireRole`.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Create a creator account |
| `POST` | `/api/auth/login` | Sign in and receive the session cookie |
| `POST` | `/api/auth/logout` | Destroy the session |
| `GET` | `/api/auth/session` | Resolve the current user, if any |
| `POST` | `/api/auth/change-password` | Rotate your own password |
| `GET` | `/api/users` | Directory of accounts (super admin) |
| `PATCH` | `/api/users/:id/role` | Change a role (super admin) |

---

## 🤖 Free LLM Provider Gateway

All AI generation runs **server-side**, so provider credentials never reach the browser. The gateway keeps a registry of free-tier providers (source: the [awesome-freellm-apis](https://github.com/open-free-llm-api/awesome-freellm-apis) list) and walks it in priority order until one returns a usable answer.

| Provider | Free tier | Env var |
|---|---|---|
| Google Gemini | permanent | `GEMINI_API_KEY` |
| Groq | permanent | `GROQ_API_KEY` |
| Cerebras | permanent | `CEREBRAS_API_KEY` |
| NVIDIA NIM | permanent | `NVIDIA_API_KEY` |
| OpenRouter | renewable credits | `OPENROUTER_API_KEY` |
| Hugging Face | permanent | `HF_TOKEN` |
| Mistral AI | permanent | `MISTRAL_API_KEY` |
| LLM7.io | permanent | `LLM7_API_KEY` |
| SiliconFlow, SambaNova, DeepSeek, xAI, AI21, Chutes, Nebius, Nscale, Glhf | permanent | see `server/providers.ts` |
| ModelScope, OpenCode Zen, Kilo Code, OVHcloud, Zhipu, Aion Labs, Alibaba, Agnes AI | permanent | see `server/providers.ts` |
| Ollama (local) | unlimited, private | `OLLAMA_BASE_URL` |

**Adding a key** — either export the env var (see `.env.example`) or paste it into
**Admin → Free LLM Provider Registry → + NEW API KEY**. Runtime-registered secrets are
encrypted with AES-256-GCM before they touch disk (`.data/provider-keys.enc.json`).

**Fallback behaviour** — every provider attempt is logged with its latency and error.
If no provider can serve a request, the deterministic offline engine returns a usable
script instead of an empty screen, and the response is flagged `degraded: true`.

---

## 💳 Payments (Razorpay)

Marketplace checkout and creator payouts run against the live Razorpay API.

- **Checkout** — `POST /api/payments/orders` creates a Razorpay order; the browser opens the Razorpay overlay; `POST /api/payments/verify` checks the HMAC-SHA256 signature over `order_id|payment_id` before any licence is issued or any money is credited. The platform fee is 20%, and the creator receives 80%.
- **Webhook** — `POST /api/webhooks/razorpay` verifies the signature over the exact raw request body before trusting a `payment.captured` event. Fulfillment is idempotent, so a replayed webhook never double-credits a wallet.
- **Payouts** — `POST /api/payouts` holds the amount in escrow, then creates a RazorpayX payout. A failed payout returns the money to the wallet automatically. With no `RAZORPAY_PAYOUT_ACCOUNT_ID` set, withdrawals are queued for manual settlement instead.

Leave the Razorpay variables blank to run the app without payments.

---

## 🗄 Core API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness probe (public) |
| `GET` | `/api/bootstrap` | Projects, keys, ledger, marketplace, schedule, wallet, providers |
| `GET`/`PUT` | `/api/user` | Creator profile |
| `GET` | `/api/metrics` | Admin telemetry (admin only) |
| `GET` | `/api/ai/providers` | Provider registry with configuration state |
| `POST` | `/api/ai/providers/:id/test` | Live connectivity check |
| `POST` | `/api/ai/generate/script` | Structured script breakdown (JSON contract) |
| `POST` | `/api/ai/generate/narration` | Free-form voiceover script |
| `POST` | `/api/ai/images/generate` | Scene imagery (falls back to bundled assets) |
| `GET`/`POST`/`PUT` | `/api/projects`, `/api/projects/:id` | Project persistence |
| `GET`/`POST`/`DELETE` | `/api/keys`, `/api/keys/:id` | Encrypted key registry (admin only) |
| `POST` | `/api/keys/lease`, `/api/keys/release` | Atomic capacity leases (circuit breaker) |
| `POST` | `/api/keys/pulse` | Live connectivity sweep across configured providers |
| `POST` | `/api/seed/reset` | Restore the seeded dataset (super admin) |
| `GET`/`POST` | `/api/ledger`, `/api/schedule`, `/api/marketplace` | Money + scheduling data |
| `GET`/`POST` | `/api/payments/config`, `/api/payments/orders` | Razorpay checkout |
| `POST` | `/api/payments/verify` | Verify payment signature and issue the licence |
| `POST` | `/api/webhooks/razorpay` | Signed payment webhook (public) |
| `GET`/`POST` | `/api/payouts` | Creator withdrawals |
| `GET` | `/api/source-zip` | Download the complete source archive (admin only) |

---

## 🔒 Security Architecture

- **AES-256-GCM at rest** — provider API keys are encrypted with a 64-hex master key before they touch disk.
- **Session hardening** — HttpOnly, `SameSite=Strict` cookies; `Secure` and HSTS are enabled when `HTTPS=on`.
- **Security headers** — `nosniff`, `DENY` framing, strict referrer policy, COOP/CORP, and a restrictive permissions policy.
- **CORS allowlist** — only configured origins may call the API, and credentialed cross-origin requests are rejected.
- **Rate limiting** — a fixed-window per-IP limiter on every `/api` route (120/min), tightened to 8/min on sign-in.
- **Circuit breaker** — failing or rate-limited keys are paused automatically and released back into the pool on recovery.
- **Payment integrity** — HMAC signature verification on both checkout and webhooks, with idempotent fulfillment and escrowed payouts.
- **Least privilege** — key registry, metrics, payouts and the source download are gated by `requireRole` on the server, not just hidden in the UI.
- **Biometric Protection**: Simulated device authentication (Face ID / Touch ID) gates access to the Creator Wallet, financial metrics, and payout authorizations.

---

## 🧪 Testing

```bash
npm run server    # in one terminal
npm run test:e2e # in another
```

The harness boots the real React app inside jsdom, signs in, and clicks every button on every screen, reporting any control that produces no visible reaction or throws at runtime. It resets the dataset before and after the run and exits non-zero on failure.

---

## 📄 License
Apache-2.0
