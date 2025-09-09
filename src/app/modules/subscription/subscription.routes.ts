import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { SubscriptionController } from "./subscription.controller";
const router = express.Router();

router.get("/details", 
    auth(USER_ROLES.SUPER_ADMIN), 
    SubscriptionController.subscriptionDetails
);

export const SubscriptionRoutes = router;