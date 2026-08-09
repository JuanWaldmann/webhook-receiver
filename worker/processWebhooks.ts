import { getPendingWebhooks } from "../db/webhooks.ts";


setInterval(async function processPendingWebhooks(){
    const rows = await getPendingWebhooks()
    console.log(rows)
}, 10000)

