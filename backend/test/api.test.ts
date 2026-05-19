import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let app: any;
let connectMongo: (typeof import('../src/lib/mongo.js'))['connectMongo'];
let disconnectMongo: (typeof import('../src/lib/mongo.js'))['disconnectMongo'];
let UserModel: (typeof import('../src/models/User.js'))['UserModel'];
let SaveGameModel: (typeof import('../src/models/SaveGame.js'))['SaveGameModel'];
const createdUserIds: string[] = [];

const decodeJwtPayload = (token: string) =>
  JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as {
    sub?: string;
    email?: string;
    iat?: number;
    exp?: number;
  };

const registerAndGetSession = async () => {
  const unique = Math.random().toString(36).slice(2, 8);
  const registerResponse = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: `tester-${unique}@underworld.com`,
      username: `tester-${unique}`,
      password: '123456'
    }
  });

  expect(registerResponse.statusCode).toBe(201);
  const body = registerResponse.json();
  createdUserIds.push(body.user.id);
  return {
    token: body.token as string,
    user: body.user as { id: string; username: string; email: string }
  };
};

const registerAndGetToken = async () => {
  const session = await registerAndGetSession();
  return session.token;
};

beforeAll(async () => {
  if (process.env.MONGODB_TEST_URI) {
    process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to run API tests. Configure backend/.env first.');
  }

  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

  const mongoModule = await import('../src/lib/mongo.js');
  connectMongo = mongoModule.connectMongo;
  disconnectMongo = mongoModule.disconnectMongo;

  await connectMongo();

  const userModelModule = await import('../src/models/User.js');
  const saveModelModule = await import('../src/models/SaveGame.js');
  UserModel = userModelModule.UserModel;
  SaveGameModel = saveModelModule.SaveGameModel;

  const appModule = await import('../src/app.js');
  app = await appModule.default();
  await app.ready();
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
  if (createdUserIds.length) {
    await SaveGameModel.deleteMany({ userId: { $in: createdUserIds } });
    await UserModel.deleteMany({ _id: { $in: createdUserIds } });
  }
  if (disconnectMongo) {
    await disconnectMongo();
  }
});

describe('Auth routes', () => {
  it('register/login/me flow works', async () => {
    const unique = Math.random().toString(36).slice(2, 8);
    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `boss-${unique}@underworld.com`,
        username: `boss-${unique}`,
        password: '123456'
      }
    });

    expect(register.statusCode).toBe(201);
    const registerBody = register.json();
    createdUserIds.push(registerBody.user.id);
    expect(registerBody.token).toBeTypeOf('string');
    const registerTokenPayload = decodeJwtPayload(registerBody.token);
    expect(registerTokenPayload.sub).toBe(registerBody.user.id);
    expect(registerTokenPayload.exp).toBeGreaterThan(registerTokenPayload.iat ?? 0);

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: `boss-${unique}@underworld.com`,
        password: '123456'
      }
    });

    expect(login.statusCode).toBe(200);
    const loginToken = login.json().token as string;
    const loginTokenPayload = decodeJwtPayload(loginToken);
    expect(loginTokenPayload.sub).toBe(registerBody.user.id);
    expect(loginTokenPayload.exp).toBeGreaterThan(loginTokenPayload.iat ?? 0);

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: `Bearer ${loginToken}`
      }
    });

    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe(`boss-${unique}@underworld.com`);
  });
});

describe('Save routes', () => {
  it('rejects missing state payload', async () => {
    const token = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/saves/slot-1',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        name: 'Campanha principal'
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe('state object is required');
  });

  it('creates, lists, loads and deletes saves', async () => {
    const token = await registerAndGetToken();

    const savePayload = {
      day: 2,
      resources: {
        cash: 150,
        influence: 1,
        respect: 3
      },
      player: {
        name: 'Dom Corleone'
      }
    };

    const put = await app.inject({
      method: 'PUT',
      url: '/api/saves/slot-1',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        name: 'Campanha principal',
        state: savePayload
      }
    });

    expect(put.statusCode).toBe(200);
    expect(put.json().save.day).toBe(2);

    const list = await app.inject({
      method: 'GET',
      url: '/api/saves',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(list.statusCode).toBe(200);
    expect(list.json().saves).toHaveLength(1);

    const load = await app.inject({
      method: 'GET',
      url: '/api/saves/slot-1',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(load.statusCode).toBe(200);
    expect(load.json().save.state.player.name).toBe('Dom Corleone');

    const del = await app.inject({
      method: 'DELETE',
      url: '/api/saves/slot-1',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(del.statusCode).toBe(204);
  });

  it('accepts JSON stringified state for compatibility', async () => {
    const token = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/saves/slot-2',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        name: 'Legacy payload',
        state: JSON.stringify({
          day: 9,
          resources: { cash: 900, influence: 7, respect: 6 }
        })
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().save.day).toBe(9);
  });

  it('rejects invalid save slot ids', async () => {
    const token = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/saves/slot-99',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        state: {
          day: 1,
          resources: { cash: 0, influence: 0, respect: 0 }
        }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe('invalid slot');
  });

  it('rejects oversized state payloads', async () => {
    const token = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/saves/slot-1',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        state: {
          day: 1,
          blob: 'x'.repeat(520_000)
        }
      }
    });

    expect(response.statusCode).toBe(413);
    expect(response.json().message).toContain('state payload exceeds');
  });
});

describe('Game routes', () => {
  it('returns config and leaderboard entries with username', async () => {
    const session = await registerAndGetSession();

    const saveResponse = await app.inject({
      method: 'PUT',
      url: '/api/saves/slot-1',
      headers: {
        authorization: `Bearer ${session.token}`
      },
      payload: {
        name: 'Campanha ranking',
        state: {
          day: 7,
          resources: { cash: 777, influence: 3, respect: 5 }
        }
      }
    });

    expect(saveResponse.statusCode).toBe(200);

    const config = await app.inject({
      method: 'GET',
      url: '/api/game/config'
    });
    expect(config.statusCode).toBe(200);
    expect(config.json().saveSlots).toEqual(['slot-1', 'slot-2', 'slot-3']);
    expect(config.json().stateVersion).toBe(5);

    const leaderboard = await app.inject({
      method: 'GET',
      url: '/api/game/leaderboard'
    });

    expect(leaderboard.statusCode).toBe(200);
    expect(leaderboard.json().leaderboard).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          username: session.user.username,
          totalCash: 777
        })
      ])
    );
  });
});
