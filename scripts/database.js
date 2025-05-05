require('dotenv').config();
const { MongoClient } = require('mongodb');

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;

const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true&w=majority`;
const client = new MongoClient(atlasURI);

let database;

async function connectToDB() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas!");
    database = client.db('users'); // Your actual DB name
    return database;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}

module.exports = { connectToDB, client };
