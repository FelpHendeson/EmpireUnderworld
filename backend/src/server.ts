import appInstance from './app.js';
import { env } from './config/env.js';
import { connectMongo } from './lib/mongo.js';

const start = async () => {
  const app = await appInstance();

  try {
    await connectMongo();
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`API running at http://${env.HOST}:${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
