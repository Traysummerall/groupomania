import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import Home from './Home';
import FeedPage from './feedpage';

class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error, errorInfo) {
		console.error('Error caught by ErrorBoundary:', error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return <h1>Something went wrong.</h1>;
		}

		return this.props.children;
	}
}

function PrivateRoute({ element, ...rest }) {
	const navigate = useNavigate();
	const isAuthenticated = localStorage.getItem('token'); // Adjust authentication logic as needed

	if (!isAuthenticated) {
		navigate('/login');
		return null; // Prevent the component from rendering
	}

	return element;
}

function App() {
	return (
		<Router>
			<ErrorBoundary>
				<div className="App">
					<Routes>
						<Route path="/" element={<Home />} />
						<Route path="/login" element={<Login />} />
						<Route path="/signup" element={<Signup />} />
						<Route path="/feed" element={<PrivateRoute element={<FeedPage />} />} />
						<Route path="*" element={<Navigate to="/" />} />
					</Routes>
				</div>
			</ErrorBoundary>
		</Router>
	);
}

export default App;
