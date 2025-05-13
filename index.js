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


app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, '/public/css')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(express.static('public'));


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
    app.get('/', (req, res) => {
        res.render('index', {
            title: "Welcome",
            cssFile: 'index.css',
            scripts: []
        });
    });
    
    app.get('/signIn', (req, res) => {
        res.render('signIn', {
            title: "Sign In",
            cssFile: '',
            scripts: ['authenticated.js']
        });
    });
    
    app.get('/signup', (req, res) => {
        res.render('signUp', {
            title: "Sign Up",
            scripts: ['authenticated.js']
        });
    });

    // Authenticated landing page
    app.get('/authenticated', (req, res) => {
        if (!req.session.user){
            return res.redirect('/signIn');
        }
        res.render('authenticated', {
            title: 'Authenticated',
            cssFile: 'authenticated.css',
            scripts: ['authenticated.js'],
            userName: req.session.user.firstName
        });
    });

    // Members-only page
    app.get('/membersOnly', (req, res) => {
        if (!req.session.user) return res.redirect('/');
        res.render('membersOnly', {
            title: 'Members Area',
            cssFile: '',
            scripts: ['membersOnly.js'],
            images: ['dog1.jpg', 'dog2.jpg', 'dog3.jpeg']
        });
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
        await usersCollection.insertOne({
            firstName,
            email,
            password: hashedPassword,
            user_type: "user"
        });
        
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

    function isLoggedIn(req, res, next) {
        if (!req.session.user) return res.redirect('/signIn');
        next();
    }
    
    async function isAdmin(req, res, next) {
        if (!req.session.user) return res.redirect('/signIn');
    
        const user = await usersCollection.findOne({ email: req.session.user.email });
        if (!user || user.user_type !== 'admin') {
            return res.status(403).send("Forbidden: Admins only");
        }
        next();
    }
    app.get('/admin', isLoggedIn, isAdmin, async (req, res) => {
        const users = await usersCollection.find().toArray();
        res.render('admin', { 
            title: 'Admin Panel', 
            users, 
            sessionUserEmail: req.session.user.email 
        });
    });
    
    app.post('/admin/promote/:email', isLoggedIn, isAdmin, async (req, res) => {
        await usersCollection.updateOne({ email: req.params.email }, { $set: { user_type: 'admin' } });
        res.redirect('/admin');
    });
    
    app.post('/admin/demote/:email', isLoggedIn, isAdmin, async (req, res) => {
        await usersCollection.updateOne({ email: req.params.email }, { $set: { user_type: 'user' } });
        res.redirect('/admin');
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
        res.render('404')
        });


    app.listen(port, () => {
        console.log(`✅ Server running on http://localhost:${port}`);
    });
});

