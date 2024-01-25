const express = require('express');//Express makes API to connect FrontEnd with Database
const bodyParser = require('body-parser');
const Redis = require('redis');//Import the Redis library

//import express from 'express'; <- modern way

const redisClient = Redis.createClient({
    url:`redis://localhost:6379`
});
const app = new express(); //Create an Express application
const port = 3000;//this is the port number

app.use(bodyParser.json());

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
    res.send(JSON.stringify(boxes));//Convert boxes to a string
    //res.send(boxes);
});//Return boxes to the user

console.log('Hello');