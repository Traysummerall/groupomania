// routes/comments.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool(); // Ensure to configure Pool as needed

// Route to add a comment to a photo
router.post('/add', async (req, res) => {
	try {
		const { photoId, text } = req.body;

		// Ensure both photoId and text are provided
		if (!photoId || !text) {
			return res.status(400).json({ message: 'Photo ID and comment text are required.' });
		}

		// Create and save the comment
		const result = await pool.query(
			'INSERT INTO comments (photo_id, text) VALUES ($1, $2) RETURNING *',
			[photoId, text]
		);

		res.status(201).json({ success: true, comment: result.rows[0] });
	} catch (error) {
		console.error('Comment error:', error);
		res.status(500).json({ message: 'Comment failed.' });
	}
});

// Route to get comments for a specific photo
router.get('/', async (req, res) => {
	try {
		const { photoId } = req.query;

		if (!photoId) {
			return res.status(400).json({ message: 'Photo ID is required.' });
		}

		const comments = await pool.query('SELECT * FROM comments WHERE photo_id = $1', [photoId]);

		// Ensure comments are always an array
		res.status(200).json(comments.rows || []);
	} catch (error) {
		console.error('Error fetching comments:', error);
		res.status(500).json({ message: 'Failed to fetch comments.' });
	}
});

module.exports = router;
