const STORAGE_KEY = 'barpass-v0-state';
const LAST_ORDER_KEY = 'barpass-v0-last-order';
const LOCAL_CHANNEL_NAME = 'barpass-v0';
const workflow = ['queued', 'preparing', 'ready', 'completed'];

const workflowLabels = {
  queued: 'Reçue',
  preparing: 'Préparation',
  ready: 'Prête',
  completed: 'Retirée',
};

function createSeedState() {
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
        productType: 'glass',
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
        productType: 'glass',
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
        productType: 'glass',
        priceCents: 1200,
        available: true,
        options: [
          { id: 'classic', label: 'Classique', priceDeltaCents: 0 },
          { id: 'lemon', label: 'Twist citron', priceDeltaCents: 0 },
        ],
      },
      {
        id: 'vodka-bottle',
        name: 'Bouteille vodka',
        description: 'Format groupe, pensé pour une validation rapide sur mobile.',
        category: 'Bouteille',
        productType: 'bottle',
        priceCents: 9000,
        available: true,
        options: [
          { id: 'standard-pack', label: 'Standard + soft 1 + soft 2', priceDeltaCents: 0 },
          { id: 'premium-sparkler', label: 'Premium + scintillant', priceDeltaCents: 2500 },
        ],
      },
      {
        id: 'champagne-bottle',
        name: 'Champagne',
        description: 'Version bouteille pour commandes de table ou groupe premium.',
        category: 'Bouteille',
        productType: 'bottle',
        priceCents: 12000,
        available: true,
        options: [
          { id: 'standard-4', label: 'Standard · 4 coupes', priceDeltaCents: 0 },
          { id: 'magnum-8', label: 'Magnum · 8 coupes', priceDeltaCents: 5500 },
        ],
      },
      {
        id: 'soft-cola',
        name: 'Soft cola',
        description: 'Commande rapide, utile pour garder le flux fluide.',
        category: 'Soft',
        productType: 'soft',
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

function estimateWaitMinutes(currentState) {
  const queueDepth = currentState.orders.filter((order) => ['queued', 'preparing'].includes(order.status)).length;
  return Math.max(currentState.venue.averagePrepMinutes, Math.round((queueDepth + 1) * (currentState.venue.averagePrepMinutes / 2)));
}

const ui = {
  cart: [],
  activeView: 'client',
  toastTimer: null,
  mobileEntryMode: null,
  mobileFlowStarted: false,
  menuFilter: 'all',
};

const runtime = {
  mode: 'local',
  channel: typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(LOCAL_CHANNEL_NAME) : null,
  socket: null,
};

let state = createSeedState();

const els = {
  venueName: document.getElementById('venue-name'),
  pickupSummary: document.getElementById('pickup-summary'),
  pickupLabel: document.getElementById('pickup-label'),
  avgWaitLabel: document.getElementById('avg-wait-label'),
  menuList: document.getElementById('menu-list'),
  cartEmpty: document.getElementById('cart-empty'),
  cartItems: document.getElementById('cart-items'),
  cartSummary: document.getElementById('cart-summary'),
  cartTotal: document.getElementById('cart-total'),
  checkoutName: document.getElementById('checkout-name'),
  checkoutNote: document.getElementById('checkout-note'),
  checkoutButton: document.getElementById('checkout-button'),
  currentOrder: document.getElementById('current-order'),
  currentOrderEmpty: document.getElementById('current-order-empty'),
  metricActive: document.getElementById('metric-active'),
  metricReady: document.getElementById('metric-ready'),
  metricRevenue: document.getElementById('metric-revenue'),
  ordersQueued: document.getElementById('orders-queued'),
  ordersPreparing: document.getElementById('orders-preparing'),
  ordersReady: document.getElementById('orders-ready'),
  ordersCompleted: document.getElementById('orders-completed'),
  servicePill: document.getElementById('service-pill'),
  mobileEntry: document.getElementById('mobile-entry'),
  mobileFlow: document.getElementById('mobile-flow'),
  mobileStartOrder: document.getElementById('mobile-start-order'),
  mobileStartGuest: document.getElementById('mobile-start-guest'),
  mobileBackToEntry: document.getElementById('mobile-back-to-entry'),
  mobileContextLabel: document.getElementById('mobile-context-label'),
  mobileFlowTitle: document.getElementById('mobile-flow-title'),
  mobileStepper: document.getElementById('mobile-stepper'),
  filterButtons: [...document.querySelectorAll('[data-filter]')],
  settingsVenueName: document.getElementById('settings-venue-name'),
  settingsPickupPoint: document.getElementById('settings-pickup-point'),
  settingsPrepMinutes: document.getElementById('settings-prep-minutes'),
  settingsServiceOpen: document.getElementById('settings-service-open'),
  stockList: document.getElementById('stock-list'),
  saveSettingsButton: document.getElementById('save-settings-button'),
  resetDemoButton: document.getElementById('reset-demo-button'),
  menuItemTemplate: document.getElementById('menu-item-template'),
};

bootstrap();

async function bootstrap() {
  bindEvents();
  await initializeState();
  render();
}

function bindEvents() {
  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  els.mobileStartOrder.addEventListener('click', () => startMobileFlow('scan'));
  els.mobileStartGuest.addEventListener('click', () => startMobileFlow('guest'));
  els.mobileBackToEntry.addEventListener('click', resetMobileFlow);
  els.filterButtons.forEach((button) => {
    button.addEventListener('click', () => setMenuFilter(button.dataset.filter || 'all'));
  });

  els.checkoutButton.addEventListener('click', checkout);
  els.saveSettingsButton.addEventListener('click', saveSettings);
  els.resetDemoButton.addEventListener('click', resetDemo);

  window.addEventListener('storage', (event) => {
    if (runtime.mode !== 'local') return;
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        syncState(JSON.parse(event.newValue));
      } catch {
        // ignore malformed local sync payloads
      }
    }
  });

  runtime.channel?.addEventListener('message', (event) => {
    if (runtime.mode !== 'local') return;
    if (event.data?.type === 'state-updated') {
      syncState(event.data.state);
    }
  });
}

async function initializeState() {
  try {
    const remoteState = await fetchJson('/api/state', { method: 'GET' });
    runtime.mode = 'remote';
    syncState(remoteState);
    connectRealtime();
    showToast('Mode partagé activé.');
  } catch {
    runtime.mode = 'local';
    syncState(loadLocalState());
  }
}

function connectRealtime() {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    runtime.socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    runtime.socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'state' && payload.state) {
          syncState(payload.state);
        }
      } catch {
        // ignore malformed websocket frames
      }
    });
  } catch {
    // remote mode still works with polling-less fetch mutations
  }
}

function loadLocalState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createSeedState();
  try {
    const parsed = JSON.parse(raw);
    return {
      ...createSeedState(),
      ...parsed,
      venue: { ...createSeedState().venue, ...(parsed.venue || {}) },
      menu: Array.isArray(parsed.menu) ? parsed.menu : createSeedState().menu,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      lastSequence: Number.isFinite(parsed.lastSequence) ? parsed.lastSequence : 0,
    };
  } catch {
    return createSeedState();
  }
}

function saveLocalState(announce = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (announce) {
    runtime.channel?.postMessage({ type: 'state-updated', state });
  }
}

function syncState(nextState) {
  state = nextState;
  render();
}

function setView(view) {
  ui.activeView = view;
  document.querySelectorAll('.tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('active', section.id === `view-${view}`);
  });
}

function startMobileFlow(mode) {
  ui.mobileEntryMode = mode;
  ui.mobileFlowStarted = true;
  renderMobileFlow();
  renderMenu();
  renderCart();
  renderCurrentOrder();
}

function resetMobileFlow() {
  ui.mobileEntryMode = null;
  ui.mobileFlowStarted = false;
  ui.menuFilter = 'all';
  renderMobileFlow();
  renderMenu();
}

function setMenuFilter(filter) {
  ui.menuFilter = filter;
  els.filterButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === filter);
  });
  renderMenu();
}

function render() {
  renderVenue();
  renderMobileFlow();
  renderMenu();
  renderCart();
  renderCurrentOrder();
  renderBar();
  renderPilotage();
}

function renderVenue() {
  const wait = estimateWaitMinutes(state);
  els.venueName.textContent = state.venue.name;
  els.pickupSummary.textContent = `Retrait unique · ${state.venue.pickupPoint}`;
  els.pickupLabel.textContent = state.venue.pickupPoint;
  els.avgWaitLabel.textContent = `${wait} min`;
  const modeLabel = runtime.mode === 'remote' ? 'Mode partagé' : 'Mode local';
  els.servicePill.textContent = `${state.venue.serviceOpen ? 'Service ouvert' : 'Service fermé'} · ${modeLabel}`;
  els.servicePill.className = `badge ${state.venue.serviceOpen ? 'success' : 'warning'}`;
}

function renderMobileFlow() {
  const lastOrderId = localStorage.getItem(LAST_ORDER_KEY);
  const currentOrder = state.orders.find((entry) => entry.id === lastOrderId);
  const shouldShowFlow = ui.mobileFlowStarted || ui.cart.length > 0 || Boolean(currentOrder);
  els.mobileEntry.hidden = shouldShowFlow;
  els.mobileFlow.hidden = !shouldShowFlow;

  const modeLabel = ui.mobileEntryMode === 'scan'
    ? 'Entrée QR / lien direct'
    : ui.mobileEntryMode === 'guest'
      ? 'Mode invité · tunnel express'
      : 'Tunnel mobile prêt à commander';
  els.mobileContextLabel.textContent = modeLabel;

  const stage = currentOrder
    ? 'tracking'
    : ui.cart.length
      ? 'cart'
      : 'menu';
  const title = stage === 'tracking'
    ? 'Suivez votre commande'
    : stage === 'cart'
      ? 'Validez le panier'
      : 'Choisissez votre commande';
  els.mobileFlowTitle.textContent = title;

  const steps = [...els.mobileStepper.querySelectorAll('.mobile-step')];
  steps.forEach((step, index) => {
    const target = stage === 'tracking' ? 2 : stage === 'cart' ? 1 : 0;
    step.classList.toggle('active', index === target);
  });

  els.filterButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === ui.menuFilter);
  });
}

function renderMenu() {
  els.menuList.innerHTML = '';
  const visibleItems = state.menu.filter((item) => ui.menuFilter === 'all' || item.productType === ui.menuFilter);

  if (!visibleItems.length) {
    els.menuList.innerHTML = '<div class="empty-state">Aucun produit ne correspond à ce filtre.</div>';
    return;
  }

  visibleItems.forEach((item) => {
    const node = els.menuItemTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.productType = item.productType || 'glass';
    node.querySelector('.menu-title').textContent = item.name;
    node.querySelector('.menu-description').textContent = item.description;
    node.querySelector('.menu-price').textContent = formatEuros(item.priceCents);
    node.querySelector('.menu-category').textContent = item.category;
    node.querySelector('.menu-stock').textContent = item.available ? productTypeLabel(item.productType) : 'Indisponible';

    const select = node.querySelector('.menu-options');
    item.options.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option.id;
      const delta = option.priceDeltaCents ? ` (+${formatEuros(option.priceDeltaCents)})` : '';
      opt.textContent = `${option.label}${delta}`;
      select.appendChild(opt);
    });

    const button = node.querySelector('.add-to-cart-button');
    button.disabled = !item.available || !state.venue.serviceOpen;
    button.textContent = !state.venue.serviceOpen ? 'Service fermé' : item.available ? 'Ajouter' : 'Indisponible';
    button.addEventListener('click', () => addToCart(item.id, select.value));

    if (!item.available || !state.venue.serviceOpen) {
      node.style.opacity = '0.58';
    }

    els.menuList.appendChild(node);
  });
}

function addToCart(itemId, optionId) {
  const item = state.menu.find((entry) => entry.id === itemId);
  if (!item || !item.available || !state.venue.serviceOpen) {
    showToast('Le service est fermé ou cet article n’est plus disponible.');
    return;
  }

  const option = item.options.find((entry) => entry.id === optionId) || item.options[0];
  const existing = ui.cart.find((entry) => entry.itemId === item.id && entry.optionId === option.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    ui.cart.push({ itemId: item.id, optionId: option.id, quantity: 1 });
  }

  ui.mobileFlowStarted = true;
  renderMobileFlow();
  renderCart();
  showToast(`${item.name} ajouté au panier.`);
}

function renderCart() {
  els.cartItems.innerHTML = '';

  if (!ui.cart.length) {
    els.cartEmpty.classList.remove('hidden');
    els.cartSummary.classList.add('hidden');
    return;
  }

  els.cartEmpty.classList.add('hidden');
  els.cartSummary.classList.remove('hidden');

  ui.cart.forEach((entry, index) => {
    const menuItem = state.menu.find((item) => item.id === entry.itemId);
    const option = menuItem?.options.find((item) => item.id === entry.optionId);
    if (!menuItem || !option) return;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="cart-item-meta">
        <strong>${escapeHtml(menuItem.name)} × ${entry.quantity}</strong>
        <span class="muted">${escapeHtml(option.label)}</span>
      </div>
      <div class="cart-item-meta" style="text-align:right">
        <strong>${formatEuros(lineTotal(entry, menuItem, option))}</strong>
        <button class="link-button" data-index="${index}">Retirer</button>
      </div>
    `;
    row.querySelector('.link-button').addEventListener('click', () => {
      ui.cart.splice(index, 1);
      renderMobileFlow();
      renderCart();
    });
    els.cartItems.appendChild(row);
  });

  els.cartTotal.textContent = formatEuros(cartTotalCents());
}

async function checkout() {
  if (!ui.cart.length) {
    showToast('Le panier est vide.');
    return;
  }

  if (!state.venue.serviceOpen) {
    showToast('Le service est fermé.');
    return;
  }

  const customerName = els.checkoutName.value.trim() || 'Client';
  const note = els.checkoutNote.value.trim();

  try {
    let order;
    if (runtime.mode === 'remote') {
      const payload = await fetchJson('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ customerName, note, cart: ui.cart }),
      });
      order = payload.order;
      syncState(payload.state);
    } else {
      const payload = createLocalOrder(customerName, note);
      order = payload.order;
      syncState(payload.state);
      saveLocalState();
    }

    localStorage.setItem(LAST_ORDER_KEY, order.id);
    ui.cart = [];
    els.checkoutName.value = customerName;
    els.checkoutNote.value = '';
    render();
    showToast(`Commande #${order.sequence} validée. Retrait à ${order.pickupPoint}.`);
  } catch (error) {
    showToast(error.message || 'Impossible de créer la commande.');
  }
}

function createLocalOrder(customerName, note) {
  const unavailable = ui.cart.some((entry) => {
    const item = state.menu.find((menuItem) => menuItem.id === entry.itemId);
    return !item?.available;
  });
  if (unavailable) {
    throw new Error('Une boisson du panier n’est plus disponible.');
  }

  state.lastSequence += 1;
  const sequence = state.lastSequence;
  const order = {
    id: crypto.randomUUID(),
    sequence,
    customerName,
    pickupPoint: state.venue.pickupPoint,
    status: 'queued',
    note,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    estimateMinutes: estimateWaitMinutes(state) + state.venue.averagePrepMinutes,
    totalCents: cartTotalCents(),
    items: ui.cart.map((entry) => {
      const menuItem = state.menu.find((item) => item.id === entry.itemId);
      const option = menuItem.options.find((item) => item.id === entry.optionId);
      return {
        itemId: menuItem.id,
        itemName: menuItem.name,
        optionId: option.id,
        optionLabel: option.label,
        quantity: entry.quantity,
        unitPriceCents: menuItem.priceCents + option.priceDeltaCents,
      };
    }),
  };
  state.orders.unshift(order);
  return { order, state };
}

function renderCurrentOrder() {
  const orderId = localStorage.getItem(LAST_ORDER_KEY);
  const order = state.orders.find((entry) => entry.id === orderId);

  if (!order) {
    els.currentOrderEmpty.classList.remove('hidden');
    els.currentOrder.classList.add('hidden');
    els.currentOrder.innerHTML = '';
    return;
  }

  els.currentOrderEmpty.classList.add('hidden');
  els.currentOrder.classList.remove('hidden');
  els.currentOrder.innerHTML = `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <h3>Commande #${order.sequence}</h3>
          <p class="muted">${escapeHtml(order.customerName)} · ${formatTime(order.createdAt)}</p>
        </div>
        <span class="badge ${order.status === 'ready' ? 'success' : ''}">${workflowLabels[order.status]}</span>
      </div>
      <div class="order-card-body">
        <div>
          <strong>Retrait</strong>
          <p class="muted">${escapeHtml(order.pickupPoint)}</p>
        </div>
        <div>
          <strong>Total</strong>
          <p class="muted">${formatEuros(order.totalCents)}</p>
        </div>
        <div>
          <strong>Estimation initiale</strong>
          <p class="muted">${order.estimateMinutes} min</p>
        </div>
        <div>
          <strong>Articles</strong>
          <div class="order-items">
            ${order.items.map((item) => `<div class="order-item-line"><span>${escapeHtml(item.itemName)} · ${escapeHtml(item.optionLabel)} × ${item.quantity}</span><span>${formatEuros(item.unitPriceCents * item.quantity)}</span></div>`).join('')}
          </div>
        </div>
        ${order.note ? `<div><strong>Note</strong><p class="muted">${escapeHtml(order.note)}</p></div>` : ''}
      </div>
      <div class="timeline">
        ${workflow.map((step) => {
          const done = workflow.indexOf(step) <= workflow.indexOf(order.status);
          return `
            <div class="timeline-step ${done ? 'done' : ''}">
              <span class="timeline-dot"></span>
              <div>
                <strong>${workflowLabels[step]}</strong>
                <div class="muted">${escapeHtml(timelineDescription(step, order))}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderBar() {
  const activeOrders = state.orders.filter((order) => order.status !== 'completed');
  const readyOrders = state.orders.filter((order) => order.status === 'ready');
  const revenue = state.orders.reduce((sum, order) => sum + order.totalCents, 0);

  els.metricActive.textContent = String(activeOrders.length);
  els.metricReady.textContent = String(readyOrders.length);
  els.metricRevenue.textContent = formatEuros(revenue);

  renderOrderColumn(els.ordersQueued, state.orders.filter((order) => order.status === 'queued'), 'Lancer', 'Commandes reçues, pas encore prises en charge.');
  renderOrderColumn(els.ordersPreparing, state.orders.filter((order) => order.status === 'preparing'), 'Marquer prête', 'Commandes en cours de préparation.');
  renderOrderColumn(els.ordersReady, state.orders.filter((order) => order.status === 'ready'), 'Marquer retirée', 'Commandes prêtes au retrait.');
  renderOrderColumn(els.ordersCompleted, state.orders.filter((order) => order.status === 'completed').slice(0, 6), null, 'Dernières commandes terminées.');
}

function renderOrderColumn(container, orders, actionLabel, emptyLabel) {
  container.innerHTML = '';

  if (!orders.length) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(emptyLabel || 'Aucune commande ici.')}</div>`;
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement('article');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-card-head">
        <div>
          <strong>Commande #${order.sequence}</strong>
          <div class="muted">${escapeHtml(order.customerName)} · ${formatTime(order.createdAt)}</div>
        </div>
        <span class="badge">${workflowLabels[order.status]}</span>
      </div>
      <div class="order-tags">
        <span class="badge subtle">${order.items.length} article${order.items.length > 1 ? 's' : ''}</span>
        <span class="badge subtle">${escapeHtml(order.pickupPoint)}</span>
        <span class="badge subtle">${formatEuros(order.totalCents)}</span>
      </div>
      <div class="order-card-body">
        <div class="order-items">
          ${order.items.map((item) => `<div class="order-item-line"><span>${escapeHtml(item.itemName)} · ${escapeHtml(item.optionLabel)} × ${item.quantity}</span><span>${formatEuros(item.unitPriceCents * item.quantity)}</span></div>`).join('')}
        </div>
        ${order.note ? `<div><span class="info-label">Note</span><div class="muted">${escapeHtml(order.note)}</div></div>` : ''}
      </div>
    `;

    if (actionLabel) {
      const actions = document.createElement('div');
      actions.className = 'order-actions';
      const nextButton = document.createElement('button');
      nextButton.className = 'primary-button';
      nextButton.textContent = actionLabel;
      nextButton.addEventListener('click', () => updateOrderStatus(order.id, 'next'));
      actions.appendChild(nextButton);

      if (order.status !== 'completed') {
        const cancelButton = document.createElement('button');
        cancelButton.className = 'secondary-button';
        cancelButton.textContent = previousActionLabel(order.status);
        cancelButton.disabled = order.status === 'queued';
        cancelButton.addEventListener('click', () => updateOrderStatus(order.id, 'previous'));
        actions.appendChild(cancelButton);
      }

      card.appendChild(actions);
    }

    container.appendChild(card);
  });
}

async function updateOrderStatus(orderId, action) {
  try {
    let order;
    if (runtime.mode === 'remote') {
      const payload = await fetchJson(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      order = payload.order;
      syncState(payload.state);
    } else {
      const orderRef = state.orders.find((entry) => entry.id === orderId);
      if (!orderRef) return;
      const index = workflow.indexOf(orderRef.status);
      if (action === 'next' && index < workflow.length - 1) {
        orderRef.status = workflow[index + 1];
      } else if (action === 'previous' && index > 0) {
        orderRef.status = workflow[index - 1];
      } else {
        return;
      }
      orderRef.updatedAt = Date.now();
      order = orderRef;
      saveLocalState();
      render();
    }
    showToast(`Commande #${order.sequence} → ${workflowLabels[order.status]}.`);
  } catch (error) {
    showToast(error.message || 'Impossible de changer le statut.');
  }
}

function renderPilotage() {
  els.settingsVenueName.value = state.venue.name;
  els.settingsPickupPoint.value = state.venue.pickupPoint;
  els.settingsPrepMinutes.value = state.venue.averagePrepMinutes;
  els.settingsServiceOpen.checked = state.venue.serviceOpen;

  els.stockList.innerHTML = '';
  state.menu.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'stock-row';
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <div class="muted">${escapeHtml(item.category)} · ${formatEuros(item.priceCents)}</div>
      </div>
      <div class="stock-actions">
        <span class="badge ${item.available ? 'success' : 'warning'}">${item.available ? 'Disponible' : 'Rupture'}</span>
        <button class="secondary-button">${item.available ? 'Passer en rupture' : 'Réactiver'}</button>
      </div>
    `;
    row.querySelector('button').addEventListener('click', () => toggleAvailability(item.id));
    els.stockList.appendChild(row);
  });
}

async function saveSettings() {
  const payload = {
    name: els.settingsVenueName.value.trim() || createSeedState().venue.name,
    pickupPoint: els.settingsPickupPoint.value.trim() || createSeedState().venue.pickupPoint,
    averagePrepMinutes: clampNumber(Number(els.settingsPrepMinutes.value), 1, 30, createSeedState().venue.averagePrepMinutes),
    serviceOpen: els.settingsServiceOpen.checked,
  };

  try {
    if (runtime.mode === 'remote') {
      const response = await fetchJson('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      syncState(response.state);
    } else {
      state.venue = { ...state.venue, ...payload };
      saveLocalState();
      render();
    }
    showToast('Réglages enregistrés.');
  } catch (error) {
    showToast(error.message || 'Impossible d’enregistrer les réglages.');
  }
}

async function toggleAvailability(itemId) {
  try {
    if (runtime.mode === 'remote') {
      const response = await fetchJson(`/api/menu/${itemId}/toggle-availability`, {
        method: 'POST',
      });
      syncState(response.state);
    } else {
      const item = state.menu.find((entry) => entry.id === itemId);
      if (!item) return;
      item.available = !item.available;
      saveLocalState();
      render();
    }
    const item = state.menu.find((entry) => entry.id === itemId);
    showToast(`${item.name} ${item.available ? 'réactivé' : 'passé en rupture'}.`);
  } catch (error) {
    showToast(error.message || 'Impossible de modifier la disponibilité.');
  }
}

async function resetDemo() {
  ui.cart = [];
  ui.mobileFlowStarted = false;
  ui.mobileEntryMode = null;
  ui.menuFilter = 'all';
  localStorage.removeItem(LAST_ORDER_KEY);

  try {
    if (runtime.mode === 'remote') {
      const response = await fetchJson('/api/reset', { method: 'POST' });
      syncState(response.state);
    } else {
      state = createSeedState();
      saveLocalState();
      render();
    }
    showToast(runtime.mode === 'remote' ? 'Mode partagé réinitialisé.' : 'Mode local réinitialisé.');
  } catch (error) {
    showToast(error.message || 'Impossible de réinitialiser.');
  }
}

function lineTotal(entry, menuItem, option) {
  return entry.quantity * (menuItem.priceCents + option.priceDeltaCents);
}

function cartTotalCents() {
  return ui.cart.reduce((sum, entry) => {
    const menuItem = state.menu.find((item) => item.id === entry.itemId);
    const option = menuItem?.options.find((item) => item.id === entry.optionId);
    if (!menuItem || !option) return sum;
    return sum + lineTotal(entry, menuItem, option);
  }, 0);
}

function timelineDescription(step, order) {
  if (step === 'queued') return 'Commande enregistrée et validée.';
  if (step === 'preparing') return 'Le bar prépare la commande.';
  if (step === 'ready') return `Retrait à ${order.pickupPoint}.`;
  return 'Commande retirée au comptoir.';
}

function productTypeLabel(productType) {
  if (productType === 'bottle') return 'Bouteille';
  if (productType === 'soft') return 'Soft';
  return 'Verre';
}

function previousActionLabel(status) {
  if (status === 'ready') return 'Revenir en préparation';
  if (status === 'preparing') return 'Revenir en reçues';
  return 'Étape précédente';
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(mapApiError(payload.error || 'REQUEST_FAILED'));
  }
  return payload;
}

function mapApiError(code) {
  const messages = {
    EMPTY_CART: 'Le panier est vide.',
    SERVICE_CLOSED: 'Le service est fermé.',
    ITEM_UNAVAILABLE: 'Une boisson du panier n’est plus disponible.',
    INVALID_OPTION: 'Option de produit invalide.',
    INVALID_WORKFLOW_TRANSITION: 'Transition de statut invalide.',
    ORDER_NOT_FOUND: 'Commande introuvable.',
    ITEM_NOT_FOUND: 'Produit introuvable.',
  };
  return messages[code] || code;
}

function formatEuros(cents) {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(timestamp);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  clearTimeout(ui.toastTimer);
  ui.toastTimer = setTimeout(() => toast.remove(), 2400);
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
