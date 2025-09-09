import express, { NextFunction, Request, Response } from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { ReservationController } from "./reservation.controller";
const router = express.Router();

router.route("/")
    .post(
        auth(USER_ROLES.CUSTOMER),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { price, travelFee, appCharge, ...othersPayload } = req.body;

                if (price > 0) {
                    othersPayload.price = Number(price);
                    othersPayload.travelFee = Number(travelFee);
                    othersPayload.appCharge = Number(appCharge);
                }

                req.body = { ...othersPayload, customer: req.user.id };
                next();

            } catch (error) {
                return res.status(500).json({ message: "Failed to Convert string to number" });
            }
        },
        ReservationController.createReservation
    )
    .get(
        auth(USER_ROLES.CUSTOMER), 
        ReservationController.customerReservation
    );

router.get("/barber",
    auth(USER_ROLES.BARBER),
    ReservationController.barberReservation
);

router.get("/barber-summery",
    auth(USER_ROLES.BARBER),
    ReservationController.reservationSummerForBarber
);

router.patch("/confirm/:id",
    auth(USER_ROLES.CUSTOMER),
    ReservationController.confirmReservation
)

router.route("/:id")
    .get(
        auth(USER_ROLES.BARBER),
        ReservationController.reservationDetails
    )
    .patch(
        auth(USER_ROLES.BARBER),
        ReservationController.respondedReservation
    )
    .delete(
        auth(USER_ROLES.CUSTOMER),
        ReservationController.cancelReservation
    );


export const ReservationRoutes = router;