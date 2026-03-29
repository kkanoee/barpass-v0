import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { createStore } from '../shared/state.js';

test('store rolls back in-memory state when persistence write fails', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'barpass-store-'));
  const occupiedPath = path.join(tempDir, 'occupied');
  await writeFile(occupiedPath, 'not-a-directory');

  const store = createStore(undefined, {
    persistencePath: path.join(occupiedPath, 'state.json'),
  });

  assert.equal(store.getState().orders.length, 0);
  assert.equal(store.getState().lastSequence, 0);

  assert.throws(
    () => store.createOrder({
      customerName: 'Rollback',
      cart: [{ itemId: 'beer-lager', optionId: '25cl', quantity: 1 }],
    }),
    (error) => {
      assert.equal(error.code, 'EEXIST');
      return true;
    },
  );

  const stateAfterFailure = store.getState();
  assert.equal(stateAfterFailure.orders.length, 0);
  assert.equal(stateAfterFailure.lastSequence, 0);
});
