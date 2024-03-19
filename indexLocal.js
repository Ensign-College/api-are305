const express = require('express');//Express makes API to connect FrontEnd with Database
const bodyParser = require('body-parser');
const Redis = require('redis');//Import the Redis library
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // Import uuidv4 function from uuid package
const {addOrder, getOrder} = require("./services/orderservice.js")//import the addOrder function from the ord
const {addOrderItem, getOrderItem} = require("./services/orderItems")//import the addOrderItem function from
const fs = require("fs");//import the file system library
const Schema = JSON.parse(fs.readFileSync("./orderItemSchema.json","utf8")); //read the orderItemSchema.json file
const Ajv = require("ajv"); //import the ajv library
const ajv = new Ajv();//create an ajv object to validate.JSON

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
        let {
            billingAddress,
            billingCity,
            billingState,
            billingZipCode,
            phone,
            totalAmount,
            cardId,
            cardType,
            last4digits,
            orderId
        } = req.body;

        // Reassign customerId to phone number
        customerId = phone;

        // Generate a unique payment ID using customerId and timestamp
        const paymentId = `${customerId}-${Date.now().toString()}`;

        // Construct the payment object
        const payment = {
            customerId,
            billingAddress,
            billingCity,
            billingState,
            billingZipCode,
            phone,
            totalAmount,
            paymentId,
            cardId,
            cardType,
            last4digits,
            orderId
        };

        // Generate a unique key for the payment using phone and current date
        const paymentKey = `payment-${paymentId}`;

        // Store the payment information in Redis as a JSON object
        await redisClient.json.set(paymentKey, '.', payment);

        res.status(200).json({ message: 'Payment successfully stored in Redis' });
    } catch (error) {
        console.error('Error storing payment in Redis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});//Sends a payment to Redis

app.get('/payment/:paymentId', async (req, res) => {
    try {
        const paymentId = req.params.paymentId;
        
        // Retrieve payment from Redis
        const paymentKey = `payment-${paymentId}`;

        const payment = await redisClient.json.get(paymentKey, { path: '.' });

        if (payment) {
            res.status(200).json(payment);
        } else {
            res.status(404).json({ error: 'Payment not found for the given payment ID' });
        }
    } catch (error) {
        console.error('Error retrieving payment from Redis:', error);
        res.status(500).json({ error: 'Error retrieving payment from Redis', details: error.message });
    }
});

app.get('/paymentsPerCustomer/:customerId?', async (req, res) => {
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

//Order
app.post("/orders", async (req,res) => {
    let order = req.body;
    //order details, include product quantity and shipping address
    let responsestatus = order.productQuantity && order.ShippingAddress ? 200 : 400;

    if (responsestatus === 200) {
        try {
            //addOrder function to handle order creation in the database
            await addOrder({redisClient,order});
            res.status(200).json({message: "Order created successfully", order:order});
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error");
            return;
        }
    } else {
        res.status(responsestatus);
        res.send(
            `Missing one of the following fields ${
                order.productQuantity ? "" : "productQuantity"
            } ${order.ShippingAddress ? "" : "ShippingAddress"}`
        );
    }
    res.status(responsestatus).send();
});

app.get("/orders/:orderId",async(req, res)=>{
    //get the order from the database
    const orderId = req.params.orderId;
    let order = await getOrder({redisClient,orderId});
    if (order === null) {
        res.status(404).send("Order not found");        
    } else {
        res.json(order);
    }
});

//Order Items
app.post("/orderItems", async(req, res)=>{
    try {
        console.log("Schema: ", Schema);
        const validate = ajv.compile(Schema);
        const valid = validate(req.body);
        if(!valid){
            return res.status(400).json({ error: "Invalid request body"});
        }
        console.log("Request body: ", req.body);

        //Calling addOrderItem function and storing the result
        const orderItemId = await addOrderItem({
            redisClient,
            orderItem:req.body,
        });

        //Responsing with the result
        res
            .status(201)
            .json({orderItemId, message: "Order item added successfully"});
    } catch (error) {
        console.error("Error adding order item: ", error);
        res.status(500).json({error:"Internal Server Error"});
        
    }
});

console.log('Hello');