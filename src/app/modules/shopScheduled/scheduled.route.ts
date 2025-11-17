import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";


import express from 'express';
const router = express.Router();
import { ShopScheduledController } from './scheduled.controller';

router.get(
    '/schedule',
    auth(USER_ROLES.ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER, USER_ROLES.SUPER_ADMIN),
    ShopScheduledController.getShopSchedule
);

router.patch(
    '/schedule', auth(USER_ROLES.ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER, USER_ROLES.SUPER_ADMIN),
    ShopScheduledController.createOrUpdateShopSchedule
);
router.get(
    '/barbar-schedule',
    // auth(USER_ROLES.ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER, USER_ROLES.SUPER_ADMIN),
    ShopScheduledController.getShopScheduleByBarberId
)

export const ShopScheduledRoutes = router;