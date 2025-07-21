const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
console.log('🔗 API_BASE_URL:', API_BASE_URL);

// Create a new room
export const createRoom = async (ownerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/room/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ownerId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};

// Shut down a room
export const shutdownRoom = async (roomId, ownerId, files) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/shutdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ownerId, files }),
    });

    if (!response.ok) {
      throw new Error('Failed to shutdown room');
    }

    return await response.json();
  } catch (error) {
    console.error('Error shutting down room:', error);
    throw error;
  }
};

// Get room info
export const getRoomInfo = async (roomId, ownerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/info?ownerId=${ownerId}`);

    if (!response.ok) {
      throw new Error('Failed to get room info');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting room info:', error);
    throw error;
  }
};

// Get room files
export const getRoomFiles = async (roomId, ownerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/files?ownerId=${ownerId}`);

    if (!response.ok) {
      throw new Error('Failed to get room files');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting room files:', error);
    throw error;
  }
};

// Get user rooms
export const getUserRooms = async (ownerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/room/user/${ownerId}`);

    if (!response.ok) {
      throw new Error('Failed to get user rooms');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting user rooms:', error);
    throw error;
  }
};

// Update room timestamp
export const updateRoomTimestamp = async (roomId, ownerId) => {
  try {
    console.log(
      `📡 Making API call to update timestamp: ${API_BASE_URL}/api/room/${roomId}/update-timestamp`
    );
    console.log(`📤 Request body:`, { ownerId });

    const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/update-timestamp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ownerId }),
    });

    console.log(`📥 Response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      throw new Error(`Failed to update room timestamp: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ API Response:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error updating room timestamp:', error);
    throw error;
  }
};

// Export room files
export const exportRoomFiles = async (roomId, ownerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/export?ownerId=${ownerId}`);

    if (!response.ok) {
      throw new Error('Failed to export room files');
    }

    // Get the blob from the response
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room-${roomId}-export.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true };
  } catch (error) {
    console.error('Error exporting room files:', error);
    throw error;
  }
};
