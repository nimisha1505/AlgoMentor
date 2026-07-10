import express from 'express';

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Health check route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy and running',
  });
});

export { app };
