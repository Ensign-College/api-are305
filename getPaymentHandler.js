const Redis = require('redis');

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;

let redisClient;

// Function to create Redis connection
const createRedisClient = () => {
    const client = Redis.createClient({
        host: redisHost,
        port: redisPort,
        tls: {},
        ssl: true,
    });

    client.on('error', err => {
        console.error('Error connecting to Redis:', err);
        // Attempt to reconnect
        createRedisClient();
    });

    return client;
};

// Initialize Redis client
const initializeRedisClient = () => {
    if (!redisClient) {
        redisClient = createRedisClient();
    }
};

// Initialize Redis client outside of try...catch
initializeRedisClient();

exports.getPaymentHandler = async (event, context) => {
    try {
        console.log('getPaymentHandler START');

        const paymentId = event.pathParameters.paymentId;

        // Ensure redisClient is initialized
        initializeRedisClient();

        // Retrieve payment from Redis
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
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error retrieving payment from Redis', details: error.message })
        };
    }
};
