const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    unique: true,
    required: true,
    default: () => uuidv4(), // ✅ Unique ownerId for each user
  },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: String,
  googleId: String,
  githubId: String,
  linkedinId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
