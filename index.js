const express = require('express');
const app = express();
const port = process.env.PORT || 3100;
const userRouter = require("./routes/user.route");
const hotelRouter = require("./routes/hotel.route");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require("mongoose");

// Load environment variables first
require("dotenv").config();

// ✅ FIXED: Correct middleware order
app.use(express.json()); // Parse JSON first
app.use(express.urlencoded({ extended: true, limit: "100mb" })); // Then URL encoded

// ✅ FIXED: Added your signup URL
const allowedOrigins = [
  "https://bookit-app-topaz.vercel.app",
  "https://bookit-app-vn3p.vercel.app", // ← Your signup URL
  "http://localhost:5173",
  "http://localhost:3000"
];

// CORS config
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Connect to MongoDB
const URI = process.env.MONGO_DB_URI;
if (!URI) {
  console.error("MONGO_DB_URI is not defined in environment variables");
  process.exit(1);
}

mongoose.connect(URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("MongoDB Connected Successfully");
})
.catch((err) => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

// Routes
app.use("/user", userRouter);
app.use("/api", hotelRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'BookIt API is running!', timestamp: new Date().toISOString() });
});

// 404 handler - Move this BEFORE error handling middleware
app.use('*', (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Error handling middleware - MUST be last
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ message: err.message || 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
});