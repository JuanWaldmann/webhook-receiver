import '../loadEnv.ts';
import { getPendingWebhooks, updateWebhookAttempt } from "../db/webhooks.ts";
import { registerShutdown } from '../utils/shutdown.ts';
import { closePool } from '../db/pool.ts';

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 10_000;
const CHECK_URL = "https://httpbin.org/status/200,500"; // TODO: replace with real target service

/**
 * Polls for pending webhook events and attempts to process each one.
 * Success marks the row done; failure either retries (if attempts remain)
 * or marks the row failed once MAX_ATTEMPTS is reached.
 */
async function processPendingWebhooks() {
    const rows = await getPendingWebhooks();

    for (const row of rows) {
        const response = await fetch(CHECK_URL);
        console.log(`Response ${response.status} for webhook ${row.event_id}`);

        if (response.ok) {
            await updateWebhookAttempt('done', row.event_id, 'resolved');
        } else if (row.attempts >= MAX_ATTEMPTS - 1) {
            await updateWebhookAttempt('failed', row.event_id, 'unresolved');
        } else {
            await updateWebhookAttempt('pending', row.event_id);
        }
    }
}

const pollInterval = setInterval(
  processPendingWebhooks,
  POLL_INTERVAL_MS
);

registerShutdown(async () => {
  clearInterval(pollInterval);
  await closePool();
});