import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { offerController } from './offer.controller';
const router = express.Router();

router.post(
    '/:id',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.BARBER),
    offerController.addOffer
);

router.get('/',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.BARBER),
    offerController.getAllOffers
);

router.get('/serviceOffer/:serviceId/:date',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER),
    offerController.findOfferForServiceAt
);

// router.get('/user-statistics',
//     auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
//     AdminController.userStatistics
// );

// router.get('/count-summary',
//     auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
//     AdminController.countSummary
// );

// router.get('/user-list',
//     auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
//     AdminController.userList
// );

// router.get('/reservation-list',
//     auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
//     AdminController.reservationList
// );

// router.delete('/:id',
//     auth(USER_ROLES.SUPER_ADMIN),
//     AdminController.deleteAdmin
// );

export const OfferRoutes = router;
