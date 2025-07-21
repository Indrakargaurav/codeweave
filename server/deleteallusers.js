// deleteAllUsers.js
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = 'mongodb://localhost:27017/YOUR_DB_NAME'; // replace with your actual DB name

mongoose.connect(MONGO_URI).then(async () => {
  await User.deleteMany({});
  console.log('✅ All users deleted');
  mongoose.disconnect();
});
