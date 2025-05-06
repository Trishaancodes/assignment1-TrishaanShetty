require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const port = 3000;
const sessions = require('express-session');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');
const { connectToDB, client } = require('./scripts/database.js');

const signupSchema = Joi.object({
    firstName: Joi.string().min(1).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const signinSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});


app.use('/static', express.static(path.join(__dirname, 'pages')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use(express.urlencoded({ extended: true }));

connectToDB().then(db => {
    const usersCollection = db.collection('users');

    app.use(sessions({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            client: client,
            dbName: 'users',
            collectionName: 'sessions',
            ttl: 3600
        }),
        cookie: { maxAge: 3600000 }
    }));

    app.get('/user', async (req, res) => {
        if (!req.session.user || !req.session.user.email) {
          return res.status(401).json({ error: "Unauthorized" });
        }
      
        try {
          const user = await usersCollection.findOne({ email: req.session.user.email });
          if (!user) {
            return res.status(404).json({ error: "User not found" });
          }
      
          res.json({ firstName: user.firstName });
        } catch (err) {
          console.error("Error fetching user from DB:", err);
          res.status(500).json({ error: "Server error" });
        }
      });
      
      

    // Serve public pages
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'pages/index.html')));
    app.get('/signIn', (req, res) => res.sendFile(path.join(__dirname, 'pages/signIn.html')));
    app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'pages/signUp.html')));

    // Authenticated landing page
    app.get('/authenticated', (req, res) => {
        if (!req.session.user) return res.redirect('/signIn');
        res.sendFile(path.join(__dirname, 'pages/authenticated.html'));
    });

    // Members-only page
    app.get('/membersOnly', (req, res) => {
        if (!req.session.user) return res.redirect('/signIn');
        res.sendFile(path.join(__dirname, 'pages/membersOnly.html'));
    });

    // Signup logic
    app.post('/signup', async (req, res) => {
        const { firstName, email, password } = req.body;

        const { error } = signupSchema.validate({ firstName, email, password });
        if (error) {
            return res.send(`<p>${error.details[0].message}</p><a href="/signup">Try again</a>`);
        }

        const existing = await usersCollection.findOne({ email });
        if (existing) {
            return res.send(`<p>Email already registered.</p><a href="/signup">Try again</a>`);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await usersCollection.insertOne({ firstName, email, password: hashedPassword });

        req.session.user = { firstName, email };
        res.redirect('/authenticated');
    });

    // Login logic
    app.post('/signIn', async (req, res) => {
        const { email, password } = req.body;

        const { error } = signinSchema.validate({ email, password });
        if (error) {
            return res.send(`<p>${error.details[0].message}</p><a href="/signIn">Try again</a>`);
        }
        const user = await usersCollection.findOne({ email });
        if (!user) return res.send(`<p>User not found</p><a href="/signIn">Try again</a>`);

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.send(`<p>Incorrect password</p><a href="/signIn">Try again</a>`);

        req.session.user = { firstName: user.firstName, email: user.email };
        res.redirect('/authenticated');
    });

    // Logout
    app.get('/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) {
                return res.send("Error logging out.");
            }
            res.redirect('/');
        });
    });
    app.use((req, res) => {
        res.status(404).send(`
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/">Return to Home</a>
        `);
    });
    

    app.listen(port, () => {
        console.log(`✅ Server running on http://localhost:${port}`);
    });
});
