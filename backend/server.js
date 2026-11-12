import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config();

// Verify ES modules are working
console.log('═══════════════════════════════════════════════════════');
console.log('🚀 SERVER STARTING - ES MODULES VERSION');
console.log('═══════════════════════════════════════════════════════');
console.log('✅ Using ES modules (import/export)');
console.log('✅ This is NOT CommonJS (require/module.exports)');
console.log('═══════════════════════════════════════════════════════');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL, // Production frontend URL
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow if origin is in allowed list or in development mode
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes - ES modules avoid caching issues
// Import routes at top level (ES modules support this)
import authRouter from './routes/auth.js';
import transactionsRouter from './routes/transactions.js';
import uploadRouter from './routes/upload.js';
import insightsRouter from './routes/insights.js';
import categoriesRouter from './routes/categories.js';

// Register routes
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/categories', categoriesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FinSight API is running' });
});

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('MONGODB_URI is required. Configure it in the service environment.');
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret') {
  console.error('JWT_SECRET is required. Configure a strong secret in the service environment.');
  process.exit(1);
}
const isAtlas = mongoURI.includes('mongodb+srv://');

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: isAtlas ? 10000 : 5000, // Longer timeout for Atlas
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  if (isAtlas) {
    console.log('📡 Connected to MongoDB Atlas (Cloud)');
  } else {
    console.log('💻 Connected to local MongoDB');
  }
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  if (isAtlas) {
    console.log('💡 Tips for MongoDB Atlas:');
    console.log('   1. Check your IP is whitelisted in Network Access');
    console.log('   2. Verify your connection string is correct');
    console.log('   3. Ensure username and password are correct');
  } else {
    console.log('💡 Note: Server will still start, but database operations will fail until MongoDB is running.');
    console.log('💡 To use MongoDB Atlas, set MONGODB_URI in your .env file');
  }
});

// Handle reconnection
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected successfully');
});

// Serve the built single-page app from the same origin as the API.
const frontendDist = resolve(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(resolve(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Upload health: http://localhost:${PORT}/api/upload/health`);
});

