import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import "express-async-errors";
import router from '../src/app/routes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import handleStripeWebhook from "./webhook/handleStripeWebhook";
import seedSuperAdmin from "./DB";
import { debug } from "winston";
import { requestLogger } from "./responseTimeLogger/response.time";
import { Morgan } from "./shared/morgan";
const app = express();
// morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

//debug
app.use(requestLogger());

// stripe webhook 
app.use(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    handleStripeWebhook
);


//body parser
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//file retrieve
app.use(express.static('uploads'));

//router
app.use('/api/v1', router);
app.get("/", (req: Request, res: Response) => {
    res.send("Hey Welcome to the beauty World. How can I assist you");
})

app.get("/success", (req: Request, res: Response) => {
    res.send("congratulations payment success");
})

app.get("/cancelled", (req: Request, res: Response) => {
    res.send("Very Sad Cancelled Payment");
})

//global error handle
app.use(globalErrorHandler);

// handle not found route
app.use((req: Request, res: Response) => {
    res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Not Found",
        errorMessages: [
            {
                path: req.originalUrl,
                message: "API DOESN'T EXIST"
            }
        ]
    })
});

export default app;