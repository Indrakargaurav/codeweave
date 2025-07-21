import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';
import { toast } from 'react-toastify';

export default function Register() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && user.ownerId) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      toast.success('Registration successful! Please login to continue.');
      navigate('/login');
    } catch (err) {
      console.error('❌ Registration error:', err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    window.location.href = `${process.env.REACT_APP_API_BASE_URL}/auth/${provider}`;
  };

  return (
    <div className="auth-bg" style={{ backgroundImage: "url('/images/logreg.jpg')" }}>
      <div className="auth-center-container">
        <div className="auth-card">
          <div className="auth-logo">CODEWEAVE</div>
          <div className="auth-header">
            <h2 className="auth-title">🌟 Join CodeWeave</h2>
            <p className="auth-subtitle">Start your collaborative coding journey today!</p>
          </div>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <input
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                className="auth-input"
                required
              />
              <span className="input-icon">👤</span>
            </div>
            <div className="input-group">
              <input
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="auth-input"
                required
              />
              <span className="input-icon">📧</span>
            </div>
            <div className="input-group">
              <input
                name="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                className="auth-input"
                required
              />
              <span className="input-icon">🔒</span>
            </div>
            <div className="input-group">
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="auth-input"
                required
              />
              <span className="input-icon">✅</span>
            </div>
            <button
              type="submit"
              className={`auth-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? '🔄 Creating Account...' : '🚀 Create Account'}
            </button>
          </form>
          <div className="auth-divider">
            <span className="divider-text">— or continue with —</span>
          </div>
          <div className="social-login">
            <div
              className="social-icon google"
              onClick={() => handleOAuthLogin('google')}
              title="Register with Google"
            >
              <img src="/images/google.png" alt="Google" />
            </div>
            <div
              className="social-icon linkedin"
              onClick={() => handleOAuthLogin('linkedin')}
              title="Register with LinkedIn"
            >
              <img src="/images/linkedin.png" alt="LinkedIn" />
            </div>
            <div
              className="social-icon github"
              onClick={() => handleOAuthLogin('github')}
              title="Register with GitHub"
            >
              <img src="/images/github.png" alt="GitHub" />
            </div>
          </div>
          <div className="auth-footer">
            <p className="auth-link-text">
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
