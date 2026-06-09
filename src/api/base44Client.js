/* b44-full-sync 2026-06-01 */
/*
 * Self-hosted adapter.
 *
 * This file is the ONLY integration point between the app and the backend.
 * It exposes exactly the same surface the app already used from `@base44/sdk`
 * (entities CRUD, auth, integrations.Core.UploadFile, functions.invoke,
 * setToken), but talks to our own FastAPI backend over same-origin REST
 * (`/api/apps/{appId}/...`, proxied by nginx) plus a WebSocket channel for
 * instant chat updates. No UI/components were changed.
 */
import { appParams } from '@/lib/app-params';
import { queryClientInstance } from '@/lib/query-client';

const APP_ID = appParams.appId || '';
const API_BASE = `/api/apps/${APP_ID}`;

let authToken =
  appParams.token ||
  (typeof window !== 'undefined'
    ? window.localStorage.getItem('base44_access_token') ||
      window.localStorage.getItem('token')
    : null) ||
  null;

/* ----------------------------- HTTP helper ----------------------------- */

class ApiError extends Error {
  constructor(message, status, data, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = code || data?.code;
  }
}

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = { 'X-App-Id': APP_ID };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  let payload;
  if (form) {
    payload = form; // FormData — let the browser set the boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: payload,
    credentials: 'include',
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.detail)) || res.statusText || 'Request failed';
    throw new ApiError(message, res.status, data);
  }
  return data;
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    search.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

/* ------------------------------- Entities ------------------------------ */

function makeEntity(name) {
  return {
    filter(query = {}, sort, limit, skip) {
      return request(
        `/entities/${name}${buildQuery({ q: query, sort, limit, skip })}`,
      );
    },
    list(sort, limit, skip) {
      return request(`/entities/${name}${buildQuery({ sort, limit, skip })}`);
    },
    get(id) {
      return request(`/entities/${name}/${id}`);
    },
    create(data) {
      return request(`/entities/${name}`, { method: 'POST', body: data });
    },
    update(id, data) {
      return request(`/entities/${name}/${id}`, { method: 'PUT', body: data });
    },
    delete(id) {
      return request(`/entities/${name}/${id}`, { method: 'DELETE' });
    },
  };
}

const entities = {
  Profile: makeEntity('Profile'),
  Match: makeEntity('Match'),
  Message: makeEntity('Message'),
  Like: makeEntity('Like'),
  Feedback: makeEntity('Feedback'),
};

/* --------------------------------- Auth -------------------------------- */

function clearStoredToken() {
  authToken = null;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('base44_access_token');
    window.localStorage.removeItem('token');
  }
  disconnectRealtime();
}

const auth = {
  me() {
    return request('/entities/User/me');
  },
  register({ email, password }) {
    return request('/auth/register', { method: 'POST', body: { email, password } });
  },
  loginViaEmailPassword(email, password) {
    return request('/auth/login', { method: 'POST', body: { email, password } });
  },
  verifyOtp({ email, otpCode }) {
    return request('/auth/verify-otp', {
      method: 'POST',
      body: { email, otp_code: otpCode },
    });
  },
  resendOtp(email) {
    return request('/auth/resend-otp', { method: 'POST', body: { email } });
  },
  async logout(redirectUrl) {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // stateless — ignore network errors on logout
    }
    clearStoredToken();
    if (redirectUrl && typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  },
};

/* ----------------------------- Integrations ---------------------------- */

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const formData = new FormData();
      formData.append('file', file);
      return request('/integration-endpoints/Core/UploadFile', {
        method: 'POST',
        form: formData,
      });
    },
    async SendEmail() {
      // Email is sent server-side by backend functions; no-op on the client.
      return { success: true };
    },
  },
};

/* ------------------------------- Functions ----------------------------- */

const functions = {
  invoke(functionName, payload = {}) {
    return request(`/functions/${functionName}`, { method: 'POST', body: payload });
  },
};

/* ----------------------------- Realtime (WS) --------------------------- */

let socket = null;
let reconnectTimer = null;

/* --- Call signaling (WebRTC) layered on the same socket --------------- */
// The profile this client speaks for; sent to the server so it can route
// incoming call signals (offer/answer/ICE/invite) addressed to us.
let signalProfileId = null;
const signalHandlers = new Set();

function sendHello() {
  if (signalProfileId && socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify({ type: 'hello', profile_id: signalProfileId }));
    } catch {
      // socket race — will retry on next (re)connect
    }
  }
}

function invalidate(evt) {
  const qc = queryClientInstance;
  if (!qc || !evt) return;
  if (evt.entity === 'Message') {
    if (evt.match_id) qc.invalidateQueries({ queryKey: ['messages', evt.match_id] });
    qc.invalidateQueries({ queryKey: ['chatList'] });
    qc.invalidateQueries({ queryKey: ['matches'] });
  } else if (evt.entity === 'Match') {
    if (evt.match_id) {
      qc.invalidateQueries({ queryKey: ['match', evt.match_id] });
      qc.invalidateQueries({ queryKey: ['messages', evt.match_id] });
    }
    qc.invalidateQueries({ queryKey: ['chatList'] });
    qc.invalidateQueries({ queryKey: ['matches'] });
  }
}

function connectRealtime() {
  if (typeof window === 'undefined' || !authToken) return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${window.location.host}/ws?token=${encodeURIComponent(authToken)}`;
  try {
    socket = new WebSocket(url);
  } catch {
    return;
  }
  socket.onopen = () => {
    sendHello();
  };
  socket.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return; // ignore malformed events
    }
    if (msg && msg.type === 'signal') {
      signalHandlers.forEach((fn) => {
        try {
          fn(msg);
        } catch {
          // a misbehaving handler must not break delivery to others
        }
      });
      return;
    }
    invalidate(msg);
  };
  socket.onclose = () => {
    socket = null;
    if (authToken && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectRealtime();
      }, 3000);
    }
  };
  socket.onerror = () => {
    try {
      socket?.close();
    } catch {
      // ignore
    }
  };
}

function disconnectRealtime() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    try {
      socket.close();
    } catch {
      // ignore
    }
    socket = null;
  }
}

/* -------------------------------- Client ------------------------------- */

export const base44 = {
  appId: APP_ID,
  setToken(token) {
    authToken = token || null;
    if (authToken) {
      connectRealtime();
    } else {
      disconnectRealtime();
    }
  },
  entities,
  auth,
  integrations,
  functions,
  /* ----------------------------- Call signaling ---------------------- */
  // Tell the realtime channel which profile this client is, so the server can
  // deliver call signals addressed to us. Safe to call repeatedly.
  setSignalingIdentity(profileId) {
    signalProfileId = profileId || null;
    if (signalProfileId) {
      connectRealtime();
      sendHello();
    }
  },
  // Send a WebRTC signal to another profile. Returns false if the socket isn't
  // open (caller can treat that as "peer unreachable right now").
  sendSignal({ to, matchId, signal, data }) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify({
        type: 'signal',
        to_profile_id: to,
        match_id: matchId,
        signal,
        data,
      }));
      return true;
    } catch {
      return false;
    }
  },
  // Subscribe to inbound signals; returns an unsubscribe function.
  onSignal(handler) {
    signalHandlers.add(handler);
    return () => signalHandlers.delete(handler);
  },
  // Some backend-only flows reference asServiceRole; mirror entities so any
  // accidental client use degrades gracefully to a normal authed call.
  get asServiceRole() {
    return { entities, integrations };
  },
};

// Open the realtime channel eagerly if we already have a session.
if (authToken) connectRealtime();

export default base44;
