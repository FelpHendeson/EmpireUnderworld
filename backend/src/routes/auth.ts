import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User.js';

const sanitizeUser = (user: { _id: { toString: () => string }; email: string; username: string }) => ({
  id: user._id.toString(),
  email: user.email,
  username: user.username
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register', async (request, reply) => {
    const body = request.body as {
      email?: string;
      username?: string;
      password?: string;
    };

    if (!body.email || !body.username || !body.password) {
      return reply.code(400).send({ message: 'email, username and password are required' });
    }

    if (body.password.length < 6) {
      return reply.code(400).send({ message: 'password must have at least 6 characters' });
    }

    const email = body.email.trim().toLowerCase();
    const username = body.username.trim();

    const existing = await UserModel.findOne({
      $or: [{ email }, { username }]
    }).lean();

    if (existing) {
      return reply.code(409).send({ message: 'user already exists' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await UserModel.create({ email, username, passwordHash });

    const token = await reply.jwtSign({ sub: user._id.toString(), email: user.email });
    return reply.code(201).send({ token, user: sanitizeUser(user) });
  });

  app.post('/auth/login', async (request, reply) => {
    const body = request.body as {
      email?: string;
      password?: string;
    };

    if (!body.email || !body.password) {
      return reply.code(400).send({ message: 'email and password are required' });
    }

    const email = body.email.trim().toLowerCase();
    const user = await UserModel.findOne({ email });

    if (!user) {
      return reply.code(401).send({ message: 'invalid credentials' });
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      return reply.code(401).send({ message: 'invalid credentials' });
    }

    const token = await reply.jwtSign({ sub: user._id.toString(), email: user.email });
    return reply.send({ token, user: sanitizeUser(user) });
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    if (!userId) {
      return reply.code(401).send({ message: 'unauthorized' });
    }

    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return reply.code(404).send({ message: 'user not found' });
    }

    return reply.send({ user: sanitizeUser(user as any) });
  });
};
