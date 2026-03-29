import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const workflow = ['queued', 'preparing', 'ready', 'completed'];

export function createSeedState() {
  return {
    venue: {
      name: 'Le Comptoir Demo',
      pickupPoint: 'Pickup zone A',
      averagePrepMinutes: 6,
      serviceOpen: true,
    },
    menu: [
      {
        id: 'beer-lager',
        name: 'Lager pression',
        description: 'Le choix le plus rapide à servir pendant le rush.',
        category: 'Bière',
        priceCents: 700,
        available: true,
        options: [
          { id: '25cl', label: '25 cl', priceDeltaCents: 0 },
          { id: '50cl', label: '50 cl', priceDeltaCents: 400 },
        ],
      },
      {
        id: 'spritz',
        name: 'Spritz',
        description: 'Cocktail simple à fort débit, pensé V0.',
        category: 'Cocktail',
        priceCents: 1100,
        available: true,
        options: [
          { id: 'classic', label: 'Recette classique', priceDeltaCents: 0 },
          { id: 'light-ice', label: 'Moins de glace', priceDeltaCents: 0 },
        ],
      },
      {
        id: 'gin-tonic',
        name: 'Gin tonic',
        description: 'Option courte, compatible avec un bar à cadence élevée.',
        category: 'Cocktail',
        priceCents: 1200,
        available: true,
        options: [
          { id: 'classic', label: 'Classique', priceDeltaCents: 0 },
          { id: 'lemon', label: 'Twist citron', priceDeltaCents: 0 },
        ],
      },
      {
        id: 'soft-cola',
        name: 'Soft cola',
        description: 'Commande rapide, utile pour garder le flux fluide.',
        category: 'Soft',
        priceCents: 450,
        available: true,
        options: [
          { id: '33cl', label: '33 cl', priceDeltaCents: 0 },
          { id: 'zero', label: 'Version zero', priceDeltaCents: 0 },
        ],
      },
    ],
    orders: [],
    lastSequence: 0,
  };
}

export function estimateWaitMinutes(state) {
  const queueDepth = state.orders.filter((order) => ['queued', 'preparing'].includes(order.status)).length;
  return Math.max(state.venue.averagePrepMinutes, Math.round((queueDepth + 1) * (state.venue.averagePrepMinutes / 2)));
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function createStore(initialState = createSeedState(), options = {}) {
  const persistencePath = options.persistencePath || null;
  let state = loadInitialState(initialState, persistencePath);

  function getState() {
    return cloneState(state);
  }

  function applyMutation(mutator) {
    const previousState = cloneState(state);
    const result = mutator();
    try {
      persistState(state, persistencePath);
      return result;
    } catch (error) {
      state = previousState;
      throw error;
    }
  }

  function reset() {
    return applyMutation(() => {
      state = createSeedState();
      return getState();
    });
  }

  function updateSettings(patch) {
    return applyMutation(() => {
      state.venue.name = sanitizeText(patch.name, 60) || state.venue.name;
      state.venue.pickupPoint = sanitizeText(patch.pickupPoint, 60) || state.venue.pickupPoint;
      state.venue.averagePrepMinutes = clampNumber(Number(patch.averagePrepMinutes), 1, 30, state.venue.averagePrepMinutes);
      if (typeof patch.serviceOpen === 'boolean') {
        state.venue.serviceOpen = patch.serviceOpen;
      }
      return getState();
    });
  }

  function toggleAvailability(itemId) {
    const item = state.menu.find((entry) => entry.id === itemId);
    if (!item) {
      throw new Error('ITEM_NOT_FOUND');
    }
    return applyMutation(() => {
      item.available = !item.available;
      return getState();
    });
  }

  function createOrder({ customerName, note, cart }) {
    if (!Array.isArray(cart) || cart.length === 0) {
      throw new Error('EMPTY_CART');
    }
    if (!state.venue.serviceOpen) {
      throw new Error('SERVICE_CLOSED');
    }

    const normalizedCart = cart.map((entry) => {
      const item = state.menu.find((menuItem) => menuItem.id === entry.itemId);
      if (!item || !item.available) {
        throw new Error('ITEM_UNAVAILABLE');
      }
      const option = item.options.find((menuOption) => menuOption.id === entry.optionId);
      if (!option) {
        throw new Error('INVALID_OPTION');
      }
      const quantity = clampNumber(Number(entry.quantity), 1, 20, 1);
      return {
        item,
        option,
        quantity,
      };
    });

    return applyMutation(() => {
      state.lastSequence += 1;
      const sequence = state.lastSequence;
      const createdAt = Date.now();
      const order = {
        id: globalThis.crypto?.randomUUID?.() || `order-${sequence}-${createdAt}`,
        sequence,
        customerName: sanitizeText(customerName, 40) || 'Client',
        pickupPoint: state.venue.pickupPoint,
        status: 'queued',
        note: sanitizeText(note, 120),
        createdAt,
        updatedAt: createdAt,
        estimateMinutes: estimateWaitMinutes(state) + state.venue.averagePrepMinutes,
        totalCents: normalizedCart.reduce((sum, entry) => sum + entry.quantity * (entry.item.priceCents + entry.option.priceDeltaCents), 0),
        items: normalizedCart.map((entry) => ({
          itemId: entry.item.id,
          itemName: entry.item.name,
          optionId: entry.option.id,
          optionLabel: entry.option.label,
          quantity: entry.quantity,
          unitPriceCents: entry.item.priceCents + entry.option.priceDeltaCents,
        })),
      };

      state.orders.unshift(order);
      return { order: cloneState(order), state: getState() };
    });
  }

  function advanceOrder(orderId) {
    const order = requireOrder(orderId);
    const index = workflow.indexOf(order.status);
    if (index === -1 || index >= workflow.length - 1) {
      throw new Error('INVALID_WORKFLOW_TRANSITION');
    }
    return applyMutation(() => {
      order.status = workflow[index + 1];
      order.updatedAt = Date.now();
      return { order: cloneState(order), state: getState() };
    });
  }

  function regressOrder(orderId) {
    const order = requireOrder(orderId);
    const index = workflow.indexOf(order.status);
    if (index <= 0) {
      throw new Error('INVALID_WORKFLOW_TRANSITION');
    }
    return applyMutation(() => {
      order.status = workflow[index - 1];
      order.updatedAt = Date.now();
      return { order: cloneState(order), state: getState() };
    });
  }

  function requireOrder(orderId) {
    const order = state.orders.find((entry) => entry.id === orderId);
    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }
    return order;
  }

  return {
    getState,
    reset,
    updateSettings,
    toggleAvailability,
    createOrder,
    advanceOrder,
    regressOrder,
  };
}

function loadInitialState(initialState, persistencePath) {
  const fallbackState = cloneState(initialState);
  if (!persistencePath || !existsSync(persistencePath)) {
    return fallbackState;
  }

  try {
    const persisted = JSON.parse(readFileSync(persistencePath, 'utf8'));
    return {
      ...fallbackState,
      ...persisted,
      venue: { ...fallbackState.venue, ...(persisted.venue || {}) },
      menu: Array.isArray(persisted.menu) ? persisted.menu : fallbackState.menu,
      orders: Array.isArray(persisted.orders) ? persisted.orders : fallbackState.orders,
      lastSequence: Number.isFinite(persisted.lastSequence) ? persisted.lastSequence : fallbackState.lastSequence,
    };
  } catch {
    return fallbackState;
  }
}

function persistState(state, persistencePath) {
  if (!persistencePath) {
    return;
  }

  mkdirSync(path.dirname(persistencePath), { recursive: true });
  const tempPath = `${persistencePath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(state, null, 2));
  renameSync(tempPath, persistencePath);
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}
