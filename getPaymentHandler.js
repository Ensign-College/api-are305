const Redis = require('redis');

const redisClient = Redis.createClient({
    url: `redis://localhost:6379`
});

exports.getPaymentHandler = async (event, context) => {
    try {
        const paymentId = event.pathParameters.paymentId;

        // Retrieve payment from Redis
        const paymentKey = `payment-${paymentId}`;

        const payment = await redisClient.json.get(paymentKey, { path: '.' });

        if (payment) {
            return {
                statusCode: 200,
                body: JSON.stringify(payment)
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Payment not found for the given payment ID' })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error retrieving payment from Redis', details: error.message })
        };
    }
};
