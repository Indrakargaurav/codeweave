import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginSuccess() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    console.log('✅ LoginSuccess.jsx mounted');

    const params = new URLSearchParams(window.location.search);
    const ownerId = params.get('ownerId');
    const name = params.get('name');
    const email = params.get('email');

    console.log('🔐 Extracted OAuth data:', { ownerId, name, email });

    if (ownerId && name && email) {
      // ✅ Save user data with ownerId
      const userData = { ownerId, name, email };
      login(userData);
      console.log('✅ User data saved to localStorage');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } else {
      navigate('/login');
    }
  }, [navigate, login]);

  return (
    <div style={{ color: 'white', textAlign: 'center', marginTop: '3rem' }}>Logging you in...</div>
  );
}
