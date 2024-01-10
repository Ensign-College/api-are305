const express = require('express');//Express makes API to connect FrontEnd with Database

//import express from 'express'; <- modern way

const app = new express(); //Create an Express application

app.listen(3000);//Listen for web requests from the FrontEnd and don't stop

const boxes = [
    {boxId:1},
    {boxId:2},
    {boxId:3},
    {boxId:4}
];

// 1-URL
// 2-a function to return boxes
// req= the request from the browser
// res= the response from the browser
app.get('/boxes',(req,res)=>{
    //Send the boxes to the browser
    res.send(JSON.stringify(boxes));//Convert boxes to a string
});//Return boxes to the user

console.log('Hello');