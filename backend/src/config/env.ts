import 'dotenv/config';

const required = ['JWT_SECRET', 'MONGODB_URI'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  PORT: Number(process.env.PORT) || 3333,
  HOST: process.env.HOST || '0.0.0.0',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  JWT_SECRET: process.env.JWT_SECRET as string,
  MONGODB_URI: process.env.MONGODB_URI as string
};
