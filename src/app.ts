// backend/src/server.ts

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport'
import mainRoute from './routes/server.route'
import session from 'express-session';

dotenv.config();

const app = express();


app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,  // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ✅ Passport middleware (must come after session)
app.use(passport.initialize());
app.use(passport.session());


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1', mainRoute);

const startServer = async () => {
  try {

    const PORT = process.env.PORT || 3030;
    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error(" Failed to start server:", error);
  }
};

startServer();