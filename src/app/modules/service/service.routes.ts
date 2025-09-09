import express, { NextFunction, Request, Response } from 'express';
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { ServiceController } from "./service.controller";
import validateRequest from "../../middlewares/validateRequest";
import { ServiceValidation } from "./service.validation";
import fileUploadHandler from '../../middlewares/fileUploaderHandler';

const router = express.Router();

router
    .route("/")
    .post(
        auth(USER_ROLES.BARBER),
        async (req: Request, res: Response, next: NextFunction) => {
            try {

                const payload = req.body;
                const result = payload?.map((service: any) => {
                    return {
                        ...service,
                        barber: req.user.id
                    }
                });

                req.body = result;
                next();

            } catch (error) {
                return res.status(500).json({ message: "Need Array to insert Multiple Service together" });
            }
        },
        validateRequest(ServiceValidation.createServiceZodSchema),
        ServiceController.createService
    )
    .get(
        auth(USER_ROLES.BARBER),
        ServiceController.getServiceForBarber
    )
    .patch(
        auth(USER_ROLES.BARBER),
        ServiceController.holdService
    );

router
    .route("/:id")
    .patch(
        auth(USER_ROLES.BARBER),
        fileUploadHandler(),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { price, ...othersPayload } = req.body;

                let image;
                if (req.files && "image" in req.files && req.files.image[0]) {
                    image = `/images/${req.files.image[0].filename}`;
                }

                if (price) {
                    othersPayload.price = Number(price);
                }

                req.body = { ...othersPayload, image };
                next();

            } catch (error) {
                return res.status(500).json({ message: "Invalid Image Format" });
            }
        },
        validateRequest(ServiceValidation.updateServiceZodSchema),
        ServiceController.updateService
    )

export const ServiceRoutes = router;