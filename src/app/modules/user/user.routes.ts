import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import fileUploadHandler from '../../middlewares/fileUploaderHandler';
const router = express.Router();

router.get(
    '/profile',
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER),
    UserController.getUserProfile
);

router.patch('/update-location',
    auth(USER_ROLES.BARBER, USER_ROLES.CUSTOMER),
    UserController.updateLocation
  );
  
router.post(
    '/create-admin',
    validateRequest(UserValidation.createAdminZodSchema),
    UserController.createAdmin
);

router
    .route('/')
    .post(
        UserController.createUser
    )
    .patch(
        auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER),
        fileUploadHandler(),
        UserController.updateProfile
    );

export const UserRoutes = router;