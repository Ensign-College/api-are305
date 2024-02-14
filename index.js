const express = require('express');//Express makes API to connect FrontEnd with Database
const bodyParser = require('body-parser');
const Redis = require('redis');//Import the Redis library
const cors = require('cors');

const options = {
    origin: 'http://localhost:3000'//allow our frontend to call this backend
}

//import express from 'express'; <- modern way

const redisClient = Redis.createClient({
    url:`redis://localhost:6379`
});
const app = new express(); //Create an Express application
const port = 3001;//this is the port number

app.use(bodyParser.json());
app.use(cors(options));

app.listen(port,()=>{
    redisClient.connect();//this connects to the Redis database
    console.log(`API is Listening on port: ${port}`);//template literal
});//Listen for web requests from the FrontEnd and don't stop

// POST request to add a new box
app.post('/boxes', async (req, res) => {
    //const { boxId, boxValue } = req.body;
    const newBox = req.body;
    newBox.id = parseInt(await redisClient.json.arrLen('boxes', '$'))+1;//user should not be allowed to choose the id

    // Update the "boxes" object in the Redis database
    await redisClient.json.arrAppend('boxes', '$', newBox);

    // Send the updated boxes to the browser
    res.json(newBox);
});

// 1-URL
// 2-a function to return boxes
// req= the request from the browser
// res= the response from the browser
app.get('/boxes',async (req,res)=>{
    let boxes = await redisClient.json.get('boxes',{path:'$'});//get theboxes
    //Send the boxes to the browser
    //res.send(JSON.stringify(boxes));//Convert boxes to a string
    res.json(boxes[0]);
});//Return boxes to the user

app.post('/sendPayment', async(req,res)=>{
    try {
        const {
            customerId,
            billingAddress,
            billingCity,
            billingState,
            billingZipCode,
            totalAmount,
            paymentId,
            cardId,
            cardType,
            last4digits,
            orderId
        } = req.body;

        // Construct the payment object
        const payment = {
            customerId,
            billingAddress,
            billingCity,
            billingState,
            billingZipCode,
            totalAmount,
            paymentId,
            cardId,
            cardType,
            last4digits,
            orderId
        };

        // Generate a unique key for the payment using current datetime
        const currentDate = new Date().toISOString().replace(/:/g, '-'); // Format datetime to avoid invalid characters
        const paymentKey = `payment_${currentDate}`;

        // Store the payment information in Redis as a JSON object
        await redisClient.json.set(paymentKey, '.', payment);

        res.status(200).json({ message: 'Payment successfully stored in Redis' });
    } catch (error) {
        console.error('Error storing payment in Redis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});//Sends a payment to Redis

app.get('/payments/:customerId?', async (req, res) => {
    try {
        const { customerId } = req.params;

        if (customerId) {
            // Search for all payment keys that correspond to the provided customerId
            const paymentKeys = await redisClient.keys('payment_*');
            const payments = [];

            for (const key of paymentKeys) {
                const payment = await redisClient.json.get(key, { path: '.' });
                if (payment.customerId == customerId) {
                    payments.push(payment);
                }
            }

            if (payments.length > 0) {
                res.status(200).json(payments);
            } else {
                res.status(404).json({ error: 'No payments found for the given customer ID' });
            }
        } else {
            // No customerId provided, retrieve all payments
            const paymentKeys = await redisClient.keys('payment_*');
            const allPayments = [];

            for (const key of paymentKeys) {
                const payment = await redisClient.json.get(key, { path: '.' });
                allPayments.push(payment);
            }

            res.status(200).json(allPayments);
        }
    } catch (error) {
        console.error('Error retrieving payments from Redis:', error);
        res.status(500).json({ error: 'Error retrieving payments from Redis', details: error.message });
    }
});

console.log('Hello');