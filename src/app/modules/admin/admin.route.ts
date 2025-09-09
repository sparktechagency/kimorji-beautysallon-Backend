import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { AdminController } from './admin.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AdminValidation } from './admin.validation';
const router = express.Router();

router.post(
    '/create-admin',
    auth(USER_ROLES.SUPER_ADMIN),
    validateRequest(AdminValidation.createAdminZodSchema),
    AdminController.createAdmin
);

router.get('/get-admin',
    auth(USER_ROLES.SUPER_ADMIN),
    AdminController.getAdmin
);

router.get('/revenue-statistics',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    AdminController.revenueStatistics
);

router.get('/user-statistics',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    AdminController.userStatistics
);

router.get('/count-summary',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    AdminController.countSummary
);

router.get('/user-list',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    AdminController.userList
);

router.get('/reservation-list',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    AdminController.reservationList
);

router.delete('/:id',
    auth(USER_ROLES.SUPER_ADMIN),
    AdminController.deleteAdmin
);

export const AdminRoutes = router;
