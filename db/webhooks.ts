import { pool } from './pool.ts'


const INSERT_WEBHOOK_QUERY = `
    INSERT INTO webhooks (event_id, event_type, payload)
    VALUES ($1, $2, $3)
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
`;

/**Inserts a webhook event if it hasn't been seen before.
 * Relies on the UNIQUE constraint on event_id for idempotency.
 * 
 * returns true if a new row was inserted, false if it was a duplicate
 */

export async function insertWebhookIfNew(
    deliveryId: string,
    eventType: string,
    payload: object
): Promise<boolean>{
    try{
        const result = await pool.query(INSERT_WEBHOOK_QUERY, [deliveryId, eventType, payload]);
        const wasInserted = result.rows.length === 1;

        console.log(
            wasInserted
            ? `New webhook stored: ${deliveryId}`
            : `Duplicate webhook skipped: ${deliveryId}`
        );

        return wasInserted
    } catch(err) {
        console.error(`Failed to insert webhook ${deliveryId}`, err);
        throw err;
    }
}

