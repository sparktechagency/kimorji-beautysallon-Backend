import Stripe from 'stripe';
import config from '.';

const stripe = new Stripe(config.stripe.stripeSecretKey as string, {
    apiVersion: "2024-12-18.acacia" // Update this to the expected version
});

export default stripe;