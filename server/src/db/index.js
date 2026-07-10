import mongoose from 'mongoose';

/**
 * Establishes a connection to MongoDB using Mongoose.
 * Throws an error if MONGODB_URI is missing or if connection fails.
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI is missing in the environment variables');
    }

    const connectionInstance = await mongoose.connect(mongoUri);
    
    console.log(`☘️  MongoDB Connected! DB HOST: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection FAILED: ', error.message);
    throw error;
  }
};

export { connectDB };
