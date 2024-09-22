const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken'); // For handling JWT tokens
const { authenticateToken, generateAccessToken } = require('./middleware/authMiddleware'); // Import the middleware and token generator

dotenv.config();

const app = express();

// Middleware for parsing request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debugging logs for environment variables
console.log('Database URL:', process.env.DATABASE_URL);
console.log('SSL setting:', process.env.DATABASE_SSL === 'true' ? 'Enabled' : 'Disabled');

// CORS configuration
const corsOptions = {
	origin: 'http://localhost:3000',
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Multer setup for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Connect to PostgreSQL
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool
	.connect()
	.then(() => console.log('PostgreSQL connected'))
	.catch((err) => console.error('PostgreSQL connection error:', err));

// Fetch photos with username and image data as base64
app.get('/api/photos', async (req, res) => {
	try {
		const result = await pool.query(`
            SELECT photos.*, users.username, encode(image_data, 'base64') AS image_data_base64
            FROM photos
            JOIN users ON photos.user_id = users.id
        `);
		console.log('Photos fetched:', result.rows);
		res.json(
			result.rows.map((row) => ({
				id: row.id,
				url: row.image_data ? `data:image/png;base64,${row.image_data_base64}` : null,
				text: row.text,
				username: row.username,
				avatarUrl: row.avatar ? `data:image/png;base64,${row.avatar.toString('base64')}` : null,
			}))
		);
	} catch (error) {
		console.error('Fetch photos error:', error.message);
		res.status(500).json({ message: 'Failed to fetch photos', error: error.message });
	}
});

// Upload a new photo and/or text
app.post('/api/photos/upload', authenticateToken, upload.single('photo'), async (req, res) => {
	try {
		const { text } = req.body;
		const { file } = req;

		console.log('Request body:', req.body);
		console.log('File info:', file);

		let imageData = null;
		if (file) {
			imageData = file.buffer;
			console.log('Image data buffer length:', imageData.length);
		}

		const userId = req.user.id;

		if (!text && !file) {
			return res.status(400).json({ message: 'No text or image provided' });
		}

		const result = await pool.query(
			'INSERT INTO photos (image_data, text, user_id) VALUES ($1, $2, $3) RETURNING *',
			[imageData || null, text || null, userId]
		);

		const newPhoto = result.rows[0];
		console.log('Photo uploaded:', newPhoto);

		res.status(201).json({
			id: newPhoto.id,
			url: newPhoto.image_data
				? `data:image/png;base64,${newPhoto.image_data.toString('base64')}`
				: null,
			text: newPhoto.text,
			username: req.user.username,
			avatarUrl: req.user.avatarUrl,
		});
	} catch (error) {
		console.error('Error inserting photo into database:', error.message);
		res.status(500).json({ message: 'Failed to upload photo', error: error.message });
	}
});

// Add a comment to a specific photo
app.post('/api/photos/:id/comments', authenticateToken, async (req, res) => {
	const photoId = parseInt(req.params.id, 10);
	const { text } = req.body;
	const userId = req.user.id;

	console.log('Adding comment to photo ID:', photoId);
	console.log('Comment text:', text);
	console.log('User ID:', userId);

	try {
		const photoResult = await pool.query('SELECT * FROM photos WHERE id = $1', [photoId]);
		const photo = photoResult.rows[0];
		if (!photo) {
			console.error('Photo not found, ID:', photoId);
			return res.status(404).json({ error: 'Photo not found' });
		}

		const newCommentResult = await pool.query(
			'INSERT INTO comments (photo_id, text, user_id) VALUES ($1, $2, $3) RETURNING *',
			[photoId, text, userId]
		);
		const newComment = newCommentResult.rows[0];

		console.log('Comment added:', newComment);
		res.status(201).json(newComment);
	} catch (error) {
		console.error('Error adding comment:', error.message);
		res.status(500).json({ message: 'Failed to add comment', error: error.message });
	}
});

// Fetch comments for a specific photo with usernames
app.get('/api/photos/:id/comments', async (req, res) => {
	const photoId = parseInt(req.params.id, 10);

	console.log('Fetching comments for photo ID:', photoId);

	try {
		const photoResult = await pool.query('SELECT * FROM photos WHERE id = $1', [photoId]);
		const photo = photoResult.rows[0];
		if (!photo) {
			console.error('Photo not found, ID:', photoId);
			return res.status(404).json({ error: 'Photo not found' });
		}

		const commentsResult = await pool.query(
			`
            SELECT comments.*, users.username
            FROM comments
            JOIN users ON comments.user_id = users.id
            WHERE photo_id = $1
        `,
			[photoId]
		);
		console.log('Comments fetched:', commentsResult.rows);
		res.json(commentsResult.rows);
	} catch (error) {
		console.error('Error fetching comments:', error.message);
		res.status(500).json({ message: 'Failed to fetch comments', error: error.message });
	}
});

// Delete user account
app.delete('/api/auth/delete-account', authenticateToken, async (req, res) => {
	const userId = req.user.id;

	if (!userId) {
		console.error('Unauthorized: No user ID provided');
		return res.status(401).json({ message: 'Unauthorized' });
	}

	console.log('Deleting user account with ID:', userId);

	try {
		await pool.query('DELETE FROM comments WHERE user_id = $1', [userId]);
		await pool.query('DELETE FROM photos WHERE user_id = $1', [userId]);
		await pool.query('DELETE FROM users WHERE id = $1', [userId]);

		console.log('User account and related data deleted successfully');
		res.json({ message: 'User account deleted successfully' });
	} catch (error) {
		console.error('Error deleting user account:', error.message);
		res.status(500).json({ message: 'Failed to delete user account', error: error.message });
	}
});

// Upload and update avatar
app.post(
	'/api/auth/upload-avatar',
	authenticateToken,
	upload.single('avatar'),
	async (req, res) => {
		const userId = req.user.id;
		const { file } = req;

		if (!file) {
			return res.status(400).json({ message: 'No file provided' });
		}

		try {
			const imageData = file.buffer;

			const result = await pool.query(
				'UPDATE users SET avatar = $1 WHERE id = $2 RETURNING id, avatar',
				[imageData, userId]
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
	}
);

// Use authentication routes
app.use('/api/auth', require('./routes/auth'));

// Basic route
app.get('/', (req, res) => {
	res.send('API is running...');
});

// Define port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
