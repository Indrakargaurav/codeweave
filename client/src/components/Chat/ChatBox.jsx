import React, { useState, useEffect, useRef } from 'react';
import socket from '../../socket';
import { useAuth } from '../../contexts/AuthContext';

const ChatBox = ({ roomId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    // Listen for incoming messages
    const handleMessage = (msg) => {
      setMessages((prev) => {
        if (
          !prev.some(
            (m) => m.timestamp === msg.timestamp && m.user === msg.user && m.text === msg.text
          )
        ) {
          return [...prev, msg];
        }
        return prev;
      });
    };
    socket.on('chat-message', handleMessage);
    return () => {
      socket.off('chat-message', handleMessage);
    };
  }, [roomId]);

  useEffect(() => {
    // Scroll to bottom on new message
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = {
      roomId,
      user: user?.name || user?.email || 'User',
      text: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]); // Show your own message immediately
    socket.emit('chat-message', msg);
    setInput('');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 220,
        background: '#181c26',
        borderTop: '1px solid #333',
        borderBottomLeftRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.12)',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #222',
          fontWeight: 600,
          color: '#a4508b',
          fontSize: 15,
        }}
      >
        💬 Group Chat
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          background: '#20232a',
          scrollbarColor: '#444 #23272f',
          scrollbarWidth: 'thin',
        }}
        className="chatbox-messages-scroll"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.self ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                background: msg.self ? 'linear-gradient(90deg,#a4508b,#5f0a87)' : '#252526',
                color: msg.self ? '#fff' : '#eee',
                borderRadius: 12,
                padding: '6px 14px',
                maxWidth: 180,
                fontSize: 14,
                boxShadow: msg.self ? '0 2px 8px rgba(164,80,139,0.08)' : 'none',
                wordBreak: 'break-word',
              }}
            >
              {msg.text}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2, marginLeft: 2 }}>
              {msg.self ? 'You' : msg.user} ·{' '}
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSend}
        style={{ display: 'flex', borderTop: '1px solid #222', background: '#181c26', padding: 8 }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{
            width: '60%',
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: '#23272f',
            color: '#fff',
            borderRadius: 8,
            padding: '7px 12px',
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          style={{
            marginLeft: 8,
            width: 40,
            background: 'linear-gradient(90deg,#a4508b,#5f0a87)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '7px 0',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
