const jwt = require('jsonwebtoken');

// Generate an access token with a payload
function generateAccessToken(user) {
	return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
}

// Middleware to authenticate tokens
function authenticateToken(req, res, next) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1]; // Extract token from header

	if (!token) {
		console.error(`Request method: ${req.method}, URL: ${req.originalUrl} - No token provided`);
		return res.status(401).json({ message: 'Access Denied: No token provided' });
	}

	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
		if (err) {
			if (err.name === 'TokenExpiredError') {
				console.error(
					`Request method: ${req.method}, URL: ${req.originalUrl} - Token expired:`,
					err
				);
				return res.status(403).json({ message: 'Token expired', expiredAt: err.expiredAt });
			} else {
				console.error(
					`Request method: ${req.method}, URL: ${req.originalUrl} - Token verification error:`,
					err
				);
				return res.status(403).json({ message: 'Invalid token' });
			}
		}

		req.user = user; // Attach user data to request object
		console.log(
			`Request method: ${req.method}, URL: ${req.originalUrl} - Authenticated user:`,
			user
		);
		next(); // Proceed to the next middleware or route handler
	});
}

module.exports = { authenticateToken, generateAccessToken };
