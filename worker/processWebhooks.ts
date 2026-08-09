import { getPendingWebhooks } from "../db/webhooks.ts";


setInterval(async function processPendingWebhooks(){
    const rows = await getPendingWebhooks()
    
    for (const row of rows){
        const response = await fetch("https://httpbin.org/status/200,500");
        console.log(`Webhook ID response: ${response.status} for Webhook ID ${row.event_id}`)

    }


}, 10000)

