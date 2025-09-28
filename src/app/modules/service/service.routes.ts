import express, { NextFunction, Request, Response } from 'express';
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { ServiceController } from "./service.controller";
import validateRequest from "../../middlewares/validateRequest";
import { ServiceValidation } from "./service.validation";
import fileUploadHandler from '../../middlewares/fileUploaderHandler';
import multer from 'multer';

const router = express.Router();


router.post('/',auth(USER_ROLES.BARBER) ,ServiceController.createService); 
router.get('/',auth(USER_ROLES.BARBER) ,ServiceController.getAllServicesbarber);
router.get('/all' ,ServiceController.getAllServices);
router.patch('/:id',auth(USER_ROLES.BARBER), ServiceController.updateService);
router.delete('/:id',auth(USER_ROLES.BARBER), ServiceController.deleteService);

export const ServiceRoutes = router;