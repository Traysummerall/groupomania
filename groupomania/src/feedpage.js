import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './feedpage.css';

function FeedPage() {
	const [photos, setPhotos] = useState([]);
	const [selectedFile, setSelectedFile] = useState(null);
	const [text, setText] = useState('');
	const [showMenu, setShowMenu] = useState(false);
	const [username, setUsername] = useState('');
	const [showAvatarPopup, setShowAvatarPopup] = useState(false);
	const [avatar, setAvatar] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		const token = localStorage.getItem('token');
		if (!token) {
			console.log('No token found, redirecting to login');
			navigate('/login');
			return;
		}

		// Fetch user data including username and avatar URL
		fetch('/api/auth/user', {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
			.then((response) => response.json())
			.then((data) => {
				console.log('Fetched user data:', data);
				setUsername(data.username || 'Anonymous');
				setAvatar(data.avatarUrl || null);
			})
			.catch((error) => console.error('Error fetching user data:', error));

		// Fetch photos
		fetch('/api/photos', {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
			.then((response) => response.json())
			.then((data) => {
				console.log('Fetched photos:', data);
				setPhotos(data);
			})
			.catch((error) => console.error('Fetch error:', error));
	}, [navigate]);

	const handleFileChange = (event) => {
		console.log('File selected:', event.target.files[0]);
		setSelectedFile(event.target.files[0]);
	};

	const handleTextChange = (event) => {
		console.log('Text input changed:', event.target.value);
		setText(event.target.value);
	};

	const handleUpload = () => {
		if (!selectedFile && !text) {
			console.log('No file or text input to upload');
			return;
		}

		const formData = new FormData();
		if (selectedFile) {
			formData.append('photo', selectedFile);
			console.log('Selected file:', selectedFile);
		}
		if (text) {
			formData.append('text', text);
			console.log('Text input:', text);
		}

		const token = localStorage.getItem('token');
		console.log('Uploading photo/text with token:', token);

		fetch('/api/photos/upload', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
			},
			body: formData,
		})
			.then((response) => {
				if (!response.ok) {
					return response.json().then((data) => {
						if (data.message === 'Token expired') {
							alert('Session expired. Please log in again.');
							localStorage.removeItem('token');
							navigate('/login');
							throw new Error(`Token expired at ${data.expiredAt}`);
						}
						throw new Error(`Network response was not ok: ${response.status} - ${data.message}`);
					});
				}
				return response.json();
			})
			.then((data) => {
				console.log('Uploaded photo/text:', data);
				if (data.id) {
					const newPhoto = {
						id: data.id,
						url: data.url || (data.image_data ? `data:image/png;base64,${data.image_data}` : ''),
						text: data.text || '',
						username: data.username || username,
						avatarUrl: data.avatarUrl || avatar,
					};
					console.log('New photo data:', newPhoto);
					setPhotos((prevPhotos) => [newPhoto, ...prevPhotos]);
					setSelectedFile(null);
					setText('');
				} else {
					console.error('Upload failed:', data.message);
				}
			})
			.catch((error) => console.error('Upload error:', error));
	};

	const handleAvatarChange = (event) => {
		const file = event.target.files[0];
		if (file) {
			const formData = new FormData();
			formData.append('avatar', file);

			fetch('/api/auth/upload-avatar', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${localStorage.getItem('token')}`,
				},
				body: formData,
			})
				.then((response) => {
					if (!response.ok) {
						throw new Error('Failed to upload avatar');
					}
					return response.json();
				})
				.then((data) => {
					console.log('Avatar uploaded successfully:', data);
					setAvatar(data.avatar); // Use the base64 string directly
				})
				.catch((error) => console.error('Avatar upload error:', error));
		}
	};

	const handleLogout = () => {
		const token = localStorage.getItem('token');
		const refreshToken = localStorage.getItem('refreshToken'); // Get refresh token from localStorage
		if (!token) {
			console.error('No access token found during logout');
			navigate('/login');
			return;
		}

		fetch('/api/auth/logout', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ refreshToken }), // Sending the refresh token
		})
			.then((response) => {
				if (response.ok) {
					console.log('Logout successful');
					localStorage.removeItem('token');
					localStorage.removeItem('refreshToken'); // Clear the refresh token as well
					navigate('/login');
				} else {
					return response.json().then((data) => {
						console.error('Logout failed:', response.statusText, data);
					});
				}
			})
			.catch((error) => console.error('Logout error:', error));
	};

	const handleDeleteAccount = () => {
		fetch('/api/auth/delete-account', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${localStorage.getItem('token')}`,
			},
		})
			.then((response) => {
				if (response.ok) {
					console.log('Account deleted successfully');
					localStorage.removeItem('token');
					navigate('/signup');
				} else {
					console.error('Account deletion failed:', response.statusText);
				}
			})
			.catch((error) => console.error('Account deletion error:', error));
	};

	return (
		<div className="feed-page">
			<div className="menu-dropdown">
				<button onClick={() => setShowMenu(!showMenu)} className="menu-button">
					Menu
				</button>
				{showMenu && (
					<div className="menu">
						<button onClick={() => setShowAvatarPopup(true)} className="menu-item">
							Edit Avatar
						</button>
						<button onClick={handleLogout} className="menu-item">
							Logout
						</button>
						<button onClick={handleDeleteAccount} className="menu-item delete-account">
							Delete Account
						</button>
					</div>
				)}
			</div>

			{showAvatarPopup && (
				<div className="avatar-popup">
					<div className="avatar-popup-content">
						<span className="avatar-popup-close" onClick={() => setShowAvatarPopup(false)}>
							&times;
						</span>
						<h3>Upload Your Avatar</h3>
						<input type="file" onChange={handleAvatarChange} accept="image/*" />
					</div>
					<div className="overlay" onClick={() => setShowAvatarPopup(false)}></div>
				</div>
			)}

			<div className="upload-section">
				<input type="file" onChange={handleFileChange} />
				<input
					type="text"
					value={text}
					onChange={handleTextChange}
					placeholder="Write something..."
				/>
				<button onClick={handleUpload} disabled={!selectedFile && !text}>
					Add Photo/Text
				</button>
			</div>

			<div className="photo-list">
				{photos.length > 0 ? (
					photos.map((photo) => (
						<PhotoCard
							key={photo.id}
							id={photo.id}
							url={
								photo.url || (photo.image_data ? `data:image/png;base64,${photo.image_data}` : '')
							}
							text={photo.text || ''}
							likes={photo.likes}
							comments={Array.isArray(photo.comments) ? photo.comments : []}
							photoPosterUsername={photo.username || 'Anonymous'}
							loggedInUsername={username}
							avatar={photo.avatarUrl || avatar}
						/>
					))
				) : (
					<p>No photos to display.</p>
				)}
			</div>
		</div>
	);
}

function PhotoCard({
	id,
	url,
	text,
	likes,
	comments = [],
	photoPosterUsername,
	loggedInUsername,
	avatar,
}) {
	const [commentsList, setCommentsList] = useState([]);
	const [likeCount, setLikeCount] = useState(likes || 0);
	const [liked, setLiked] = useState(false);
	const [newComment, setNewComment] = useState('');

	useEffect(() => {
		setCommentsList(comments);
	}, [comments]);

	const handleNewComment = () => {
		if (newComment.trim()) {
			const token = localStorage.getItem('token');
			fetch(`/api/photos/${id}/comments`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ text: newComment }),
			})
				.then((response) => {
					if (!response.ok) {
						throw new Error('Comment submission failed');
					}
					return response.json();
				})
				.then((data) => {
					setCommentsList((prevComments) => [
						...prevComments,
						{ ...data, username: loggedInUsername },
					]);
					setNewComment('');
					console.log('Comment added:', data);
				})
				.catch((error) => console.error('Comment error:', error));
		}
	};

	const handleLike = () => {
		const token = localStorage.getItem('token');
		fetch(`/api/photos/${id}/likes`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error('Failed to like photo');
				}
				return response.json();
			})
			.then(() => {
				setLiked(true);
				setLikeCount((prevCount) => prevCount + 1);
				console.log('Photo liked');
			})
			.catch((error) => console.error('Like error:', error));
	};

	return (
		<div className="photo-card">
			<div className="photo-header">
				<div className="avatar-container">
					{avatar ? (
						<img src={avatar} alt="Avatar" className="avatar-image" />
					) : (
						<div className="avatar-placeholder">No Avatar</div>
					)}
				</div>
				<span className="username">{photoPosterUsername}</span>
			</div>
			{url && <img src={url} alt="User's post" className="photo" />}
			<p>{text}</p>
			<div className="like-button" onClick={handleLike}>
				<span className={`heart-icon ${liked ? 'liked' : ''}`}></span> {likeCount || ''}
			</div>
			<div className="comments-section">
				{commentsList.map((comment, index) => (
					<div key={index} className="comment">
						<strong>{comment.username}: </strong>
						<span>{comment.text}</span>
					</div>
				))}
				<div className="comment-form">
					<input
						type="text"
						value={newComment}
						onChange={(e) => setNewComment(e.target.value)}
						placeholder="Add a comment"
					/>
					<button onClick={handleNewComment}>Submit</button>
				</div>
			</div>
		</div>
	);
}

export default FeedPage;
