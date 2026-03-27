import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const script = await fs.readFile(path.join(root, 'app.js'), 'utf8');

async function boot() {
  const dom = new JSDOM(html, {
    url: 'http://localhost:4173/',
    runScripts: 'dangerously',
    resources: 'usable',
    beforeParse(window) {
      class FakeChannel {
        addEventListener() {}
        postMessage() {}
        close() {}
      }
      window.BroadcastChannel = FakeChannel;
      window.crypto = { randomUUID: () => 'test-order-id' };
      window.fetch = async () => {
        throw new Error('offline-test-mode');
      };
    },
  });

  const scriptEl = dom.window.document.createElement('script');
  scriptEl.textContent = script;
  dom.window.document.body.appendChild(scriptEl);
  await new Promise((resolve) => setTimeout(resolve, 20));
  return dom;
}

test('client can add to cart and create an order', async () => {
  const dom = await boot();
  const { document, localStorage } = dom.window;

  const addButtons = [...document.querySelectorAll('.add-to-cart-button')];
  assert.ok(addButtons.length >= 1);
  addButtons[0].click();

  assert.match(document.getElementById('cart-items').textContent, /Lager pression/);

  document.getElementById('checkout-name').value = 'Kano';
  document.getElementById('checkout-button').click();

  const state = JSON.parse(localStorage.getItem('barpass-v0-state'));
  assert.equal(state.orders.length, 1);
  assert.equal(state.orders[0].customerName, 'Kano');
  assert.equal(state.orders[0].status, 'queued');
  assert.ok(localStorage.getItem('barpass-v0-last-order'));
});

test('bar can advance an order through workflow', async () => {
  const dom = await boot();
  const { document, localStorage } = dom.window;

  document.querySelector('.add-to-cart-button').click();
  document.getElementById('checkout-name').value = 'Bar flow';
  document.getElementById('checkout-button').click();

  document.querySelector('[data-view="bar"]').click();
  let primary = document.querySelector('#orders-queued .primary-button');
  assert.ok(primary);
  primary.click();
  await new Promise((resolve) => setTimeout(resolve, 10));

  let state = JSON.parse(localStorage.getItem('barpass-v0-state'));
  assert.equal(state.orders[0].status, 'preparing');

  primary = document.querySelector('#orders-preparing .primary-button');
  primary.click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  state = JSON.parse(localStorage.getItem('barpass-v0-state'));
  assert.equal(state.orders[0].status, 'ready');

  primary = document.querySelector('#orders-ready .primary-button');
  primary.click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  state = JSON.parse(localStorage.getItem('barpass-v0-state'));
  assert.equal(state.orders[0].status, 'completed');
  assert.match(document.getElementById('current-order').textContent, /Retirée/);
});

test('pilotage can close service and toggle stock without mutating an existing order pickup point', async () => {
  const dom = await boot();
  const { document, localStorage } = dom.window;

  document.querySelector('.add-to-cart-button').click();
  document.getElementById('checkout-name').value = 'Ops';
  document.getElementById('checkout-button').click();

  document.querySelector('[data-view="pilotage"]').click();
  document.getElementById('settings-pickup-point').value = 'Pickup zone B';
  const serviceToggle = document.getElementById('settings-service-open');
  serviceToggle.checked = false;
  document.getElementById('save-settings-button').click();

  let state = JSON.parse(localStorage.getItem('barpass-v0-state'));
  assert.equal(state.venue.serviceOpen, false);
  assert.equal(state.venue.pickupPoint, 'Pickup zone B');
  assert.equal(state.orders[0].pickupPoint, 'Pickup zone A');

  const stockButton = document.querySelector('#stock-list .secondary-button');
  stockButton.click();
  state = JSON.parse(localStorage.getItem('barpass-v0-state'));
  assert.equal(state.menu[0].available, false);
});
