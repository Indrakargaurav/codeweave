import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';
import { toast } from 'react-toastify';

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && user.ownerId) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        return;
      }
      login(data.user);
      // Check for pending join code
      const pendingJoinCode = localStorage.getItem('pendingJoinCode');
      if (pendingJoinCode) {
        localStorage.removeItem('pendingJoinCode');
        navigate(`/join/${pendingJoinCode}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('❌ Login error:', err.message);
      toast.error('Something went wrong during login.');
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
            <h2 className="auth-title">🚀 Welcome Back</h2>
            <p className="auth-subtitle">Ready to code together? Let's get you back in the game!</p>
          </div>
          <form onSubmit={handleLogin} className="auth-form">
            <div className="input-group">
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="input-icon">📧</span>
            </div>
            <div className="input-group">
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="input-icon">🔒</span>
            </div>
            <button
              type="submit"
              className={`auth-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? '🔄 Logging in...' : '🚀 Login'}
            </button>
          </form>
          <div className="auth-divider">
            <span className="divider-text">— or continue with —</span>
          </div>
          <div className="social-login">
            <div
              className="social-icon google"
              onClick={() => handleOAuthLogin('google')}
              title="Login with Google"
            >
              <img src="/images/google.png" alt="Google" />
            </div>
            <div
              className="social-icon github"
              onClick={() => handleOAuthLogin('github')}
              title="Login with GitHub"
            >
              <img src="/images/github.png" alt="GitHub" />
            </div>
            <div
              className="social-icon linkedin"
              onClick={() => handleOAuthLogin('linkedin')}
              title="Login with LinkedIn"
            >
              <img src="/images/linkedin.png" alt="LinkedIn" />
            </div>
          </div>
          <div className="auth-footer">
            <p className="auth-link-text">
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
