import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function RetrieveRooms({ onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    if (user && user.ownerId) {
      fetchUserRooms();
    }
  }, [user, refreshKey]);

  // Auto-refresh when component becomes visible (when user returns from room)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && user.ownerId) {
        console.log('🔄 Auto-refreshing room list (page became visible)');
        fetchUserRooms();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also refresh when window gains focus
    const handleFocus = () => {
      if (user && user.ownerId) {
        console.log('🔄 Auto-refreshing room list (window gained focus)');
        fetchUserRooms();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const fetchUserRooms = async () => {
    try {
      console.log('📥 Fetching user rooms...');
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/room/user/${user.ownerId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      console.log('📋 Received rooms:', data.rooms);
      data.rooms.forEach((room) => {
        console.log(`   Room ${room.roomId}: updatedAt = ${room.updatedAt}`);
      });

      setRooms(data.rooms);
      setLastRefresh(new Date());
      console.log('✅ Room list updated');
    } catch (err) {
      console.error('❌ Error fetching rooms:', err);
      setError('Failed to load your rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRoom = (roomId) => {
    navigate(`/room/${roomId}`);
    onClose();
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    fetchUserRooms();
  };

  const handleExportRoom = async (roomId, roomName) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/room/${roomId}/export?ownerId=${user.ownerId}`
      );

      if (!response.ok) {
        const error = await response.json();
        toast.error(`❌ Export failed: ${error.error}`);
        return;
      }

      // Create blob from ZIP data
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${roomName || `room-${roomId}`}-folder.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ Room folder exported successfully');
      toast.success('✅ Room folder downloaded! Extract the ZIP to get your project files.');
    } catch (err) {
      console.error('Error exporting room:', err);
      toast.error('❌ Failed to export room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.'))
      return;
    try {
      const response = await fetch(
        `http://localhost:5000/api/room/${roomId}?ownerId=${user.ownerId}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) {
        const error = await response.json();
        toast.error(`❌ Delete failed: ${error.error}`);
        return;
      }
      setRooms((prevRooms) => prevRooms.filter((room) => room.roomId !== roomId));
      toast.success('✅ Room deleted successfully!');
    } catch (err) {
      console.error('Error deleting room:', err);
      toast.error('❌ Failed to delete room');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="retrieve-modal">
        <div className="retrieve-content">
          <h2>Your Rooms</h2>
          <p>Loading your rooms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="retrieve-modal">
        <div className="retrieve-content">
          <h2>Your Rooms</h2>
          <p style={{ color: '#ff6b6b' }}>{error}</p>
          <button onClick={fetchUserRooms}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="retrieve-modal">
      <div className="retrieve-content">
        <div className="retrieve-header">
          <div className="header-left">
            <h2>Your Rooms</h2>
            {lastRefresh && (
              <p className="last-refresh">Last updated: {lastRefresh.toLocaleTimeString()}</p>
            )}
          </div>
          <div className="header-actions">
            <button onClick={handleRefresh} className="refresh-btn" title="Refresh rooms">
              🔄
            </button>
            <button onClick={onClose} className="close-btn">
              ×
            </button>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="no-rooms">
            <p>You haven't created any rooms yet.</p>
            <p>Create your first room to get started!</p>
          </div>
        ) : (
          <div className="rooms-list">
            {rooms.map((room) => (
              <div key={room.roomId} className="room-item">
                <div className="room-info">
                  <h3>Room: {room.roomId.slice(0, 8)}...</h3>
                  <p>Created: {formatDate(room.createdAt)}</p>
                  <p>Last Updated: {formatDate(room.updatedAt)}</p>
                  <p>Status: {room.isActive ? '🟢 Active' : '🔴 Shut Down'}</p>
                  {room.metadata && (
                    <div className="room-metadata">
                      <span>Files: {room.metadata.fileCount || 0}</span>
                      <span>Size: {room.metadata.totalSizeKB || 0} KB</span>
                      {room.metadata.fileTypes && room.metadata.fileTypes.length > 0 && (
                        <span>Types: {room.metadata.fileTypes.join(', ')}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="room-actions">
                  {room.isActive ? (
                    <button onClick={() => handleOpenRoom(room.roomId)} className="open-btn">
                      🔗 Open
                    </button>
                  ) : (
                    <>
                      <button onClick={() => handleOpenRoom(room.roomId)} className="open-btn">
                        🔗 Open
                      </button>
                      <button
                        onClick={() => handleExportRoom(room.roomId, `room-${room.roomId}`)}
                        className="export-btn"
                      >
                        📦 Export
                      </button>
                      <button onClick={() => handleDeleteRoom(room.roomId)} className="delete-btn">
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
