import { IPackage } from '../app/modules/package/package.interface';
import stripe from '../config/stripe';

export const updateSubscriptionProduct = async (
    productId: string,
    payload: Partial<IPackage>
): Promise<{ priceId?: string, productId: string } | null> => {

    const {price, title, duration} = payload;

    // Check if the product ID exists
    if ( !productId && !productId?.startsWith("prod")) {
        throw new Error('Product ID is required for updating a product.');
    }

    // Update the product in Stripe
    const updatedProduct = await stripe.products.update(
        productId as string, 
        {
            name: title as string
        }
    );

    let updatedPriceId;

    // If price details need updating
    if (price || duration) {

        const interval: 'month' | 'year' =
            payload.duration === 'month' ||
                payload.duration === 'year' ? payload.duration : 'month';

        // Find the active price for the product (Stripe requires prices to be replaced rather than updated)
        const productPrices = await stripe.prices.list({ product: productId as string, active: true });

        if (productPrices.data.length > 0) {
            // Deactivate the current active price
            await stripe.prices.update(productPrices.data[0].id, { active: false });
        }

        // Create a new price for the updated product
        const newPrice = await stripe.prices.create({
            product: productId as string,
            unit_amount: Number(payload.price) * 100, // Update price (in cents)
            currency: 'usd',
            recurring: { interval: interval },
        });

        updatedPriceId = newPrice.id;
    }

    return { priceId: updatedPriceId, productId: updatedProduct.id };
};
