import { getPendingWebhooks, updateWebhookAttempt } from "../db/webhooks.ts";


const maxAttemps = 5

setInterval(async function processPendingWebhooks(){
    const rows = await getPendingWebhooks()
    
    for (const row of rows){
        const response = await fetch("https://httpbin.org/status/200,500");
        console.log(`Webhook ID response: ${response.status} for Webhook ID ${row.event_id}`)

        if (response.ok){
            await updateWebhookAttempt('done', row.event_id)
        }else if(row.attempts >= maxAttemps - 1){
            await updateWebhookAttempt('failed', row.event_id, 'unresolved')
        }else{
            await updateWebhookAttempt('pending', row.event_id)
            }
        
    }


}, 10000)

