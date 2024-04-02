// const Redis = require('redis');
import Redis from 'redis'
import { v4 as uuidv4 } from 'uuid';

const redisClient = Redis.createClient({
    socket: {
        host: `${process.env.REDIS_HOST}`,
        port: `${process.env.REDIS_PORT}`
    },
    tls: {},
    ssl: true,
});

exports.getPaymentHandler = async (event, context) => {
    
    try {
        console.log('getPaymentHandler START');

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
