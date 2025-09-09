import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { User } from "../user/user.model";
import { JwtPayload } from "jsonwebtoken";
import stripe from "../../../config/stripe";
import { Reservation } from "../reservation/reservation.model";
import { IUser } from "../user/user.interface";
import { IReservation } from "../reservation/reservation.interface";
import mongoose from "mongoose";
import { sendNotifications } from "../../../helpers/notificationsHelper";

const createPaymentCheckoutToStripe = async (user: JwtPayload, payload: any): Promise<string | null> => {
    const { price, service_name, id, tips } = payload;

    if (!service_name) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Service name is required");
    }

    if (!id) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Reservation ID is required");
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: `${service_name} Service Reservation Payment`,
                    },
                    unit_amount: price ? Math.trunc(price * 100) : Math.trunc(tips * 100),
                },
                quantity: 1,
            },
        ],
        customer_email: user?.email,
        success_url: "https://www.admin.barbermeus.com/public/payment-success",
        cancel_url: "https://www.admin.barbermeus.com/public/payment-failed"
    });

    if (!session) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Payment Checkout");
    } else {
        await Reservation.findOneAndUpdate(
            { _id: id },
            {
                sessionId: session.id,
                tips: tips ? Number(tips) : 0
            },
            { new: true }
        );
    }

    return session?.url;
};

// create account
const createAccountToStripe = async (user: JwtPayload) => {

    // check this user is exist
    const existingUser: IUser | null = await User.findById(user.id).select("+accountInformation").lean();
    if (existingUser?.accountInformation?.accountUrl) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }

    // create account
    const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: user?.email,
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
    });

    if (!account) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create account");
    }

    // // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: "https://www.admin.barbermeus.com/public/onboard-success",
        return_url: "https://www.admin.barbermeus.com/public/onboard-failed",
        type: 'account_onboarding',
    });

    // update account
    const updateAccount = await User.findOneAndUpdate(
        { _id: user.id },
        { "accountInformation.accountId": account.id },
        { new: true }
    );

    if (!updateAccount) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update account");
    }

    return accountLink?.url;
}

// transfer and payout credit
const transferAndPayoutToBarber = async (id: string) => {

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

    const isExistReservation: IReservation | any = await Reservation.findById(id);
    if (!isExistReservation) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Reservation doesn't exist!");
    }

    const isExistBarber = await User.isAccountCreated(isExistReservation.barber);
    if (!isExistBarber) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Sorry, you are didn't provide bank information. Please create a bank account");
    }

    //check completed payment and barber transfer
    if (isExistReservation.status === "Completed" && isExistReservation.paymentStatus === "Paid") {
        throw new ApiError(StatusCodes.BAD_REQUEST, "The payment has already been transferred to your account.");
    }

    //check completed payment and barber transfer
    if (isExistReservation.transfer === true) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "The payment has already been transferred to your account.");
    }

    const { accountId, externalAccountId } = isExistBarber?.accountInformation;
    const { price } = isExistReservation;

    const charge = (parseInt(price.toString()) * 10) / 100;
    const amount = parseInt(price.toString()) - charge;

    const transfer = await stripe.transfers.create({
        amount: amount * 100,
        currency: "usd",
        destination: accountId,
    });

    if (!transfer) throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to transfer payment');

    const payouts = await stripe.payouts.create(
        {
            amount: amount * 100,
            currency: "usd",
            destination: externalAccountId,
        },
        {
            stripeAccount: accountId,
        }
    );

    if (payouts.status !== "paid") throw new Error("Failed to complete payout");

    if (payouts.status === "paid") {
        await Reservation.findOneAndUpdate(
            { _id: id },
            { transfer: true },
            { new: true });

        const data = {
            text: "Congratulations! Your payment has been transferred to your account.",
            receiver: isExistReservation.barber,
            referenceId: id,
            screen: "RESERVATION"
        }
        sendNotifications(data);

    }

    return;
}


export const PaymentService = {
    createPaymentCheckoutToStripe,
    createAccountToStripe,
    transferAndPayoutToBarber
}