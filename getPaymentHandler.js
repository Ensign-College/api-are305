const Redis = require('redis');

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;

const redisClient = Redis.createClient({
    host: redisHost,
    port: redisPort,
    tls: {},
    ssl: true,
});

redisClient.on('error', err => console.error('Error de conexión con ElastiCache:', err));

redisClient.connect(err => {
    if (err) {
        console.error('Error connecting to Redis:', err);
    } else {
        console.log('Connected to Redis');
    }
});

exports.getPaymentHandler = async (event, context) => {
    
    try {
        console.log('getPaymentHandler START');

        const paymentId = event.pathParameters.paymentId;
        //const paymentId = "1";

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
