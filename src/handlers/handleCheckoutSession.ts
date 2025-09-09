import Stripe from 'stripe';
import stripe from '../config/stripe';
import { Reservation } from '../app/modules/reservation/reservation.model';

export const handleCheckoutSession = async (data: Stripe.Checkout.Session) => {

    // Retrieve the subscription from Stripe
    const session = await stripe.checkout.sessions.retrieve(data?.id);

    if (session.payment_status === "paid") {

        // mark reservation as paid;
        await Reservation.findOneAndUpdate(
            { sessionId: session.id },
            { 
                paymentStatus: 'Paid',
                amountPaid: session.amount_total 
            },
            { new: true }
        );
    } else {
        console.log("Payment not found");
        return;
    }
}