import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";


const express = require('express');
const router = express.Router();
const { ShopScheduledController } = require('./scheduled.controller');

router.get(
    '/schedule',
    auth(USER_ROLES.ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER, USER_ROLES.SUPER_ADMIN),
    ShopScheduledController.getShopSchedule
);
router.patch(
    '/schedule', auth(USER_ROLES.ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER, USER_ROLES.SUPER_ADMIN),
    ShopScheduledController.createOrUpdateShopSchedule
);

export const ShopScheduledRoutes = router;