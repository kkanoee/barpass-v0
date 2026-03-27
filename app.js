const STORAGE_KEY = 'barpass-v0-state';
const LAST_ORDER_KEY = 'barpass-v0-last-order';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('barpass-v0') : null;

const workflow = ['queued', 'preparing', 'ready', 'completed'];
const workflowLabels = {
  queued: 'En file',
  preparing: 'En préparation',
  ready: 'Prête',
  completed: 'Retirée',
};

const seedState = () => ({
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
});

const ui = {
  cart: [],
  activeView: 'client',
  toastTimer: null,
};

let state = loadState();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedState();
  try {
    const parsed = JSON.parse(raw);
    return {
      ...seedState(),
      ...parsed,
      venue: { ...seedState().venue, ...(parsed.venue || {}) },
      menu: Array.isArray(parsed.menu) ? parsed.menu : seedState().menu,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      lastSequence: Number.isFinite(parsed.lastSequence) ? parsed.lastSequence : 0,
    };
  } catch {
    return seedState();
  }
}

function saveState(announce = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (announce && channel) channel.postMessage({ type: 'state-updated', state });
}

function syncState(nextState) {
  state = nextState;
  render();
}

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    try {
      syncState(JSON.parse(event.newValue));
    } catch {
      // ignore malformed sync payloads
    }
  }
});

if (channel) {
  channel.addEventListener('message', (event) => {
    if (event.data?.type === 'state-updated') {
      syncState(event.data.state);
    }
  });
}

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
  settingsVenueName: document.getElementById('settings-venue-name'),
  settingsPickupPoint: document.getElementById('settings-pickup-point'),
  settingsPrepMinutes: document.getElementById('settings-prep-minutes'),
  settingsServiceOpen: document.getElementById('settings-service-open'),
  stockList: document.getElementById('stock-list'),
  saveSettingsButton: document.getElementById('save-settings-button'),
  resetDemoButton: document.getElementById('reset-demo-button'),
  menuItemTemplate: document.getElementById('menu-item-template'),
};

bindEvents();
render();

function bindEvents() {
  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  els.checkoutButton.addEventListener('click', checkout);
  els.saveSettingsButton.addEventListener('click', saveSettings);
  els.resetDemoButton.addEventListener('click', resetDemo);
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

function render() {
  renderVenue();
  renderMenu();
  renderCart();
  renderCurrentOrder();
  renderBar();
  renderPilotage();
}

function renderVenue() {
  els.venueName.textContent = state.venue.name;
  els.pickupSummary.textContent = `Retrait unique · ${state.venue.pickupPoint}`;
  els.pickupLabel.textContent = state.venue.pickupPoint;
  els.avgWaitLabel.textContent = `${estimateWaitMinutes()} min`;
  els.servicePill.textContent = state.venue.serviceOpen ? 'Service ouvert' : 'Service fermé';
  els.servicePill.className = `badge ${state.venue.serviceOpen ? 'success' : 'warning'}`;
}

function renderMenu() {
  els.menuList.innerHTML = '';
  state.menu.forEach((item) => {
    const node = els.menuItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.menu-title').textContent = item.name;
    node.querySelector('.menu-description').textContent = item.description;
    node.querySelector('.menu-price').textContent = formatEuros(item.priceCents);
    node.querySelector('.menu-category').textContent = item.category;
    node.querySelector('.menu-stock').textContent = item.available ? 'Disponible' : 'Indisponible';

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
    ui.cart.push({
      itemId: item.id,
      optionId: option.id,
      quantity: 1,
    });
  }

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
      renderCart();
    });
    els.cartItems.appendChild(row);
  });

  els.cartTotal.textContent = formatEuros(cartTotalCents());
}

function checkout() {
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
  const unavailable = ui.cart.some((entry) => {
    const item = state.menu.find((menuItem) => menuItem.id === entry.itemId);
    return !item?.available;
  });

  if (unavailable) {
    showToast('Une boisson du panier n’est plus disponible.');
    return;
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
    estimateMinutes: estimateWaitMinutes() + state.venue.averagePrepMinutes,
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
  localStorage.setItem(LAST_ORDER_KEY, order.id);
  saveState();

  ui.cart = [];
  els.checkoutName.value = customerName;
  els.checkoutNote.value = '';
  render();
  showToast(`Commande #${sequence} payée. Retrait à ${state.venue.pickupPoint}.`);
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

  renderOrderColumn(els.ordersQueued, state.orders.filter((order) => order.status === 'queued'), 'Commencer');
  renderOrderColumn(els.ordersPreparing, state.orders.filter((order) => order.status === 'preparing'), 'Marquer prête');
  renderOrderColumn(els.ordersReady, state.orders.filter((order) => order.status === 'ready'), 'Commande retirée');
  renderOrderColumn(els.ordersCompleted, state.orders.filter((order) => order.status === 'completed').slice(0, 6), null);
}

function renderOrderColumn(container, orders, actionLabel) {
  container.innerHTML = '';

  if (!orders.length) {
    container.innerHTML = '<div class="empty-state">Aucune commande ici.</div>';
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement('article');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-card-head">
        <div>
          <strong>#${order.sequence}</strong>
          <div class="muted">${escapeHtml(order.customerName)} · ${formatTime(order.createdAt)}</div>
        </div>
        <span class="badge">${workflowLabels[order.status]}</span>
      </div>
      <div class="order-tags">
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
      nextButton.addEventListener('click', () => advanceOrder(order.id));
      actions.appendChild(nextButton);

      if (order.status !== 'completed') {
        const cancelButton = document.createElement('button');
        cancelButton.className = 'secondary-button';
        cancelButton.textContent = 'Revenir en file';
        cancelButton.disabled = order.status === 'queued';
        cancelButton.addEventListener('click', () => regressOrder(order.id));
        actions.appendChild(cancelButton);
      }

      card.appendChild(actions);
    }

    container.appendChild(card);
  });
}

function advanceOrder(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;
  const index = workflow.indexOf(order.status);
  if (index === -1 || index >= workflow.length - 1) return;
  order.status = workflow[index + 1];
  order.updatedAt = Date.now();
  saveState();
  render();
  showToast(`Commande #${order.sequence} → ${workflowLabels[order.status]}.`);
}

function regressOrder(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;
  const index = workflow.indexOf(order.status);
  if (index <= 0) return;
  order.status = workflow[index - 1];
  order.updatedAt = Date.now();
  saveState();
  render();
  showToast(`Commande #${order.sequence} renvoyée en ${workflowLabels[order.status].toLowerCase()}.`);
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

function saveSettings() {
  state.venue.name = els.settingsVenueName.value.trim() || seedState().venue.name;
  state.venue.pickupPoint = els.settingsPickupPoint.value.trim() || seedState().venue.pickupPoint;
  state.venue.averagePrepMinutes = clampNumber(Number(els.settingsPrepMinutes.value), 1, 30, seedState().venue.averagePrepMinutes);
  state.venue.serviceOpen = els.settingsServiceOpen.checked;

  saveState();
  render();
  showToast('Réglages enregistrés.');
}

function toggleAvailability(itemId) {
  const item = state.menu.find((entry) => entry.id === itemId);
  if (!item) return;
  item.available = !item.available;
  saveState();
  render();
  showToast(`${item.name} ${item.available ? 'réactivé' : 'passé en rupture'}.`);
}

function resetDemo() {
  state = seedState();
  ui.cart = [];
  localStorage.removeItem(LAST_ORDER_KEY);
  saveState();
  render();
  showToast('Démo BarPass réinitialisée.');
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

function estimateWaitMinutes() {
  const queueDepth = state.orders.filter((order) => ['queued', 'preparing'].includes(order.status)).length;
  return Math.max(state.venue.averagePrepMinutes, Math.round((queueDepth + 1) * (state.venue.averagePrepMinutes / 2)));
}

function timelineDescription(step, order) {
  if (step === 'queued') return 'Commande enregistrée et payée.';
  if (step === 'preparing') return 'Le bar traite la commande.';
  if (step === 'ready') return `Retrait à ${order.pickupPoint}.`;
  return 'Commande retirée au comptoir.';
}

function formatEuros(cents) {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(timestamp);
}

function escapeHtml(value) {
  return value
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
