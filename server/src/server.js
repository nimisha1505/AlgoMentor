import dotenv from 'dotenv';
import { app } from './app.js';
import { connectDB } from './db/index.js';
import { recoverStuckAnalyses } from './services/analysisRecovery.service.js';

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

    // Run safe startup recovery check for stuck analyses
    recoverStuckAnalyses()
      .then((summary) => {
        console.log(`⚡ Startup analysis recovery completed: ${summary.totalRecovered} total (${summary.queuedRecovered} queued, ${summary.processingRecovered} processing)`);
      })
      .catch((err) => {
        console.error('Failed to run startup analysis recovery:', err);
      });
  })
  .catch((err) => {
    console.error('MongoDB connection failed !!!', err);
    process.exit(1);
  });
