import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport';
import mainRoute from './routes/server.route';
import session from 'express-session';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();

const uploadsDir = path.join('/tmp', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Define allowed origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://property-valuation-system-frontend.vercel.app',
  'http://localhost:3000',
].filter(Boolean); // Remove any undefined values

// Simplified CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      // Allow all Vercel deployments (production and preview)
      if (origin.includes('vercel.app')) {
        return callback(null, true);
      }
      
      // Allow local development
      if (origin.includes('localhost')) {
        return callback(null, true);
      }
      
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/v1', mainRoute);

// ========== ADD THIS SERVER START CODE ==========
const PORT = process.env.PORT || 3030;

// Only start the server if this file is run directly (not imported in tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(` Server is running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/v1`);
    console.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
  });
}

export default app;