    import express, { type Express, type Request, type Response, type NextFunction } from 'express';
    import crypto from 'crypto';

    // TODO const WEBHOOK_SECRET process.env.GITHUB_WEBHOOK_SECRET ?? secretKey;

    const app: Express = express();
    const port = 3000;
    const secretKey = '1234'

    app.use(express.json({
        verify(req, res, buf, encoding) {
            req.rawBody = buf
        }
    }));


    function isValid(req: Request, res: Response, next: NextFunction) {
        const signatureHeader = req.headers['x-hub-signature-256'];

        if (!signatureHeader){
            return res.sendStatus(401);
        }

        const theirSignature = Buffer.from(signatureHeader.replace('sha256=', ''), 'hex');
        const mySignature = Buffer.from(
            crypto.createHmac('sha256', secretKey).update(req.rawBody).digest('hex'), 'hex'
        );
        const isAuthentic = theirSignature.length === mySignature.length && crypto.timingSafeEqual(theirSignature, mySignature);

        if (!isAuthentic){
            return res.sendStatus(401);
        }

        next();
    };
    app.post('/webhooks/incoming', isValid, (req: Request, res: Response, next: NextFunction) => {
        console.log(req.body);
        console.log(req.rawBody)
        res.sendStatus(200);
    });

    app.listen (port, ()=> {
    console.log(`Example app listening on port ${port}`);
    });

