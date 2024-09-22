// index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Make sure this matches the exported component
import './index.css'; // Optional, if you have global styles

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
