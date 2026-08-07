    import express, { type Express, type Request, type Response, type NextFunction } from 'express';
    import { isValid } from './middleware/verifySignature.ts';

    const app: Express = express();
    const port = 3000;

    app.use(express.json({
        verify(req, res, buf, encoding) {
            req.rawBody = buf
        }
    }));


    app.post('/webhooks/incoming', isValid, (req: Request, res: Response, next: NextFunction) => {
        console.log(req.body);
        console.log(req.rawBody)
        res.sendStatus(200);
    });

    app.listen (port, ()=> {
    console.log(`Example app listening on port ${port}`);
    });

