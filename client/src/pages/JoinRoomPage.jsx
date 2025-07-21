import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

export default function JoinRoomPage() {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If not logged in, redirect to login and come back after login
    if (!user || !user.ownerId) {
      localStorage.setItem('pendingJoinCode', joinCode);
      navigate('/login');
      return;
    }

    // Validate join code with backend
    const validateJoinCode = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:5000/api/room/join-by-code/${joinCode}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Invalid or expired join code');
        }
        // Redirect to the room
        navigate(`/room/${data.roomId}`);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    validateJoinCode();
  }, [user, joinCode, navigate]);

  return (
    <div style={{ color: 'white', textAlign: 'center', marginTop: '3rem' }}>
      {loading ? (
        <div>Joining room...</div>
      ) : error ? (
        <div>
          <div style={{ color: '#ff4d4f', marginBottom: 16 }}>Error: {error}</div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '0.7rem 1.5rem',
              borderRadius: 8,
              background: '#a4508b',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      ) : null}
    </div>
  );
}
