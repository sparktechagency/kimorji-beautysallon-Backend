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
                    currency: "AED",
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


//barber or admin can refund this user payment
const transferAndPayoutToBarber = async (id: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID')
    }

    const reservation = await Reservation.findById(id)
    if (!reservation) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Reservation doesn't exist")
    }

    const barberId = reservation.barber
    if (!barberId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing barber on reservation')
    }

    const barber = await User.findById(barberId).select('accountInformation')
    if (!barber) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Barber not found')
    }

    const info = barber.accountInformation || {}
    if (!info.status) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Bank info not completed. Please create a bank account")
    }
    if (!info.accountId || !info.externalAccountId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing accountId or externalAccountId')
    }

    if (reservation.transfer === true) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment already transferred')
    }

    if (reservation.status === 'Completed' && reservation.paymentStatus === 'Paid') {
        // keep this if it matches your business rule
        // otherwise rely on reservation.transfer flag only
        // throwing the same message to avoid duplicate transfers
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment already transferred')
    }

    const priceNumber = Number(reservation.price || 0)
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid reservation price')
    }

    const platformFee = Math.floor((priceNumber * 10) / 100)
    const netAmount = priceNumber - platformFee
    const amountCents = Math.round(netAmount * 100)

    try {
        const transfer = await stripe.transfers.create({
            amount: amountCents,
            currency: 'usd',
            destination: info.accountId
        })

        if (!transfer) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to transfer payment')
        }

        const payout = await stripe.payouts.create({
            amount: amountCents,
            currency: 'usd',
            destination: info.externalAccountId
        }, {
            stripeAccount: info.accountId
        })

        if (payout.status !== 'paid') {
            throw new Error('Failed to complete payout')
        }

        if (payout.status === 'paid') {
            await Reservation.findOneAndUpdate({
                _id: id
            }, {
                transfer: true
            }, {
                new: true
            })

            const data = {
                text: 'Congratulations! Your payment has been transferred to your account.',
                receiver: barberId,
                referenceId: id,
                screen: 'RESERVATION'
            }
            sendNotifications(data)
        }
    } catch (error) {
        throw new ApiError(StatusCodes.BAD_REQUEST, (error as Error).message)
    }
}

export const PaymentService = {
    createPaymentCheckoutToStripe,
    createAccountToStripe,
    transferAndPayoutToBarber
}