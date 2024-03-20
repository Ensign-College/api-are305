const Redis = require('redis');
const { addOrder } = require("./services/orderservice.js");

const redisClient = Redis.createClient({
    url: `redis://localhost:6379`
});

exports.addOrderHandler = async (event, context) => {
    try {
        const requestBody = JSON.parse(event.body);
        const order = requestBody;

        // Check if required fields are present
        if (!order.productQuantity || !order.ShippingAddress) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing productQuantity or ShippingAddress' })
            };
        }

        // Add order to the database
        await addOrder({ redisClient, order });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Order created successfully', order: order })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};