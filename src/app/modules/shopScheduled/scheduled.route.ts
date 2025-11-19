import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import express from 'express';
import { ShopScheduleController } from "./scheduled.controller";


const router = express.Router();

router.patch(
  "/",
  auth(USER_ROLES.ADMIN,USER_ROLES.BARBER),
  ShopScheduleController.createOrUpdateShopSchedule
);

router.post(
  "/temporary-closure",
  auth(USER_ROLES.BARBER,USER_ROLES.ADMIN),
  ShopScheduleController.addTemporaryClosure
);

router.delete(
  "/temporary-closure",
  auth(USER_ROLES.ADMIN,USER_ROLES.BARBER),
  ShopScheduleController.removeTemporaryClosure
);


router.get(
  "/available-slots",
  ShopScheduleController.getAvailableTimeSlotsForDate
);

router.get(
  "/available-slots/:serviceId",
  ShopScheduleController.getAvailableSlotsForService
);


router.get(
  "/temporary-closures/:barberId",
  ShopScheduleController.getTemporaryClosures
);

router.post(
  "/cleanup",
  auth(USER_ROLES.BARBER,USER_ROLES.CUSTOMER),
  ShopScheduleController.cleanupOldClosures
);


router.get(
  "/:barberId",
  ShopScheduleController.getShopSchedule
);

// router.get(
//     '/schedule',
//     auth(USER_ROLES.ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER, USER_ROLES.SUPER_ADMIN),
//     ShopScheduledController.getShopSchedule
// );
// router.get(
//     '/barbar-schedule',
//     // auth(USER_ROLES.ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER, USER_ROLES.SUPER_ADMIN),
//     ShopScheduledController.getShopScheduleByBarberId
// )

// router.patch(
//     '/schedule', auth(USER_ROLES.ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER, USER_ROLES.SUPER_ADMIN),
//     ShopScheduledController.createOrUpdateShopSchedule
// );

export const ShopScheduledRoutes = router;