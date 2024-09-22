const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
	{
		photoId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Photo' },
		text: { type: String, required: true },
	},
	{ timestamps: true }
);

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
