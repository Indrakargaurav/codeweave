import React, { useState } from 'react';
import '../styles/Dashboard.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RetrieveRooms from '../components/RetrieveRooms';
import { toast } from 'react-toastify';

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRetrieve, setShowRetrieve] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleRetrieve = () => {
    setShowRetrieve(true);
  };

  const handleCreateRoom = async () => {
    if (!user || !user.ownerId) {
      toast.error('You must be logged in to create a room.');
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/room/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ownerId: user.ownerId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create room');
      }

      const data = await res.json();
      const roomId = data.roomId;

      // ✅ Navigate to the editor room
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error('❌ Error creating room:', err.message);
      toast.error('Something went wrong while creating room.');
    }
  };

  const handleJoin = () => {
    setShowJoinModal(true);
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Please enter a join code.');
      return;
    }
    setJoinLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/room/join-by-code/${joinCode.trim()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired join code');
      }
      setShowJoinModal(false);
      setJoinCode('');
      navigate(`/room/${data.roomId}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-bg" style={{ backgroundImage: "url('/images/one.jpg')" }} />
      <div className="dashboard-container">
        {/* Navbar */}
        <nav className="dashboard-navbar">
          <div className="dashboard-logo">CODEWEAVE</div>
          <div className={`dashboard-links ${menuOpen ? 'open' : ''}`}>
            <a href="#" onClick={handleCreateRoom}>
              🚀 Create
            </a>
            <a href="#" onClick={handleJoin}>
              🔗 Join
            </a>
            <a href="#" onClick={handleRetrieve}>
              📂 Retrieve
            </a>
            <a href="#" onClick={() => setShowAbout(true)}>
              ℹ️ About
            </a>
            <a href="#" onClick={handleLogout}>
              🚪 Logout
            </a>
          </div>
          <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </div>
        </nav>

        {/* Main Content */}
        <div className="dashboard-content">
          <div className="dashboard-description">
            <h2 className="welcome-message">
              Welcome,{' '}
              {user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : 'User'} ! 👋
            </h2>
            <p className="description-highlight">
              <strong>🚀 Experience the Future of Collaborative Coding</strong>
            </p>
            <p className="dashboard-desc-paragraph">
              <span style={{ fontWeight: 600, color: '#a4508b' }}>CodeWeave</span> is your
              next-generation platform for{' '}
              <span style={{ fontWeight: 600, color: '#5f0a87' }}>
                real-time code collaboration
              </span>
              .<br />
              Effortlessly sync, edit, and run code with your team—instantly. <br />
              <span style={{ color: '#00bcd4' }}>
                Futuristic design. Lightning-fast execution. Seamless teamwork.
              </span>
            </p>
            <p className="dashboard-desc-paragraph">
              <span style={{ fontWeight: 600, color: '#5f0a87' }}>
                ⚡ Lightning-Fast Execution:
              </span>{' '}
              Run JavaScript, Python, Java, C++, and Rust code directly in your browser with AWS
              Lambda-powered execution. Get instant feedback, debug together, and see results in
              real-time.
              <br />
              <span style={{ fontWeight: 600, color: '#00bcd4' }}>
                🔒 Enterprise-Grade Security:
              </span>{' '}
              Your code is encrypted, your sessions are private, and your data is protected with
              industry-standard security protocols.
            </p>
            <p className="dashboard-desc-paragraph">
              <span style={{ fontWeight: 600, color: '#a4508b' }}>🎯 Perfect for:</span> Technical
              interviews, pair programming, code reviews, remote team collaboration, educational
              sessions, and live coding streams. Whether you're mentoring a junior developer or
              leading a complex project, CodeWeave adapts to your workflow with intelligent
              auto-save, version control, and seamless room sharing.
            </p>
          </div>

          <div className="dashboard-features">
            <h3>Dashboard Options</h3>
            <ul>
              <li onClick={handleCreateRoom}>
                <strong>🚀 Create</strong>
                Start a new code collaboration room and invite others to join your coding session.
              </li>
              <li>
                <strong>🔗 Join</strong>
                Enter an existing room using an invite link or room ID to collaborate with others.
              </li>
              <li onClick={handleRetrieve}>
                <strong>📂 Retrieve</strong>
                View and access your previously created or joined rooms with all your saved work.
              </li>
              <li>
                <strong>ℹ️ About</strong>
                Learn more about CodeWeave, its mission, features, and future roadmap.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Retrieve Rooms Modal */}
      {showRetrieve && <RetrieveRooms onClose={() => setShowRetrieve(false)} />}
      {showJoinModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#181c26',
              borderRadius: 16,
              padding: '2rem 2.5rem',
              minWidth: 320,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              color: '#fff',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowJoinModal(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 22,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
            <h2 style={{ marginBottom: 16 }}>Join Room</h2>
            <form onSubmit={handleJoinSubmit}>
              <input
                type="text"
                placeholder="Enter join code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  borderRadius: 8,
                  border: '1px solid #333',
                  marginBottom: 16,
                  fontSize: 16,
                }}
                autoFocus
              />
              <button
                type="submit"
                disabled={joinLoading}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  borderRadius: 8,
                  background: '#a4508b',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 16,
                  border: 'none',
                  cursor: joinLoading ? 'not-allowed' : 'pointer',
                  opacity: joinLoading ? 0.7 : 1,
                }}
              >
                {joinLoading ? 'Joining...' : 'Join'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* About Modal */}
      {showAbout && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#18181b', // deep charcoal
              borderRadius: 22,
              padding: '2.5rem 2.5rem 2rem 2.5rem',
              minWidth: 340,
              maxWidth: 720,
              width: '98vw',
              maxHeight: '92vh',
              boxShadow: '0 8px 32px rgba(0,0,0,0.32)',
              color: '#f5f5f5',
              position: 'relative',
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: 18,
              lineHeight: 1.7,
              overflowY: 'auto',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              border: '2px solid #c2883a', // gold/copper accent
              scrollbarColor: '#c2883a #232323',
              scrollbarWidth: 'thin',
            }}
            className="about-modal-scroll"
          >
            <style>{`
              .about-modal-scroll::-webkit-scrollbar { width: 10px; background: #232323; }
              .about-modal-scroll::-webkit-scrollbar-thumb { background: #c2883a; border-radius: 8px; }
            `}</style>
            <button
              onClick={() => setShowAbout(false)}
              style={{
                position: 'absolute',
                top: 14,
                right: 18,
                background: 'none',
                border: 'none',
                color: '#c2883a',
                fontSize: 28,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ×
            </button>
            <h2
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: '#c2883a',
                marginBottom: 12,
                fontFamily: 'inherit',
                letterSpacing: 1,
              }}
            >
              About CodeWeave
            </h2>
            <p style={{ marginBottom: 18 }}>
              CodeWeave is a powerful, real-time collaborative code editor designed for seamless
              multi-user programming sessions. Whether you're working on a coding project with
              teammates, teaching a class, or pair programming remotely, CodeWeave offers a clean,
              intuitive interface with multi-language support, real-time synchronization, in-browser
              code execution, and versioned file storage — all in a secure, room-based environment.
            </p>
            <div style={{ marginBottom: 18 }}>
              <h3
                style={{
                  fontSize: 22,
                  color: '#c2883a',
                  marginBottom: 8,
                  fontFamily: 'inherit',
                  letterSpacing: 0.5,
                }}
              >
                🚀 Key Features:
              </h3>
              <ul
                style={{
                  fontSize: 17,
                  lineHeight: 1.6,
                  paddingLeft: 24,
                  marginBottom: 0,
                  fontFamily: 'inherit',
                }}
              >
                <li>🔄 Real-time Collaboration using WebSockets</li>
                <li>📝 Multi-language Code Execution via AWS Lambda</li>
                <li>🗃️ Structured File Tree with support for multiple files per room</li>
                <li>☁️ Auto-saving and Versioned File Storage using AWS S3</li>
                <li>🔒 Room-based Access Control (only owners can shut/share a room)</li>
                <li>💬 In-room Chat for developer communication</li>
                <li>🌐 Scalable Full-stack Architecture (React + Node.js + MongoDB + AWS)</li>
              </ul>
            </div>
            <p style={{ marginBottom: 20 }}>
              From students to professionals, CodeWeave simplifies collaborative coding with a
              modern, cloud-native stack and a strong emphasis on real-time productivity.
            </p>
            <div style={{ borderTop: '1.5px solid #232323', margin: '32px 0 18px 0' }} />
            <h3
              style={{
                fontSize: 22,
                color: '#c2883a',
                marginBottom: 8,
                fontFamily: 'inherit',
                letterSpacing: 0.5,
              }}
            >
              Meet the Developer
            </h3>
            <p style={{ marginBottom: 10 }}>
              <b>Gaurav Indrakar</b> is a passionate full-stack developer and aspiring technologist
              focused on creating tools that enhance creativity, learning, and collaboration.
              Inspired by pioneers like Steve Jobs and Sam Altman, he aims to build high-impact
              platforms with long-term vision.
            </p>
            <p style={{ marginBottom: 10 }}>
              CodeWeave is Gaurav’s solo full-stack project — architected, developed, and deployed
              independently. From real-time WebSocket integration to Lambda-based code execution and
              S3-powered versioning, this project is a testament to his ability to combine deep
              technical skill with thoughtful product design.
            </p>
            <div style={{ marginBottom: 10 }}>
              <span style={{ color: '#c2883a', fontWeight: 600 }}>🔗 Connect with Gaurav:</span>
              <br />
              <a
                href="https://github.com/Indrakargaurav"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#f5f5f5',
                  textDecoration: 'underline',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              >
                GitHub: github.com/Indrakargaurav
              </a>
              <br />
              <a
                href="https://linkedin.com/in/gaurav-indrakar-3a049a332"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#f5f5f5',
                  textDecoration: 'underline',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              >
                LinkedIn: linkedin.com/in/gaurav-indrakar-3a049a332
              </a>
              <br />
              <a
                href="mailto:gauravindrakar@gmail.com"
                style={{
                  color: '#f5f5f5',
                  textDecoration: 'underline',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              >
                Email: gauravindrakar@gmail.com
              </a>
            </div>
            <p style={{ marginBottom: 0 }}>
              He is currently exploring DevOps, AI, and decentralized identity technologies — always
              on the lookout for moonshot opportunities to make a meaningful impact.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
