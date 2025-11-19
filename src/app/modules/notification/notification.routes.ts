import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { NotificationController } from './notification.controller';
const router = express.Router();

router.get('/',
    auth(USER_ROLES.CUSTOMER, USER_ROLES.BARBER),
    NotificationController.getNotificationFromDB
);
router.get('/admin',
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    NotificationController.adminNotificationFromDB
);
router.patch('/',
    auth(USER_ROLES.CUSTOMER, USER_ROLES.BARBER),
    NotificationController.readNotification
);
router.patch('/admin',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    NotificationController.adminReadNotification
);

export const NotificationRoutes = router;
