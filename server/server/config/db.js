const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/medreprolab';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

const getDbStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const { readyState, host, name } = mongoose.connection;

  return {
    status: states[readyState] || 'unknown',
    connected: readyState === 1,
    host: host || 'not connected',
    database: name || mongoUri.split('/').pop() || 'medreprolab',
  };
};

module.exports = { connectDB, getDbStatus };
