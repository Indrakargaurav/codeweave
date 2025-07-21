const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb+srv://gauravindrakar:gaurav12%40@cluster0.oepmy.mongodb.net/?retryWrites=true&w=majority",
      {
        useNewUrlParser: true,
      }
    );
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
