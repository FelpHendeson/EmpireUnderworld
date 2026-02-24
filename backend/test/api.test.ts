import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let app: any;
let connectMongo: (typeof import('../src/lib/mongo.js'))['connectMongo'];
let disconnectMongo: (typeof import('../src/lib/mongo.js'))['disconnectMongo'];

const registerAndGetToken = async () => {
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
  return body.token as string;
};

beforeAll(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to run API tests. Configure backend/.env first.');
  }

  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

  const mongoModule = await import('../src/lib/mongo.js');
  connectMongo = mongoModule.connectMongo;
  disconnectMongo = mongoModule.disconnectMongo;

  await connectMongo();

  const appModule = await import('../src/app.js');
  app = await appModule.default();
  await app.ready();
});

afterAll(async () => {
  if (app) {
    await app.close();
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
    expect(registerBody.token).toBeTypeOf('string');

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
});
