
import auth from '../../../middlewares/auth';
import { USER_ROLES } from '../../../../enums/user';
import express from 'express';
import { BarberController } from "./barber.controller";

const router = express.Router();

router.get(
    "/dashboard",
    auth(USER_ROLES.BARBER),
    BarberController.getBarberDashboard
);

export const BarberDashboardRoutes = router;