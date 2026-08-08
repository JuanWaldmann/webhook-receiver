import { pool } from './pool.ts'


export async function insertWebhookIfNew(deliveryId: string, eventType: string, payload: object): Promise<boolean> {
    const result = await pool.query('INSERT INTO webhooks (event_id, event_type, payload) VALUES($1, $2, $3) ON CONFLICT (event_id) DO NOTHING RETURNING event_id',
        [deliveryId, eventType, payload])     
    if(result.rows.length === 1){
        console.log('New webhook entry has been added to the db')
        return true
    }else{
        console.log('Duplicate UUID, Insert Skipped')
        return false
    }
    
}



