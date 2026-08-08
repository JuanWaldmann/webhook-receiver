    import express, { type Express, type Request, type Response, type NextFunction } from 'express';
    import { isValid } from './middleware/verifySignature.ts';
    import { insertWebhookIfNew } from './db/webhooks.ts';

    const app: Express = express();
    const port = 3000;


    app.use(express.json({
        verify(req, res, buf, encoding) {
            req.rawBody = buf
        }
    }));

    app.post ('/webhooks/incoming', isValid, async (req: Request, res: Response, next: NextFunction) =>  {
        const deliveryId = req.headers['x-github-delivery'];
        const eventType = req.headers['x-github-event'];
        const payload  = req.body;
        
        const wasInserted = await insertWebhookIfNew(deliveryId, eventType, payload)
        console.log(wasInserted)
        res.sendStatus(200);
    });

    app.listen (port, ()=> {
    console.log(`Example app listening on port ${port}`);
    });

