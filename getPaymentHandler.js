const Redis = require('redis');

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;

let redisClient;

const createRedisClient = () => {
    const client = Redis.createClient({
        host: redisHost,
        port: redisPort,
        tls: {},
        ssl: true,
    });

    client.on('error', err => {
        console.error('Error connecting to Redis:', err);
        // You might want to implement a retry strategy here
    });

    return client;
};

const initializeRedisClient = () => {
    if (!redisClient || !redisClient.connected) {
        redisClient = createRedisClient();
    }
};

initializeRedisClient();

exports.getPaymentHandler = async (event, context) => {
    try {
        console.log('getPaymentHandler START');

        const paymentId = event.pathParameters.paymentId;

        initializeRedisClient();

        const paymentKey = `payment-${paymentId}`;
        console.log(`getPaymentHandler paymentId: ${paymentId}`);

        const payment = await new Promise((resolve, reject) => {
            redisClient.get(paymentKey, (err, reply) => {
                if (err) {
                    console.error('Error retrieving payment from Redis:', err);
                    reject(err);
                } else {
                    resolve(reply);
                }
            });
        });

        if (payment) {
            return {
                statusCode: 200,
                body: JSON.stringify(payment)
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: `Payment not found for the given payment ID: ${paymentId}` })
            };
        }
    } catch (error) {
        console.error('Unhandled error in getPaymentHandler:', error);
        // You might want to implement a retry strategy or notify/alert on error
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error retrieving payment from Redis', details: error.message })
        };
    } finally {
        // Close the Redis client connection when the function finishes execution
        if (redisClient) {
            redisClient.quit();
        }
    }
};
