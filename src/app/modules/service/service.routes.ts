import express, { NextFunction, Request, Response } from 'express';
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { ServiceController } from "./service.controller";
import validateRequest from "../../middlewares/validateRequest";
import { ServiceValidation } from "./service.validation";
import fileUploadHandler from '../../middlewares/fileUploaderHandler';
import multer from 'multer';
import { RecommendedService } from '../recommended/recommended.service';

const router = express.Router();

router.post('/', auth(USER_ROLES.BARBER), ServiceController.createService);
router.get('/barber', auth(USER_ROLES.BARBER), ServiceController.getAllServicesbarber);
router.get('/all', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.BARBER, USER_ROLES.CUSTOMER), ServiceController.getAllServices);
router.get('/recommended', (req: Request, res: Response, next: NextFunction) => {
    const { latitude, longitude, maxDistance = 10000, limit = 10 } = req.query;
    RecommendedService.getRecommendedServices(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        parseInt(maxDistance as string),
        parseInt(limit as string)
    ).then(result => res.json(result)).catch(next);
});
router.get('/bestForYou', (req: Request, res: Response, next: NextFunction) => {
    const { latitude, longitude, maxDistance = 10000, limit = 10 } = req.query;
    RecommendedService.getServicesByLocation(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        parseInt(maxDistance as string),
        parseInt(limit as string)
    ).then(result => res.json(result)).catch(next);
});
router.patch('/:id', auth(USER_ROLES.BARBER), ServiceController.updateService);
router.delete('/:id', auth(USER_ROLES.BARBER), ServiceController.deleteService);

export const ServiceRoutes = router;