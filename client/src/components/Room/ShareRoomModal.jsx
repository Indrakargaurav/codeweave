import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export default function ShareRoomModal({ roomId, ownerId, onClose }) {
  const [joinCode, setJoinCode] = useState('');
  const [expiresIn, setExpiresIn] = useState(600);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchJoinCode() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:5000/api/room/${roomId}/generate-join-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerId }),
        });
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || 'Failed to generate join code');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setJoinCode(data.joinCode);
        setExpiresIn(data.expiresIn);
        setLoading(false);
      } catch (err) {
        setError('Failed to generate join code');
        setLoading(false);
      }
    }
    fetchJoinCode();
  }, [roomId, ownerId]);

  useEffect(() => {
    if (!joinCode) return;
    const interval = setInterval(() => {
      setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [joinCode]);

  const joinLink = `${window.location.origin}/join/${joinCode}`;

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 10000,
        background: 'rgba(0,0,0,0.25)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: 350,
          padding: 22,
          borderRadius: 14,
          background: 'rgba(35,39,47,0.92)',
          color: '#fff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          border: '1.5px solid #444',
          position: 'relative',
          margin: '0 auto',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 16,
            fontSize: 22,
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            opacity: 0.7,
          }}
        >
          ×
        </button>
        <h3
          style={{
            margin: '0 0 18px 0',
            fontWeight: 700,
            fontSize: 20,
            textAlign: 'center',
            letterSpacing: 1,
          }}
        >
          Share Room
        </h3>
        {loading ? (
          <p>Generating join code...</p>
        ) : error ? (
          <p style={{ color: '#ff6b6b' }}>{error}</p>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Join Link</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  value={joinLink}
                  readOnly
                  style={{
                    flex: 1,
                    padding: 5,
                    borderRadius: 6,
                    border: '1px solid #444',
                    background: '#181c26',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
                <button
                  onClick={() => handleCopy(joinLink, 'Link')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#d72660',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Special Code</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  value={joinCode}
                  readOnly
                  style={{
                    flex: 1,
                    padding: 5,
                    borderRadius: 6,
                    border: '1px solid #444',
                    background: '#181c26',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
                <button
                  onClick={() => handleCopy(joinCode, 'Code')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#a83232',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
            <div style={{ color: '#ccc', fontSize: 13, marginBottom: 6, textAlign: 'center' }}>
              <span>Expires in: </span>
              <span style={{ color: expiresIn < 30 ? '#ff6b6b' : '#d72660', fontWeight: 600 }}>
                {Math.floor(expiresIn / 60)}:{(expiresIn % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div style={{ color: '#888', fontSize: 12, textAlign: 'center' }}>
              Share this link or code with collaborators. They must be logged in to join.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
