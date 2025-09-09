import express, { Request, Response } from "express";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import { Morgan } from "./shared/morgan";
import router from '../src/app/routes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import handleStripeWebhook from "./webhook/handleStripeWebhook";
const app = express();

// morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

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

app.get("/", (req: Request, res: Response)=>{
    res.send("Hey Welcome to the Barber World. How can I assist you");
})

//global error handle
app.use(globalErrorHandler);

// handle not found route
app.use((req: Request, res: Response)=>{
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