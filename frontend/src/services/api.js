const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

const parseResponse = async (response) => {
  if (response.status === 204) {
    return null;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  return parseResponse(response);
};

export const authApi = {
  register: ({ email, username, password }) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password })
    }),

  login: ({ email, password }) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  me: (token) =>
    request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
};

export const saveApi = {
  list: (token) =>
    request('/saves', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  load: (token, slot) =>
    request(`/saves/${slot}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  save: (token, slot, payload) =>
    request(`/saves/${slot}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),

  remove: (token, slot) =>
    request(`/saves/${slot}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
};

export { API_BASE_URL };
