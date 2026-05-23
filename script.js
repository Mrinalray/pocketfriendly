// ════════════════════════════════════════════════════════════════
//  POCKETFRIENDLY — script.js  (Backend-connected version)
//  Drop-in replacement for the in-memory script.
//  HTML does NOT need any changes.
// ════════════════════════════════════════════════════════════════

// ── CONFIG ───────────────────────────────────────────────────────
// 👇 Replace with your deployed Render / Railway URL
const BASE_URL = 'https://pocketfriendly-backend.onrender.com';

// ── PERSISTENT STATE ─────────────────────────────────────────────
// Token + user survive page refreshes via localStorage
let state = {
  get token() { return localStorage.getItem('pf_token'); },
  set token(v) { v ? localStorage.setItem('pf_token', v) : localStorage.removeItem('pf_token'); },
  get user()  { try { return JSON.parse(localStorage.getItem('pf_user')); } catch { return null; } },
  set user(v) { v ? localStorage.setItem('pf_user', JSON.stringify(v)) : localStorage.removeItem('pf_user'); },
  activeTrip: null,   // { _id, name, dest/destination, teamCode, budget, ... }
  trips: [],          // cache of all my trips
};

// ── API HELPER ────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body)        opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(BASE_URL + path, opts);
  } catch (err) {
    throw new Error('Cannot reach server. Check your connection.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// ════════════════════════════════════════════════════════════════
//  AUTH FLOW  (same function names as original)
// ════════════════════════════════════════════════════════════════
function showLanding() {
  document.getElementById('landing-section').style.display = 'block';
  document.getElementById('auth-page').style.display = 'none';
}

function showAuth(tab) {
  document.getElementById('landing-section').style.display = 'none';
  document.getElementById('auth-page').style.display = 'flex';
  switchTab(tab);
}

function switchTab(t) {
  ['login', 'register'].forEach(x => {
    document.getElementById('tab-' + x).classList.toggle('active', x === t);
    document.getElementById('form-' + x).classList.toggle('active', x === t);
  });
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw    = document.getElementById('login-pw').value;
  if (!email || !pw) { toast('⚠️', 'Please fill in email and password'); return; }

  const btn = document.querySelector('#form-login .btn-primary');
  setLoading(btn, true, 'Logging in…');

  try {
    const res  = await api('POST', '/api/auth/login', { email, password: pw });
    state.token = res.token;
    state.user  = res.user;
    await enterApp();
  } catch (e) {
    toast('❌', e.message);
  } finally {
    setLoading(btn, false, 'Log In');
  }
}

async function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pw    = document.getElementById('reg-pw').value;
  if (!name || !email || !pw) { toast('⚠️', 'Please fill in all fields'); return; }
  if (pw.length < 6)           { toast('⚠️', 'Password must be 6+ characters'); return; }

  const btn = document.querySelector('#form-register .btn-primary');
  setLoading(btn, true, 'Creating account…');

  try {
    const res  = await api('POST', '/api/auth/register', { name, email, password: pw });
    state.token = res.token;
    state.user  = res.user;
    await enterApp();
  } catch (e) {
    toast('❌', e.message);
  } finally {
    setLoading(btn, false, 'Create Account');
  }
}

function doLogout() {
  state.token      = null;
  state.user       = null;
  state.activeTrip = null;
  state.trips      = [];
  document.getElementById('app-shell').style.display = 'none';
  document.getElementById('auth-page').style.display = 'flex';
  switchTab('login');
  toast('👋', 'Logged out successfully');
}

async function enterApp() {
  document.getElementById('auth-page').style.display  = 'none';
  document.getElementById('app-shell').style.display  = 'flex';

  // Set sidebar user info
  const u        = state.user;
  const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('sidebar-name').textContent   = u.name.split(' ')[0];

  // Load trips, auto-select first
  await loadMyTrips();
  showPage('dashboard');
  toast('👋', 'Welcome back, ' + u.name.split(' ')[0] + '!');
}

// ════════════════════════════════════════════════════════════════
//  TRIPS CACHE
// ════════════════════════════════════════════════════════════════
async function loadMyTrips() {
  try {
    const data   = await api('GET', '/api/trips');
    state.trips  = data.trips || [];
    if (state.trips.length && !state.activeTrip) {
      state.activeTrip = state.trips[0];
    }
  } catch (e) {
    toast('❌', 'Failed to load trips: ' + e.message);
  }
}

// ════════════════════════════════════════════════════════════════
//  NAVIGATION  (same as original)
// ════════════════════════════════════════════════════════════════
const pageTitles = {
  dashboard: 'Dashboard', trips: 'My Trips', expenses: 'Expenses',
  members: 'Members', settle: 'Settle Up', join: 'Join Trip',
};
const pageCTAs   = {
  dashboard: '+ New Trip', trips: '+ New Trip', expenses: '+ Add Expense',
  members: '', settle: '', join: '',
};
const pageCTAfns = {
  dashboard: 'openCreateTrip()', trips: 'openCreateTrip()',
  expenses: 'openAddExpense()', members: '', settle: '', join: '',
};

function showPage(p) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + p).classList.add('active');
  document.getElementById('nav-' + p)?.classList.add('active');
  document.getElementById('page-title').textContent = pageTitles[p] || p;
  const cta = document.getElementById('topbar-cta');
  cta.textContent      = pageCTAs[p];
  cta.style.display    = pageCTAs[p] ? '' : 'none';
  if (pageCTAfns[p]) cta.setAttribute('onclick', pageCTAfns[p]);
  renderPage(p);
}

function renderPage(p) {
  if (p === 'dashboard') renderDashboard();
  if (p === 'trips')     renderTrips();
  if (p === 'expenses')  renderExpenses();
  if (p === 'members')   renderMembers();
  if (p === 'settle')    renderSettle();
}

// ════════════════════════════════════════════════════════════════
//  RENDER DASHBOARD
// ════════════════════════════════════════════════════════════════
async function renderDashboard() {
  const t = state.activeTrip;
  if (!t) {
    document.getElementById('dash-no-trip').style.display = '';
    document.getElementById('dash-main').style.display    = 'none';
    return;
  }
  document.getElementById('dash-no-trip').style.display = 'none';
  document.getElementById('dash-main').style.display    = '';

  // Populate header
  document.getElementById('trip-name-display').textContent = t.name;
  document.getElementById('trip-dest-display').textContent = t.destination || t.dest || 'No destination set';
  document.getElementById('trip-code-display').textContent = t.teamCode || t.code || '—';

  try {
    const [expData, memData] = await Promise.all([
      api('GET', `/api/expenses/${t._id}`),
      api('GET', `/api/members/${t._id}`),
    ]);

    const expenses = expData.expenses || [];
    const members  = memData.members  || [];
    const mCount   = members.length || 1;
    const uid      = state.user.id;

    const approved = expenses.filter(e => e.status === 'approved');
    const total    = approved.reduce((s, e) => s + e.amount, 0);
    const myShare  = total / mCount;
    const myPaid   = approved
      .filter(e => (e.paidBy?._id || e.paidBy) === uid)
      .reduce((s, e) => s + e.amount, 0);
    const owe = Math.max(0, myShare - myPaid);

    document.getElementById('stat-total').textContent = '₹' + total.toFixed(0);
    document.getElementById('stat-share').textContent = '₹' + myShare.toFixed(0);
    document.getElementById('stat-paid').textContent  = '₹' + myPaid.toFixed(0);
    document.getElementById('stat-owe').textContent   = '₹' + owe.toFixed(0);

    // Budget bar
    const budget = t.budget || 0;
    const pct    = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;
    const bar    = document.getElementById('budget-bar');
    bar.style.width      = pct + '%';
    bar.style.background = pct > 80 ? 'var(--danger)' : pct > 60 ? 'var(--gold)' : 'var(--cyan)';
    document.getElementById('budget-text').textContent = '₹' + total.toFixed(0) + ' / ₹' + budget;
    document.getElementById('budget-pct').textContent  = pct.toFixed(0) + '% of budget used';

    // Recent activity (last 3)
    const recent = expenses.slice(0, 3);
    const rl     = document.getElementById('recent-list');
    if (!recent.length) {
      rl.innerHTML = '<div class="text-muted text-sm">No expenses yet</div>';
      return;
    }
    rl.innerHTML = recent.map(e => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,200,224,.07);">
        <span style="font-size:18px;">${catIcon(e.category)}</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:500;">${e.name}</div>
          <div style="font-size:11px;color:var(--muted);">${fmtDate(e.date || e.createdAt)}</div>
        </div>
        <div style="font-size:14px;font-weight:700;">₹${e.amount}</div>
        <span class="badge ${statusClass(e.status)}">${e.status}</span>
      </div>`).join('');
  } catch (e) {
    toast('❌', 'Dashboard error: ' + e.message);
  }
}

// ════════════════════════════════════════════════════════════════
//  RENDER TRIPS
// ════════════════════════════════════════════════════════════════
async function renderTrips() {
  const wrap = document.getElementById('trips-list');
  wrap.innerHTML = '<div class="empty"><div class="empty-icon">⏳</div><div class="empty-title">Loading…</div></div>';

  try {
    await loadMyTrips();
    const trips = state.trips;

    if (!trips.length) {
      wrap.innerHTML = '<div class="empty"><div class="empty-icon">✈️</div><div class="empty-title">No trips yet</div><p class="text-sm text-muted" style="margin-top:8px">Create your first group trip!</p></div>';
      return;
    }

    wrap.innerHTML = '<div class="grid-2">' + trips.map(t => {
      const active = state.activeTrip?._id === t._id;
      const mems   = (t.members || []).length;
      return `<div class="card" style="cursor:pointer;border:1px solid ${active ? 'var(--cyan)' : 'var(--card-border)'}" onclick="selectTrip('${t._id}')">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <span style="font-size:28px;">✈️</span>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;">${t.name}</div>
            <div style="font-size:12px;color:var(--muted);">${t.destination || t.dest || 'No destination'}</div>
          </div>
          ${active ? '<span class="badge badge-cyan">Active</span>' : ''}
        </div>
        <div style="display:flex;gap:12px;margin-bottom:14px;">
          <div style="flex:1;background:rgba(0,200,224,.07);border-radius:8px;padding:10px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:var(--gold);">${mems}</div>
            <div style="font-size:11px;color:var(--muted);">members</div>
          </div>
          <div style="flex:1;background:rgba(0,200,224,.07);border-radius:8px;padding:10px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:var(--cyan);">₹${t.budget || 0}</div>
            <div style="font-size:11px;color:var(--muted);">budget</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:12px;color:var(--muted);">Code: <strong style="color:var(--cyan);letter-spacing:.1em;">${t.teamCode || t.code || '—'}</strong></span>
          ${!active
            ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();selectTrip('${t._id}')">Set Active</button>`
            : '<span style="font-size:12px;color:var(--success);">✓ Currently active</span>'}
        </div>
      </div>`;
    }).join('') + '</div>';
  } catch (e) {
    wrap.innerHTML = `<div class="empty"><div class="empty-icon">❌</div><div class="empty-title">${e.message}</div></div>`;
  }
}

function selectTrip(id) {
  state.activeTrip = state.trips.find(t => t._id === id) || null;
  if (state.activeTrip) toast('✈️', 'Switched to ' + state.activeTrip.name);
  renderTrips();
  renderDashboard();
}

// ════════════════════════════════════════════════════════════════
//  RENDER EXPENSES
// ════════════════════════════════════════════════════════════════
async function renderExpenses() {
  const el = document.getElementById('expenses-list');
  if (!state.activeTrip) {
    el.innerHTML = '<div class="empty" style="padding:32px 20px;"><div class="empty-icon">💳</div><div class="empty-title">No active trip</div></div>';
    return;
  }
  el.innerHTML = '<div class="empty" style="padding:32px 20px;"><div class="empty-icon">⏳</div><div class="empty-title">Loading…</div></div>';

  try {
    const [expData, memData] = await Promise.all([
      api('GET', `/api/expenses/${state.activeTrip._id}`),
      api('GET', `/api/members/${state.activeTrip._id}`),
    ]);

    const expenses = expData.expenses || [];
    const members  = memData.members  || [];
    const uid      = state.user.id;

    if (!expenses.length) {
      el.innerHTML = '<div class="empty" style="padding:32px 20px;"><div class="empty-icon">💳</div><div class="empty-title">No expenses yet</div><p class="text-sm text-muted">Add the first expense for this trip</p></div>';
      return;
    }

    el.innerHTML = expenses.map(e => {
      const payerId       = e.paidBy?._id || e.paidBy;
      const payerName     = e.paidBy?.name || 'Unknown';
      const approvalCount = e.approvals?.length || 0;
      const totalMembers  = members.length || 1;
      const alreadyApproved = (e.approvals || []).some(a => (a.user?._id || a.user) === uid);
      const isMyExpense   = payerId === uid;
      const canApprove    = e.status === 'pending' && !alreadyApproved && !isMyExpense;
      const canReject     = e.status === 'pending' && !isMyExpense;

      return `<div class="expense-row">
        <div class="expense-cat">${catIcon(e.category)}</div>
        <div class="expense-info">
          <div class="expense-name">${e.name}</div>
          <div class="expense-meta">By ${payerName} · ${fmtDate(e.date || e.createdAt)} · ${e.notes || 'No notes'}</div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
            <div class="progress-bar" style="width:80px;">
              <div class="progress-fill" style="width:${((approvalCount / totalMembers) * 100).toFixed(0)}%"></div>
            </div>
            <span style="font-size:11px;color:var(--muted);">${approvalCount}/${totalMembers} approved</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="expense-amt">₹${e.amount}</div>
          <span class="badge ${statusClass(e.status)}">${e.status}</span>
        </div>
        <div class="approve-btns">
          ${canApprove ? `<button class="btn btn-sm" style="background:rgba(78,203,141,.15);color:var(--success);border:1px solid rgba(78,203,141,.3);" onclick="approveExp('${e._id}')">✓ Approve</button>` : ''}
          ${canReject  ? `<button class="btn btn-sm btn-danger" onclick="rejectExp('${e._id}')">✗</button>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<div class="empty" style="padding:32px 20px;"><div class="empty-icon">❌</div><div class="empty-title">${e.message}</div></div>`;
  }
}

async function approveExp(id) {
  try {
    await api('PUT', `/api/expenses/${id}/approve`);
    toast('✅', 'Expense approved!');
    renderExpenses();
    renderDashboard();
  } catch (e) { toast('❌', e.message); }
}

async function rejectExp(id) {
  try {
    await api('PUT', `/api/expenses/${id}/reject`);
    toast('❌', 'Expense rejected.');
    renderExpenses();
    renderDashboard();
  } catch (e) { toast('❌', e.message); }
}

// ════════════════════════════════════════════════════════════════
//  RENDER MEMBERS
// ════════════════════════════════════════════════════════════════
async function renderMembers() {
  const wrap = document.getElementById('members-list-wrap');
  if (!state.activeTrip) {
    wrap.innerHTML = '<div class="empty"><div class="empty-icon">👥</div><div class="empty-title">No active trip</div></div>';
    return;
  }
  wrap.innerHTML = '<div class="empty"><div class="empty-icon">⏳</div><div class="empty-title">Loading…</div></div>';

  try {
    const data    = await api('GET', `/api/members/${state.activeTrip._id}`);
    const members = data.members || [];

    if (!members.length) {
      wrap.innerHTML = '<div class="empty"><div class="empty-icon">👥</div><div class="empty-title">No members</div></div>';
      return;
    }

    wrap.innerHTML = '<div class="members-list">' + members.map(m => {
      const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      const balClass = m.balance > 0 ? 'balance-pos' : m.balance < 0 ? 'balance-neg' : 'balance-zero';
      const balLabel = m.balance > 0 ? 'to receive'  : m.balance < 0 ? 'to pay'       : 'settled';

      return `<div class="member-row">
        <div class="avatar lg">${initials}</div>
        <div class="member-info">
          <div class="member-name">${m.name}
            ${m.isCreator ? '<span class="badge badge-cyan" style="font-size:10px;margin-left:6px;">Creator</span>' : ''}
          </div>
          <div class="member-email">${m.email}</div>
          <div style="margin-top:6px;font-size:12px;color:var(--muted);">
            Paid ₹${(m.totalPaid || 0).toFixed(0)} · Share ₹${(m.share || 0).toFixed(0)}
          </div>
        </div>
        <div class="member-balance">
          <div class="${balClass}">${m.balance > 0 ? '+' : ''}₹${Math.abs(m.balance || 0).toFixed(0)}</div>
          <div style="font-size:11px;color:var(--muted);">${balLabel}</div>
        </div>
      </div>`;
    }).join('') + '</div>';

    // Team code invite box
    const code = data.teamCode || state.activeTrip.teamCode || '—';
    wrap.innerHTML += `
      <div style="margin-top:16px;padding:14px 16px;background:var(--card);border:1px solid var(--card-border);border-radius:var(--radius-sm);">
        <div style="font-size:13px;color:var(--muted);">Share this code to invite more people:</div>
        <div style="font-size:24px;font-weight:700;color:var(--cyan);letter-spacing:.15em;margin-top:6px;cursor:pointer;" onclick="copyCode()">${code}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">Click to copy</div>
      </div>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty"><div class="empty-icon">❌</div><div class="empty-title">${e.message}</div></div>`;
  }
}

// ════════════════════════════════════════════════════════════════
//  RENDER SETTLE UP
// ════════════════════════════════════════════════════════════════
async function renderSettle() {
  const wrap = document.getElementById('settle-wrap');
  if (!state.activeTrip) {
    wrap.innerHTML = '<div class="empty"><div class="empty-icon">💸</div><div class="empty-title">No active trip</div></div>';
    return;
  }
  wrap.innerHTML = '<div class="empty"><div class="empty-icon">⏳</div><div class="empty-title">Calculating…</div></div>';

  try {
    const data = await api('GET', `/api/settle/${state.activeTrip._id}`);
    const iOwe = data.iOwe || [];

    if (!iOwe.length) {
      wrap.innerHTML = `
        <div class="card" style="text-align:center;padding:36px;">
          <div style="font-size:48px;margin-bottom:12px;">🎉</div>
          <div style="font-size:20px;font-weight:700;margin-bottom:6px;">You're all settled up!</div>
          <div class="text-muted text-sm">No outstanding balances for this trip.</div>
        </div>`;
      return;
    }

    wrap.innerHTML = '<div class="section-label mb-2">You need to pay</div>' +
      iOwe.map(s => `
        <div class="card" style="margin-bottom:12px;display:flex;align-items:center;gap:16px;">
          <div style="font-size:36px;">💸</div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;">Pay ${s.toName}</div>
            <div style="font-size:13px;color:var(--muted);">Your share minus your payments</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:24px;font-weight:700;color:var(--danger);">₹${s.amount.toFixed(0)}</div>
            <button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="markSettled('${s.to}', ${s.amount})">Mark Settled ✓</button>
          </div>
        </div>`).join('');

    // Show "others owe you" section too
    const iAmOwed = data.iAmOwed || [];
    if (iAmOwed.length) {
      wrap.innerHTML += '<div class="section-label mb-2" style="margin-top:20px;">Others owe you</div>' +
        iAmOwed.map(s => `
          <div class="card" style="margin-bottom:12px;display:flex;align-items:center;gap:16px;">
            <div style="font-size:36px;">🤝</div>
            <div style="flex:1;">
              <div style="font-size:16px;font-weight:700;">${s.fromName} owes you</div>
            </div>
            <div style="font-size:24px;font-weight:700;color:var(--success);">₹${s.amount.toFixed(0)}</div>
          </div>`).join('');
    }
  } catch (e) {
    wrap.innerHTML = `<div class="empty"><div class="empty-icon">❌</div><div class="empty-title">${e.message}</div></div>`;
  }
}

async function markSettled(toUserId, amount) {
  try {
    await api('POST', '/api/settle', {
      tripId:   state.activeTrip._id,
      toUserId,
      amount,
    });
    toast('✅', 'Marked as settled!');
    renderSettle();
    renderDashboard();
  } catch (e) { toast('❌', e.message); }
}

// ════════════════════════════════════════════════════════════════
//  ACTIONS — create trip, add expense, join trip
// ════════════════════════════════════════════════════════════════
function openCreateTrip() {
  document.getElementById('modal-trip').classList.add('open');
}

function openAddExpense() {
  if (!state.activeTrip) {
    toast('⚠️', 'Please select or create a trip first');
    showPage('trips');
    return;
  }
  document.getElementById('modal-expense').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

async function createTrip() {
  const name   = document.getElementById('m-trip-name').value.trim();
  const dest   = document.getElementById('m-trip-dest').value.trim();
  const budget = document.getElementById('m-trip-budget').value;
  if (!name) { toast('⚠️', 'Please enter a trip name'); return; }

  const btn = document.querySelector('#modal-trip .btn-primary');
  setLoading(btn, true, 'Creating…');

  try {
    const data = await api('POST', '/api/trips', {
      name,
      destination: dest,
      budget: parseFloat(budget) || 0,
    });

    state.trips.unshift(data.trip);
    state.activeTrip = data.trip;

    closeModal('modal-trip');
    document.getElementById('m-trip-name').value   = '';
    document.getElementById('m-trip-dest').value   = '';
    document.getElementById('m-trip-budget').value = '';

    toast('✈️', `Trip "${name}" created! Code: ${data.trip.teamCode}`);
    showPage('dashboard');
  } catch (e) {
    toast('❌', e.message);
  } finally {
    setLoading(btn, false, 'Create Trip');
  }
}

async function addExpense() {
  const name  = document.getElementById('m-exp-name').value.trim();
  const amt   = document.getElementById('m-exp-amt').value;
  const cat   = document.getElementById('m-exp-cat').value;
  const notes = document.getElementById('m-exp-notes').value.trim();
  const split = document.getElementById('m-exp-split').value;

  if (!name || !amt)    { toast('⚠️', 'Fill in name and amount'); return; }
  if (parseFloat(amt) <= 0) { toast('⚠️', 'Amount must be positive'); return; }

  // Map emoji-only category value to full backend category string
  const catMap = {
    '🏨': '🏨 Hotel', '🍽': '🍽 Food', '🚗': '🚗 Transport',
    '🎡': '🎡 Activities', '🛒': '🛒 Shopping', '⛽': '⛽ Fuel',
    '💊': '💊 Medical', '🎟': '🎟 Tickets',
  };
  const category = catMap[cat] || '🔖 Other';

  const btn = document.querySelector('#modal-expense .btn-primary');
  setLoading(btn, true, 'Adding…');

  try {
    await api('POST', '/api/expenses', {
      tripId:    state.activeTrip._id,
      name,
      amount:    parseFloat(amt),
      category,
      notes,
      splitType: split,
    });

    closeModal('modal-expense');
    document.getElementById('m-exp-name').value  = '';
    document.getElementById('m-exp-amt').value   = '';
    document.getElementById('m-exp-notes').value = '';

    toast('💳', 'Expense added — awaiting group approval');
    renderExpenses();
    renderDashboard();
  } catch (e) {
    toast('❌', e.message);
  } finally {
    setLoading(btn, false, 'Add Expense');
  }
}

async function joinTrip() {
  const code = document.getElementById('join-code-input').value.trim();
  if (!code) { toast('⚠️', 'Enter a team code'); return; }

  const btn = document.querySelector('#page-join .btn-primary');
  setLoading(btn, true, 'Joining…');

  try {
    const data = await api('POST', '/api/trips/join', { teamCode: code.toUpperCase() });

    state.trips.unshift(data.trip);
    state.activeTrip = data.trip;

    document.getElementById('join-code-input').value = '';
    toast('✈️', `Joined "${data.trip.name}"!`);
    showPage('dashboard');
  } catch (e) {
    toast('❌', e.message);
  } finally {
    setLoading(btn, false, 'Join Trip');
  }
}

function copyCode() {
  const code = state.activeTrip?.teamCode || state.activeTrip?.code;
  if (!code) return;
  navigator.clipboard.writeText(code).catch(() => {});
  toast('📋', 'Code copied: ' + code);
}

// ════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function statusClass(status) {
  return status === 'approved' ? 'badge-success' : status === 'rejected' ? 'badge-danger' : 'badge-gold';
}

function catIcon(cat) {
  if (!cat) return '🔖';
  const icons = { Hotel:'🏨', Food:'🍽', Transport:'🚗', Activities:'🎡', Shopping:'🛒', Fuel:'⛽', Medical:'💊', Tickets:'🎟', Other:'🔖' };
  for (const [k, v] of Object.entries(icons)) {
    if (cat.includes(k)) return v;
  }
  return cat.split(' ')[0] || '🔖'; // fallback: use whatever emoji is in the string
}

// Button loading state helper
function setLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? label : btn.dataset.label || label;
  if (!loading) btn.dataset.label = label;
}

// Toast — same signature as original: toast(icon, msg)
let _toastTimer;
function toast(icon, msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent  = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ════════════════════════════════════════════════════════════════
//  BOOT — auto-login if token exists in localStorage
// ════════════════════════════════════════════════════════════════
(async function boot() {
  if (state.token && state.user) {
    try {
      // Verify token is still valid
      await api('GET', '/api/auth/me');
      await enterApp();
    } catch {
      // Token expired or invalid — clear and show auth
      state.token = null;
      state.user  = null;
      showLanding();
    }
  } else {
    showLanding();
  }
})();