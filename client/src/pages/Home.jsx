// src/pages/Home.jsx
import React from 'react';
import '../styles/Home.css';

export default function Home() {
  return (
    <div className="home-background" style={{ backgroundImage: "url('/images/laptop.jpg')" }}>
      <div className="home-content">
        <p className="home-welcome">WELCOME TO</p>
        <h1 className="home-title">CODEWEAVE</h1>
        <p className="home-tagline">
          An innovative platform for real-time collaborative code editing
        </p>
        <p className="home-description">
          Experience seamless teamwork and enhanced productivity with our cutting-edge tools.
        </p>
        <div className="home-buttons">
          <a href="/login" className="home-cta">
            Login
          </a>
          <a href="/register" className="home-cta">
            Register
          </a>
        </div>
      </div>
    </div>
  );
}
