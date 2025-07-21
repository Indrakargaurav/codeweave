const express = require('express');
const router = express.Router();
const { Room } = require('../models/mongoschema');
const { v4: uuidv4 } = require('uuid');
const {
  uploadRoomFilesToS3,
  downloadRoomFilesFromS3,
  downloadRoomFolderForExport,
  createExportZip,
  deleteRoomFromS3,
} = require('../utils/s3');
const { createFolderZip } = require('../utils/folderExport');
const crypto = require('crypto');
const redis = require('redis');
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);
// const JSZip = require('jszip'); // Uncomment after installing: npm install jszip

// ----------------------------
// @desc    Delete a room from MongoDB and S3
// @route   DELETE /room/:roomId
// @access  Public (requires ownerId in query)
// ----------------------------
router.delete('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { ownerId } = req.query;
    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' });
    }
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.roomOwnerId !== ownerId) {
      return res.status(403).json({ error: 'Only the room owner can delete it.' });
    }
    // Delete from S3
    await deleteRoomFromS3(roomId);
    // Delete from MongoDB
    await Room.deleteOne({ roomId });
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    console.error('Error deleting room:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------
// @desc    Create a new room
// @route   POST /room/create
// @access  Public (requires ownerId in body)
// ----------------------------
router.post('/create', async (req, res) => {
  try {
    const { ownerId } = req.body;

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' });
    }

    const roomId = uuidv4(); // ✅ Auto-generate a unique room ID
    const joinCode = crypto.randomBytes(6).toString('hex'); // 12-char secure code

    const newRoom = new Room({
      roomId,
      roomOwnerId: ownerId, // ✅ Use ownerId from request body
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      joinCode,
      metadata: {
        fileCount: 0,
        totalSizeKB: 0,
        fileTypes: [],
      },
    });

    await newRoom.save();
    res.status(201).json({
      message: 'Room created successfully',
      roomId: newRoom.roomId,
      joinCode: newRoom.joinCode,
      room: newRoom,
    });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------
// @desc    Shut down a room and store files in S3
// @route   POST /room/:roomId/shutdown
// @access  Public (requires ownerId in body)
// ----------------------------
router.post('/:roomId/shutdown', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { ownerId, files } = req.body;

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // ✅ Verify that the user's ownerId matches the room's roomOwnerId
    if (room.roomOwnerId !== ownerId) {
      return res.status(403).json({ error: 'Only the room owner can shut it down.' });
    }

    // ✅ Store files in S3 if provided - ONLY shutdown if S3 upload succeeds
    if (files) {
      try {
        await uploadRoomFilesToS3(roomId, files);
        console.log('✅ Files uploaded to S3 as individual files');
      } catch (s3Error) {
        console.error('❌ S3 upload error:', s3Error);
        return res.status(500).json({
          error: 'Failed to store files in S3. Room shutdown cancelled.',
          details: s3Error.message,
        });
      }
    }

    // ✅ Only update room metadata if S3 upload was successful
    const shutdownTime = new Date();
    console.log(`🕐 Setting shutdown time: ${shutdownTime.toISOString()}`);

    room.isActive = false;
    room.updatedAt = shutdownTime;
    room.s3Key = `rooms/${roomId}/`; // Store folder path instead of specific file
    room.metadata = {
      fileCount: files ? countFiles(files) : 0,
      totalSizeKB: files ? calculateFileSize(files) : 0,
      fileTypes: files ? getFileTypes(files) : [],
    };

    console.log(`💾 Saving room with updated timestamp: ${room.updatedAt.toISOString()}`);
    await room.save();
    console.log(`✅ Room saved successfully with timestamp: ${room.updatedAt.toISOString()}`);

    res.json({
      message: 'Room shut down successfully',
      room,
    });
  } catch (err) {
    console.error('Error shutting down room:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------
// @desc    Get room info and verify ownership
// @route   GET /room/:roomId/info
// @access  Public (requires ownerId in query)
// ----------------------------
router.get('/:roomId/info', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { ownerId } = req.query;

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const isOwner = room.roomOwnerId === ownerId;

    res.json({
      room,
      isOwner,
      canShutdown: isOwner,
    });
  } catch (err) {
    console.error('Error getting room info:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------
// @desc    Retrieve room files from S3
// @route   GET /room/:roomId/files
// @access  Public (requires ownerId in query)
// ----------------------------
router.get('/:roomId/files', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { ownerId } = req.query;

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.s3Key) {
      return res.status(404).json({ error: 'No files found for this room' });
    }

    // ✅ Download files from S3
    try {
      const fileTree = await downloadRoomFilesFromS3(roomId);
      res.json({
        message: 'Files retrieved successfully',
        files: fileTree,
        metadata: room.metadata,
        shutdownTime: room.updatedAt,
      });
    } catch (s3Error) {
      console.error('❌ S3 download error:', s3Error);
      res.status(500).json({ error: 'Failed to retrieve files from S3' });
    }
  } catch (err) {
    console.error('Error retrieving room files:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------
// @desc    Save room files to S3 (for periodic saving)
// @route   POST /room/:roomId/files
// @access  Public (requires ownerId in body)
// ----------------------------
router.post('/:roomId/files', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { ownerId, files } = req.body;

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify that the user's ownerId matches the room's roomOwnerId
    if (room.roomOwnerId !== ownerId) {
      return res.status(403).json({ error: 'Only the room owner can save files.' });
    }

    // Store files in S3
    if (files) {
      try {
        await uploadRoomFilesToS3(roomId, files);
        console.log('✅ Files saved to S3 for room:', roomId);
      } catch (s3Error) {
        console.error('❌ S3 save error:', s3Error);
        return res.status(500).json({
          error: 'Failed to save files to S3',
          details: s3Error.message,
        });
      }
    }

    res.json({
      message: 'Files saved successfully',
    });
  } catch (err) {
    console.error('Error saving room files:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------
// @desc    Get all rooms created by a user
// @route   GET /room/user/:ownerId
// @access  Public
// ----------------------------
router.get('/user/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;

    const rooms = await Room.find({
      roomOwnerId: ownerId,
    }).sort({ createdAt: -1 }); // Most recent first

    console.log(`📋 Retrieved ${rooms.length} rooms for user ${ownerId}:`);
    rooms.forEach((room) => {
      console.log(
        `   Room ${room.roomId}: updatedAt = ${room.updatedAt.toISOString()}, isActive = ${room.isActive}`
      );
    });

    res.json({
      message: 'User rooms retrieved successfully',
      rooms: rooms,
    });
  } catch (err) {
    console.error('Error retrieving user rooms:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------
// @desc    Update room timestamp when changes are made
// @route   POST /room/:roomId/update-timestamp
// @access  Public (requires ownerId in body)
// ----------------------------
router.post('/:roomId/update-timestamp', async (req, res) => {
  try {
    console.log(`🕐 Timestamp update request received for room: ${req.params.roomId}`);
    console.log(`📤 Request body:`, req.body);

    const { roomId } = req.params;
    const { ownerId } = req.body;

    if (!ownerId) {
      console.log(`❌ Missing ownerId in request`);
      return res.status(400).json({ error: 'ownerId is required' });
    }

    console.log(`🔍 Looking for room: ${roomId}`);
    const room = await Room.findOne({ roomId });

    if (!room) {
      console.log(`❌ Room not found: ${roomId}`);
      return res.status(404).json({ error: 'Room not found' });
    }

    console.log(`✅ Room found: ${roomId}, current timestamp: ${room.updatedAt.toISOString()}`);

    // Update timestamp
    const oldTimestamp = room.updatedAt;
    room.updatedAt = new Date();
    await room.save();

    console.log(
      `🕐 Updated timestamp for room ${roomId}: ${oldTimestamp.toISOString()} → ${room.updatedAt.toISOString()}`
    );

    res.json({
      message: 'Room timestamp updated successfully',
      room,
    });
  } catch (err) {
    console.error('❌ Error updating room timestamp:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------
// @desc    Export room files as ZIP
// @route   GET /room/:roomId/export
// @access  Public (requires ownerId in query)
// ----------------------------
router.get('/:roomId/export', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { ownerId } = req.query;

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.s3Key) {
      return res.status(404).json({ error: 'No files found for this room' });
    }

    // ✅ Download entire folder from S3 and create ZIP
    try {
      console.log(`📥 Downloading entire folder for room ${roomId} export...`);

      // Download entire folder and create ZIP
      const zipBuffer = await downloadRoomFolderForExport(roomId);

      if (!zipBuffer) {
        return res.status(404).json({ error: 'No files found for this room' });
      }

      console.log(`✅ Export ZIP created, size: ${zipBuffer.length} bytes`);

      // Set headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="room-${roomId}-export.zip"`);
      res.setHeader('Content-Length', zipBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      console.log(`📤 Sending export ZIP...`);
      res.send(zipBuffer);
    } catch (s3Error) {
      console.error('❌ S3 download error:', s3Error);
      res.status(500).json({ error: 'Failed to retrieve files from S3' });
    }
  } catch (err) {
    console.error('Error exporting room files:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint for owner to generate a temporary join code
router.post('/:roomId/generate-join-code', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { ownerId } = req.body;
    if (!ownerId) return res.status(400).json({ error: 'ownerId is required' });
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.roomOwnerId !== ownerId)
      return res.status(403).json({ error: 'Only the room owner can generate a join code.' });
    // Generate secure code
    const joinCode = crypto.randomBytes(6).toString('hex');
    // Store in Redis with TTL (10 min)
    await redisClient.setEx(`joincode:${joinCode}`, 600, roomId);
    res.json({ joinCode, expiresIn: 600 });
  } catch (err) {
    console.error('Error generating join code:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET endpoint to join a room using a join code (for frontend GET requests)
router.get('/join-by-code/:joinCode', async (req, res) => {
  try {
    const { joinCode } = req.params;
    if (!joinCode) return res.status(400).json({ error: 'joinCode is required' });
    const roomId = await redisClient.get(`joincode:${joinCode}`);
    if (!roomId) return res.status(404).json({ error: 'Invalid or expired join code' });
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ roomId });
  } catch (err) {
    console.error('Error joining by code:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to join a room using a join code
router.post('/join-by-code', async (req, res) => {
  try {
    const { joinCode } = req.body;
    if (!joinCode) return res.status(400).json({ error: 'joinCode is required' });
    const roomId = await redisClient.get(`joincode:${joinCode}`);
    if (!roomId) return res.status(404).json({ error: 'Invalid or expired join code' });
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ roomId });
  } catch (err) {
    console.error('Error joining by code:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions for file metadata
const countFiles = (fileTree) => {
  let count = 0;
  const countRecursive = (node) => {
    if (node.type === 'file') {
      count++;
    } else if (node.type === 'folder' && node.children) {
      node.children.forEach(countRecursive);
    }
  };
  countRecursive(fileTree);
  return count;
};

const calculateFileSize = (fileTree) => {
  let totalSize = 0;
  const calculateRecursive = (node) => {
    if (node.type === 'file' && node.content) {
      totalSize += Buffer.byteLength(node.content, 'utf8') / 1024; // Convert to KB
    } else if (node.type === 'folder' && node.children) {
      node.children.forEach(calculateRecursive);
    }
  };
  calculateRecursive(fileTree);
  return Math.round(totalSize * 100) / 100; // Round to 2 decimal places
};

const getFileTypes = (fileTree) => {
  const fileTypes = new Set();
  const extractTypes = (node) => {
    if (node.type === 'file') {
      const ext = node.name.split('.').pop().toLowerCase();
      fileTypes.add(ext);
    } else if (node.type === 'folder' && node.children) {
      node.children.forEach(extractTypes);
    }
  };
  extractTypes(fileTree);
  return Array.from(fileTypes);
};

module.exports = router;
