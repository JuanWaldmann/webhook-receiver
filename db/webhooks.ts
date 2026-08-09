import { pool } from './pool.ts';

/**
 * TODO: move to its own types file once more queries need it
 */
interface WebhookRow {
  id: number;
  event_id: string;
  status: string;
  attempts: number;
}

const INSERT_WEBHOOK_QUERY = `
  INSERT INTO webhooks (event_id, event_type, payload)
  VALUES ($1, $2, $3)
  ON CONFLICT (event_id) DO NOTHING
  RETURNING event_id
`;

const SELECT_PENDING_ROWS = `
  SELECT * FROM webhooks
  WHERE status = 'pending'
`;

const UPDATE_WEBHOOK_ATTEMPT = `
  UPDATE webhooks
  SET attempts = attempts + 1, last_attempt_at = NOW(), status = $1, result = $3
  WHERE event_id = $2
`;

/**
 * Inserts a webhook event if it hasn't been seen before.
 * Relies on the UNIQUE constraint on event_id for idempotency.
 *
 * @returns true if a new row was inserted, false if it was a duplicate
 */
export async function insertWebhookIfNew(
  deliveryId: string,
  eventType: string,
  payload: object
): Promise<boolean> {
  try {
    const result = await pool.query(INSERT_WEBHOOK_QUERY, [deliveryId, eventType, payload]);
    const wasInserted = result.rows.length === 1;

    console.log(
      wasInserted
        ? `New webhook stored: ${deliveryId}`
        : `Duplicate webhook skipped: ${deliveryId}`
    );

    return wasInserted;
  } catch (err) {
    console.error(`Failed to insert webhook ${deliveryId}`, err);
    throw err;
  }
}

/**
 * Fetches all webhook events currently awaiting processing.
 */
export async function getPendingWebhooks(): Promise<Array<WebhookRow>> {
  try {
    const result = await pool.query(SELECT_PENDING_ROWS);
    return result.rows;
  } catch (err) {
    console.error('Failed to fetch pending webhooks', err);
    throw err;
  }
}

/**
 * Records the outcome of a processing attempt for a webhook event.
 * Increments attempts and updates last_attempt_at regardless of outcome.
 *
 * @param status - new status, e.g. 'done', 'pending', or 'failed'
 * @param eventId - the webhook's event_id (not the internal numeric id)
 * @param result - optional outcome message, only meaningful on final failure
 */
export async function updateWebhookAttempt(
  status: string,
  eventId: string,
  result?: string
): Promise<void> {
  try {
    await pool.query(UPDATE_WEBHOOK_ATTEMPT, [status, eventId, result ?? null]);
  } catch (err) {
    console.error(`Failed to update webhook ${eventId}`, err);
    throw err;
  }
}