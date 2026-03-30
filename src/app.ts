// backend/src/server.ts

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.route';
import { seedAdmin } from './utils/seedAdmin';

dotenv.config();

const app = express();

app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Property Valuation API is running 🚀' 
  });
});

// Seed admin on server start
const startServer = async () => {
  try {
    await seedAdmin();

    const PORT = process.env.PORT || 3030;
    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error(" Failed to start server:", error);
  }
};

startServer();