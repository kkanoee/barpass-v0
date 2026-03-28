import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createStore } from './shared/state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createAppServer({ persistencePath } = {}) {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const store = createStore(undefined, { persistencePath });

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.get('/index.html', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.get('/app.css', (_req, res) => {
    res.sendFile(path.join(__dirname, 'app.css'));
  });

  app.get('/app.js', (_req, res) => {
    res.sendFile(path.join(__dirname, 'app.js'));
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, mode: 'shared-alpha' });
  });

  app.get('/api/state', (_req, res) => {
    res.json(store.getState());
  });

  app.post('/api/orders', (req, res) => {
    try {
      const { order, state } = store.createOrder(req.body || {});
      broadcastState(wss, state);
      res.status(201).json({ order, state });
    } catch (error) {
      res.status(statusForError(error)).json({ error: error.message });
    }
  });

  app.patch('/api/orders/:orderId/status', (req, res) => {
    try {
      const action = req.body?.action === 'previous' ? 'previous' : 'next';
      const result = action === 'previous'
        ? store.regressOrder(req.params.orderId)
        : store.advanceOrder(req.params.orderId);
      broadcastState(wss, result.state);
      res.json(result);
    } catch (error) {
      res.status(statusForError(error)).json({ error: error.message });
    }
  });

  app.patch('/api/settings', (req, res) => {
    try {
      const state = store.updateSettings(req.body || {});
      broadcastState(wss, state);
      res.json({ state });
    } catch (error) {
      res.status(statusForError(error)).json({ error: error.message });
    }
  });

  app.post('/api/menu/:itemId/toggle-availability', (req, res) => {
    try {
      const state = store.toggleAvailability(req.params.itemId);
      broadcastState(wss, state);
      res.json({ state });
    } catch (error) {
      res.status(statusForError(error)).json({ error: error.message });
    }
  });

  app.post('/api/reset', (_req, res) => {
    const state = store.reset();
    broadcastState(wss, state);
    res.json({ state });
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API_ROUTE_NOT_FOUND' });
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'state', state: store.getState() }));
  });

  return { app, httpServer, wss, store };
}

export function startServer({ port = 4173, persistencePath = process.env.BARPASS_PERSISTENCE_PATH } = {}) {
  const { httpServer } = createAppServer({ persistencePath });
  return new Promise((resolve) => {
    httpServer.listen(port, () => resolve(httpServer));
  });
}

function broadcastState(wss, state) {
  const payload = JSON.stringify({ type: 'state', state });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

function statusForError(error) {
  if (['EMPTY_CART', 'SERVICE_CLOSED', 'ITEM_UNAVAILABLE', 'INVALID_OPTION', 'INVALID_WORKFLOW_TRANSITION'].includes(error.message)) {
    return 400;
  }
  if (['ITEM_NOT_FOUND', 'ORDER_NOT_FOUND'].includes(error.message)) {
    return 404;
  }
  return 500;
}

if (process.argv[1] === __filename) {
  const port = Number(process.env.PORT) || 4173;
  startServer({ port }).then(() => {
    console.log(`BarPass shared alpha listening on port ${port} (local: http://127.0.0.1:${port})`);
  });
}
