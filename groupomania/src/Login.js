import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Input validation
		if (!email || !password) {
			setError('Both email and password are required.');
			return;
		}

		try {
			const response = await fetch('http://localhost:5000/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
			});

			const textResponse = await response.text(); // Handle response as text initially

			try {
				const data = JSON.parse(textResponse); // Attempt to parse JSON
				if (response.ok) {
					// Store the access and refresh tokens
					localStorage.setItem('token', data.accessToken); // Use 'token' for consistency
					localStorage.setItem('refreshToken', data.refreshToken);

					// Navigate to feed page
					navigate('/feed');
				} else {
					setError(data.message || 'Login failed'); // Handle server errors
				}
			} catch (jsonError) {
				// Handle case where response is not valid JSON
				setError('Invalid response from server');
			}
		} catch (error) {
			console.error('Error:', error);
			setError('An error occurred. Please try again.');
		}
	};

	return (
		<div className="Login">
			<div>
				<h2>Login</h2>
				<form onSubmit={handleSubmit}>
					<label>
						Email:
						<input
							type="email"
							name="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</label>
					<br />
					<label>
						Password:
						<input
							type="password"
							name="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</label>
					<br />
					<button type="submit">Log In</button>
					{error && <p className="error-message">{error}</p>}
				</form>
				<p>
					No account yet? <a href="/signup">Sign up!</a>
				</p>
			</div>
		</div>
	);
}

export default Login;
