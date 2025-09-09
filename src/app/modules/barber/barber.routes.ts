import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { BarberController } from './barber.controller';
const router = express.Router();

router.post('/discount',
    auth(USER_ROLES.BARBER),
    async (req: Request, res:Response, next: NextFunction) => {
        try {
            req.body = { discount: Number(req.body.discount) };
            next();
        } catch (error) {
            next(error);
        }
    },
    BarberController.makeDiscount
);

router.get('/profile',
    auth(USER_ROLES.BARBER),
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

router.get('/customer/:id',
    BarberController.getBarberProfile
);

router.get('/:id',
    auth(USER_ROLES.BARBER),
    BarberController.getCustomerProfile
);

export const BarberRoutes = router;