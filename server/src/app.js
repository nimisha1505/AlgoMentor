import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Configure CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Cookie parser middleware
app.use(cookieParser());

// Health check route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy and running',
  });
});

// Global error handling middleware
app.use(errorHandler);

export { app };
