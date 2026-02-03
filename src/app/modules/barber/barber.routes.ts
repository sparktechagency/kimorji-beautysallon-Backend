import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { BarberController } from './barber.controller';
const router = express.Router();

router.post('/discount',
    auth(USER_ROLES.BARBER),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = { shopDiscount: Number(req.body.shopDiscount) };
            next();
        } catch (error) {
            next(error);
        }
    },
    BarberController.makeDiscount
);
router.get('/own-profile',
    auth(USER_ROLES.BARBER, USER_ROLES.CUSTOMER),
    BarberController.barbaerownprofile
);
router.get('/profile',
    auth(USER_ROLES.BARBER, USER_ROLES.CUSTOMER),
    BarberController.barberDetails
);


router.get('/offer',
    BarberController.specialOfferBarber
);

router.get('/',
    BarberController.getBarberList
);

router.get('/recommended',
    BarberController.recommendedBarber
);


router.get('/:id',
    auth(USER_ROLES.BARBER),
    BarberController.getCustomerProfile
);
router.get('/customer/:id',
    auth(USER_ROLES.BARBER, USER_ROLES.CUSTOMER),
    BarberController.getBarberProfile
);
router.get(
    '/:userId/category',
    auth(USER_ROLES.BARBER, USER_ROLES.CUSTOMER)
    , BarberController.getUserCategoryWithServices
);

// router.get(
//     '/:userId/category/:categoryId/aggregated',
//     auth(USER_ROLES.BARBER, USER_ROLES.CUSTOMER),
//     BarberController.getUserCategoryWithServicesAggregated
// );
export const BarberRoutes = router;
