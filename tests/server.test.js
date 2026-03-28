import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { createAppServer } from '../server.js';

async function bootServer(options = {}) {
  const { httpServer } = createAppServer(options);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    baseUrl,
    close: () => new Promise((resolve, reject) => httpServer.close((error) => (error ? reject(error) : resolve()))),
  };
}

test('shared alpha exposes state and creates shared orders', async () => {
  const server = await bootServer();
  try {
    const stateResponse = await fetch(`${server.baseUrl}/api/state`);
    assert.equal(stateResponse.status, 200);
    const initialState = await stateResponse.json();
    assert.equal(initialState.orders.length, 0);

    const createResponse = await fetch(`${server.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Alice',
        note: 'Sans glaçons',
        cart: [{ itemId: 'beer-lager', optionId: '25cl', quantity: 2 }],
      }),
    });

    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.order.customerName, 'Alice');
    assert.equal(created.state.orders.length, 1);
    assert.equal(created.state.orders[0].status, 'queued');
  } finally {
    await server.close();
  }
});

test('shared alpha lets the bar advance workflow and update pilotage', async () => {
  const server = await bootServer();
  try {
    const createResponse = await fetch(`${server.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Bob',
        note: '',
        cart: [{ itemId: 'spritz', optionId: 'classic', quantity: 1 }],
      }),
    });
    const created = await createResponse.json();
    const orderId = created.order.id;

    let response = await fetch(`${server.baseUrl}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'next' }),
    });
    let payload = await response.json();
    assert.equal(payload.order.status, 'preparing');

    response = await fetch(`${server.baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupPoint: 'Pickup zone B', serviceOpen: false, averagePrepMinutes: 9 }),
    });
    payload = await response.json();
    assert.equal(payload.state.venue.pickupPoint, 'Pickup zone B');
    assert.equal(payload.state.venue.serviceOpen, false);

    response = await fetch(`${server.baseUrl}/api/menu/beer-lager/toggle-availability`, { method: 'POST' });
    payload = await response.json();
    const beer = payload.state.menu.find((item) => item.id === 'beer-lager');
    assert.equal(beer.available, false);
  } finally {
    await server.close();
  }
});

test('shared alpha protects API shape and rejects invalid options', async () => {
  const server = await bootServer();
  try {
    let response = await fetch(`${server.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Mallory',
        cart: [{ itemId: 'beer-lager', optionId: 'bogus', quantity: 1 }],
      }),
    });
    assert.equal(response.status, 400);
    let payload = await response.json();
    assert.equal(payload.error, 'INVALID_OPTION');

    response = await fetch(`${server.baseUrl}/tests/server.test.js`);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.match(body, /<!doctype html>|<!DOCTYPE html>|<html/i);

    response = await fetch(`${server.baseUrl}/api/does-not-exist`);
    assert.equal(response.status, 404);
    payload = await response.json();
    assert.equal(payload.error, 'API_ROUTE_NOT_FOUND');
  } finally {
    await server.close();
  }
});

test('shared alpha persists state across server restarts when persistence is enabled', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'barpass-persist-'));
  const persistencePath = path.join(tempDir, 'state.json');

  const firstServer = await bootServer({ persistencePath });
  try {
    let response = await fetch(`${firstServer.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Persist',
        note: 'tester restart',
        cart: [{ itemId: 'gin-tonic', optionId: 'classic', quantity: 1 }],
      }),
    });
    assert.equal(response.status, 201);

    response = await fetch(`${firstServer.baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupPoint: 'Pickup zone C', averagePrepMinutes: 8 }),
    });
    assert.equal(response.status, 200);
  } finally {
    await firstServer.close();
  }

  const secondServer = await bootServer({ persistencePath });
  try {
    const response = await fetch(`${secondServer.baseUrl}/api/state`);
    assert.equal(response.status, 200);
    const state = await response.json();
    assert.equal(state.orders.length, 1);
    assert.equal(state.orders[0].customerName, 'Persist');
    assert.equal(state.orders[0].pickupPoint, 'Pickup zone A');
    assert.equal(state.venue.pickupPoint, 'Pickup zone C');
    assert.equal(state.venue.averagePrepMinutes, 8);
  } finally {
    await secondServer.close();
  }
});
