const express = require('express');
const app = express();
const path = require('path');
const port = 3000;

app.use('/static', express.static(path.join(__dirname,'pages' )));
app.use('/css', express.static(path.join(__dirname,'css' )));
app.use('/scripts', express.static(path.join(__dirname,'scripts' )));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/index.html'));
});

app.get('signIn', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/signIn.html'));
});

app.get('signUp', (req, res) => {
    res.sendFile(path.join(__dirname,  'pages/signUp.html'));
});

app.get('memberOnly', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/memberOnly.html'));
});

app.listen(port, () => {
    console.log('Server is running on http://localhost:3000');
});


