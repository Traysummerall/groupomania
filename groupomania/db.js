const { Pool } = require('pg');
require('dotenv').config();

// Debug logging
console.log('Database URL:', process.env.DATABASE_URL);
console.log('SSL setting:', process.env.DATABASE_SSL === 'true' ? 'Enabled' : 'Disabled');

// Create a new Pool instance
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false, // Enable SSL if DATABASE_SSL is 'true'
});

// Test connection
pool
	.connect()
	.then(() => console.log('Connected to PostgreSQL'))
	.catch((err) => console.error('Connection error', err.stack));

module.exports = pool;
