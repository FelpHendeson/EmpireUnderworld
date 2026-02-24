import mongoose from 'mongoose';
import { env } from '../config/env.js';

export const connectMongo = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
};

export const disconnectMongo = async () => {
  await mongoose.disconnect();
};
