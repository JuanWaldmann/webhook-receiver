# Webhook Receiver

A production-style webhook receiver built with Express, TypeScript, and PostgreSQL —
demonstrating signature verification, idempotent event storage, and asynchronous
retry processing.

Built as a hands-on learning project to understand how SaaS platforms reliably
receive, authenticate, and process third-party webhook events (GitHub, Stripe, etc.)
at a systems level — not just wiring up an API call, but handling the failure modes
that come with distributed, asynchronous delivery.

## What it does

1. **Receives** GitHub-style webhook events over HTTP
2. **Verifies** each request is authentic using HMAC-SHA256 signature verification
3. **Stores** events idempotently — duplicate deliveries are detected and skipped,
   not reprocessed
4. **Acknowledges** the sender immediately (sub-second), deferring any real work to
   a background process
5. **Processes** pending events asynchronously via a polling worker, which retries
   failures and gives up gracefully after a configurable number of attempts

## Architecture

```
GitHub  ──POST──▶  Express Receiver
                        │
                        ├─ 1. Verify HMAC-SHA256 signature (reject if invalid)
                        ├─ 2. Check event_id for duplicates
                        ├─ 3. Insert row (status: pending)
                        └─ 4. Respond 200 OK  ◀── sender stops retrying here
                        
                   (receiver's job ends — no blocking work happens above)

                        ┌─────────────────────────┐
                        │   PostgreSQL (Neon)     │
                        │   webhooks table        │
                        └─────────────────────────┘
                                    ▲
                                    │  polls every 10s
                                    ▼
                   Background Worker (setInterval)
                        ├─ Fetch rows where status = 'pending'
                        ├─ Attempt the action (external API call)
                        ├─ Success  → status: done
                        ├─ Failure, retries remain → stays pending
                        └─ Failure, max attempts reached → status: failed
```

The core design principle: **the receiver and the worker are fully decoupled.**
The receiver's only job is to authenticate, deduplicate, and durably persist an
event as fast as possible. It has no knowledge of whether the underlying action
ever succeeds. All of that responsibility — retries, backoff, giving up — lives
entirely in the worker, on its own schedule, invisible to the original sender.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js + TypeScript | Type safety across the whole request/data flow |
| Web framework | Express | Minimal, explicit control over middleware and request handling |
| Database | PostgreSQL (via [Neon](https://neon.tech)) | Relational integrity (`UNIQUE`, `CHECK` constraints) enforced at the DB layer, not just in app code |
| DB client | `pg` (node-postgres) | Raw parameterized SQL — chosen deliberately over an ORM to build a real understanding of query construction, connection pooling, and SQL injection prevention |

## Key design decisions

**HMAC-SHA256 signature verification, not IP allowlisting or API keys.**
Every request's authenticity is verified by recomputing the HMAC of the raw
request body using a shared secret, then comparing it to the sender's signature
using a timing-safe comparison (`crypto.timingSafeEqual`) to prevent timing
attacks. Requires capturing the *raw* request bytes before Express's JSON
body-parser transforms them, since the signature is computed over the exact
bytes transmitted.

**Idempotency via a database-level `UNIQUE` constraint, not application logic.**
Each event's delivery ID is enforced as unique at the schema level. Inserts use
`INSERT ... ON CONFLICT (event_id) DO NOTHING`, which safely handles concurrent
duplicate deliveries without a race condition between a `SELECT` check and a
subsequent `INSERT`.

**Acknowledge first, process later.**
The HTTP response to the sender only depends on: signature valid → row durably
written → 200. No external API calls or business logic ever happen before the
ack. This keeps the receiver fast and reduces the chance of the sender's own
retry logic firing unnecessarily.

**Polling worker over event-driven triggers.**
A `setInterval`-based worker checks for pending work on a fixed schedule. This
was a deliberate choice over more complex alternatives (Postgres `LISTEN`/`NOTIFY`,
message queues) — simple, predictable, and sufficient at this scale, with a clear
upgrade path if throughput ever demanded it.

**Retry logic with a bounded attempt count.**
Failed actions are retried on subsequent polling cycles, tracked via an `attempts`
column, up to a configurable maximum — after which the event is marked `failed`
and left for manual/alerted follow-up rather than retried forever.

## Database schema

```sql
CREATE TABLE webhooks (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id        UUID UNIQUE,
    event_type      TEXT,
    payload         JSONB,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'done', 'failed')),
    attempts        INT NOT NULL DEFAULT 0,
    received_at     TIMESTAMP DEFAULT NOW(),
    last_attempt_at TIMESTAMP,
    result          TEXT
);
```

## Running it locally

**Requirements:** Node 22+, a PostgreSQL database (e.g. a free [Neon](https://neon.tech) instance)

```bash
git clone https://github.com/juanwaldmann/webhook-receiver.git
cd webhook-receiver
npm install
```

Create a `.env` file in the project root:
```
DATABASE_URL=your_postgres_connection_string
GITHUB_WEBHOOK_SECRET=any_string_you_choose
```

Run the SQL in [Database schema](#database-schema) against your database to create the table.

In two separate terminals:
```bash
# Terminal 1 — the receiver
node index.ts

# Terminal 2 — the background worker
node worker/processWebhooks.ts
```

Send a test webhook with a valid HMAC-SHA256 signature to `POST /webhooks/incoming`.

## What I'd add next

- **Exponential backoff** — retries currently happen on a fixed interval; scaling
  the delay by attempt count (using the existing `last_attempt_at` column) would
  better reflect real-world retry strategy
- **Graceful shutdown handling** for the worker and connection pool
- **Structured logging** (e.g. via `pino`) in place of `console.log`, feeding into
  a dashboard (Grafana) for observability

## What I learned building this

This project was built without AI-generated code — every function was written,
debugged, and understood line by line, with AI used strictly as a
Socratic reviewer and documentation pointer rather than a code generator. The
hardest parts were the ones that mattered most: understanding *why* raw request
bytes matter for HMAC verification, why parameterized queries prevent SQL
injection, and why acknowledging a webhook before processing it is a deliberate
architectural choice — not just implementation details, but the reasoning a
Solutions Engineer needs to explain, debug, and defend in production.