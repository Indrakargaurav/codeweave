const mongoose = require('mongoose');

/* ------------------------ Room Schema ------------------------ */
const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true },

  // ✅ Replaced JWT-based logic: now matches with User.ownerId
  roomOwnerId: { type: String, required: true }, // Matches User.ownerId

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },

  s3Key: { type: String }, // Optional S3 key for uploaded files

  joinCode: { type: String, unique: true }, // Secure code for joining the room

  metadata: {
    fileCount: { type: Number },
    totalSizeKB: { type: Number },
    fileTypes: { type: [String] },
  },
});

const Room = mongoose.model('Room', roomSchema);

/* ---------------------- Export All Models --------------------- */
module.exports = {
  Room,
  // Add other models here later, e.g.
  // User,
  // Message,
};
