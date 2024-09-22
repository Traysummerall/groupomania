// Home.js
import React from 'react';
import './Home.css'; // Ensure this path is correct

const Home = () => {
	return (
		<div className="home-container">
			<img src="/title.png" alt="Title" className="title-image" />
			<div className="link-box">
				<a href="/login">Login</a>
				<a href="/Signup">Sign Up</a>
			</div>
		</div>
	);
};

export default Home;
