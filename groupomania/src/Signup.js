import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Signup.css';

const Signup = () => {
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');

		if (password !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		setLoading(true);
		try {
			const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
			const response = await fetch(`${apiUrl}/api/auth/signup`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, email, password }),
			});

			if (response.ok) {
				navigate('/login');
			} else {
				let errorMessage = 'Sign up failed. Please try again.';
				try {
					const data = await response.json();
					errorMessage = data.message || errorMessage;
				} catch (e) {
					console.error('Error parsing JSON response:', e);
				}
				setError(errorMessage);
			}
		} catch (error) {
			console.error('Error:', error);
			setError('An error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="signup-container">
			<h2>Sign Up</h2>
			<form onSubmit={handleSubmit}>
				<div className="input-container">
					<label htmlFor="username">Username</label>
					<input
						type="text"
						id="username"
						name="username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					/>
				</div>
				<div className="input-container">
					<label htmlFor="email">Email</label>
					<input
						type="email"
						id="email"
						name="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</div>
				<div className="input-container">
					<label htmlFor="password">Password</label>
					<input
						type="password"
						id="password"
						name="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				<div className="input-container">
					<label htmlFor="confirm-password">Confirm Password</label>
					<input
						type="password"
						id="confirm-password"
						name="confirm-password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						required
					/>
				</div>
				{error && <p className="error-message">{error}</p>}
				<button type="submit" disabled={loading || password !== confirmPassword}>
					{loading ? 'Signing Up...' : 'Sign Up'}
				</button>
			</form>
			<p>
				Already have an account? <Link to="/login">Log in!</Link>
			</p>
		</div>
	);
};

export default Signup;
