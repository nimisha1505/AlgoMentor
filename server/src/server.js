import dotenv from 'dotenv';
import { app } from './app.js';
import { connectDB } from './db/index.js';

// Load environment variables
dotenv.config({
  path: './.env',
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and then start the server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`⚙️  Server is running at port : ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed !!!', err);
    process.exit(1);
  });
