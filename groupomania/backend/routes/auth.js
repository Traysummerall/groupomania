const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const multer = require('multer');
const { authenticateToken, generateAccessToken } = require('../middleware/authMiddleware'); // Named import

// PostgreSQL connection pool
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Secrets
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key';
let refreshTokens = []; // This should ideally be stored in a database

// Multer setup for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Utility function to generate a refresh token
function generateRefreshToken(user) {
	const refreshToken = jwt.sign(user, REFRESH_TOKEN_SECRET);
	refreshTokens.push(refreshToken);
	return refreshToken;
}

// Login route
router.post('/login', async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: 'Email and password are required' });
	}

	try {
		console.log(`Login attempt with email: ${email}`);

		const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
		const user = result.rows[0];
		if (!user) {
			console.log('Login failed: User not found');
			return res.status(401).json({ message: 'Invalid email or password' });
		}

		console.log('User found, comparing passwords...');
		const isMatch = await bcrypt.compare(password, user.password_hash); // Use 'password_hash'
		if (!isMatch) {
			console.log('Login failed: Incorrect password');
			return res.status(401).json({ message: 'Invalid email or password' });
		}

		console.log('Password matches, generating tokens...');
		const userPayload = { id: user.id, email: user.email, username: user.username };
		const accessToken = generateAccessToken(userPayload);
		const refreshToken = generateRefreshToken(userPayload);

		res.json({ message: 'Login successful', accessToken, refreshToken });
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// Signup route
router.post('/signup', async (req, res) => {
	const { username, email, password } = req.body;

	if (!username || !email || !password) {
		return res.status(400).json({ message: 'Username, email, and password are required' });
	}

	try {
		console.log(`Signup attempt with email: ${email}`);

		const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
		if (result.rows.length > 0) {
			console.log('Signup failed: Email already in use');
			return res.status(400).json({ message: 'Email already in use' });
		}

		console.log('Email available, hashing password...');
		const hashedPassword = await bcrypt.hash(password, 10);

		const insertResult = await pool.query(
			`
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email;
        `,
			[username, email, hashedPassword]
		);

		const newUser = insertResult.rows[0];
		console.log('Signup successful:', newUser);
		res.status(201).json({ message: 'Signup successful', user: newUser });
	} catch (error) {
		console.error('Signup error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// Refresh token route
router.post('/refresh', (req, res) => {
	const { refreshToken } = req.body;

	if (!refreshToken) {
		return res.status(401).json({ message: 'Refresh token is missing' });
	}

	if (!refreshTokens.includes(refreshToken)) {
		return res.status(403).json({ message: 'Invalid refresh token' });
	}

	jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user) => {
		if (err) {
			return res.status(403).json({ message: 'Invalid or expired refresh token' });
		}

		const userPayload = { id: user.id, email: user.email, username: user.username };
		const accessToken = generateAccessToken(userPayload);
		res.json({ accessToken });
	});
});

// Logout route
router.post('/logout', (req, res) => {
	const { refreshToken } = req.body;

	if (!refreshToken) {
		return res.status(400).json({ message: 'Refresh token is required' });
	}

	// Remove the refresh token from the list
	refreshTokens = refreshTokens.filter((token) => token !== refreshToken);

	res.json({ message: 'Logout successful' });
});

// Delete account route
router.delete('/delete-account', authenticateToken, async (req, res) => {
	const userId = req.user.id; // Assuming `user.id` is available from authentication middleware

	try {
		// Delete the user's account from the database
		await pool.query('DELETE FROM users WHERE id = $1', [userId]);
		res.status(200).json({ message: 'Account deleted successfully' });
	} catch (error) {
		console.error('Account deletion error:', error);
		res.status(500).json({ message: 'Failed to delete account' });
	}
});

// Get user data route with avatar
router.get('/user', authenticateToken, async (req, res) => {
	const userId = req.user.id; // Assuming `user.id` is available from authentication middleware

	try {
		const result = await pool.query('SELECT username, avatar FROM users WHERE id = $1', [userId]);
		const user = result.rows[0];
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		// Convert avatar to base64 URL
		const avatarUrl = user.avatar
			? `data:image/png;base64,${user.avatar.toString('base64')}`
			: null;

		res.json({ username: user.username, avatar: avatarUrl });
	} catch (error) {
		console.error('Error fetching user data:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// Avatar upload route
router.post('/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
	try {
		const userId = req.user.id;
		const { file } = req;

		if (!file) {
			return res.status(400).json({ message: 'No avatar file provided' });
		}

		// Update user's avatar in the database
		const result = await pool.query(
			'UPDATE users SET avatar = $1 WHERE id = $2 RETURNING id, avatar',
			[file.buffer, userId]
		);

		const updatedUser = result.rows[0];
		console.log(
			'Updated avatar:',
			updatedUser.avatar ? updatedUser.avatar.toString('base64') : 'No avatar'
		);

		res.status(200).json({
			message: 'Avatar updated successfully',
			userId: updatedUser.id,
			avatar: updatedUser.avatar
				? `data:image/png;base64,${updatedUser.avatar.toString('base64')}`
				: null,
		});
	} catch (error) {
		console.error('Error updating avatar:', error.message);
		res.status(500).json({ message: 'Failed to update avatar', error: error.message });
	}
});

module.exports = router;
