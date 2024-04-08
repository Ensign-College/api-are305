const Redis = require('redis');

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;

let redisClient;

// Function to create Redis connection
const createRedisClient = () => {
    redisClient = Redis.createClient({
        host: redisHost,
        port: redisPort,
        tls: {},
        ssl: true,
    });

    redisClient.on('error', err => {
        console.error('Error connecting to Redis:', err);
        // Attempt to reconnect
        redisClient = createRedisClient();
    });

    return redisClient;
};

// Initialize Redis client
const initializeRedisClient = () => {
    if (!redisClient) {
        redisClient = createRedisClient();
    }
};

exports.getPaymentHandler = async (event, context) => {
    initializeRedisClient();
  
    try {
        console.log('getPaymentHandler START');

        const paymentId = event.pathParameters.paymentId;

        // Retrieve payment from Redis
        const paymentKey = `payment-${paymentId}`;
        console.log(`getPaymentHandler paymentId: ${paymentId}`);

        const payment = await redisClient.json.get(paymentKey, { path: '.' });
        // const payment = await new Promise((resolve, reject) => {
        //     redisClient.json.get(paymentKey, (err, reply) => {
        //         if (err) {
        //             reject(err);
        //         } else {
        //             resolve(reply);
        //         }
        //     });
        // });

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
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error retrieving payment from Redis', details: error.message })
        };
    }
};
