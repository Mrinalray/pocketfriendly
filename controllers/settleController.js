const Expense    = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Trip       = require('../models/Trip');

/**
 * Greedy debt-minimization: given net balances, produce
 * the minimum number of transactions to settle everyone.
 */
function minimizeDebts(balanceMap, memberMap) {
  const eps = 0.01; // treat < 1 paisa as zero

  const creditors = []; // owe money to group (paid more than share)
  const debtors   = []; // owe group money (paid less than share)

  for (const [id, bal] of Object.entries(balanceMap)) {
    if (bal > eps)  creditors.push({ id, name: memberMap[id], balance: bal });
    if (bal < -eps) debtors.push({ id, name: memberMap[id], balance: bal });
  }

  // Sort descending so largest debts get resolved first
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance);

  const transactions = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = parseFloat(Math.min(c.balance, Math.abs(d.balance)).toFixed(2));

    transactions.push({
      from:     d.id,
      fromName: d.name,
      to:       c.id,
      toName:   c.name,
      amount,
    });

    c.balance -= amount;
    d.balance += amount;

    if (Math.abs(c.balance) < eps) ci++;
    if (Math.abs(d.balance) < eps) di++;
  }

  return transactions;
}

// ── GET /api/settle/:tripId ──────────────────────────────────
const getSettlements = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId)
      .populate('members.user', 'name email');

    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

    const isMember = trip.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'You are not a member of this trip.' });

    const members     = trip.members.map(m => m.user);
    const memberCount = members.length;

    // Build member name lookup
    const memberMap = {};
    members.forEach(m => { memberMap[m._id.toString()] = m.name; });

    // Net balance per member from approved expenses
    const balanceMap = {};
    members.forEach(m => { balanceMap[m._id.toString()] = 0; });

    const expenses = await Expense.find({ trip: req.params.tripId, status: 'approved' });
    expenses.forEach(exp => {
      const share = exp.amount / memberCount;
      balanceMap[exp.paidBy.toString()] += exp.amount;
      members.forEach(m => { balanceMap[m._id.toString()] -= share; });
    });

    // Offset already-recorded settlements
    const settled = await Settlement.find({ trip: req.params.tripId });
    settled.forEach(s => {
      if (balanceMap[s.fromUser.toString()] !== undefined) balanceMap[s.fromUser.toString()] += s.amount;
      if (balanceMap[s.toUser.toString()]   !== undefined) balanceMap[s.toUser.toString()]   -= s.amount;
    });

    const allDebts = minimizeDebts(balanceMap, memberMap);

    const uid        = req.user._id.toString();
    const myBalance  = parseFloat((balanceMap[uid] || 0).toFixed(2));
    const iOwe       = allDebts.filter(d => d.from.toString() === uid);
    const iAmOwed    = allDebts.filter(d => d.to.toString()   === uid);

    res.json({
      success:     true,
      myBalance,                // positive → others owe you, negative → you owe
      iOwe,
      iAmOwed,
      allDebts,
      allBalances: members.map(m => ({
        id:      m._id,
        name:    m.name,
        balance: parseFloat((balanceMap[m._id.toString()] || 0).toFixed(2)),
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/settle ─────────────────────────────────────────
const markSettled = async (req, res) => {
  try {
    const { tripId, toUserId, amount, note } = req.body;

    if (!tripId || !toUserId || !amount) {
      return res.status(400).json({ success: false, message: 'tripId, toUserId and amount are required.' });
    }
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be positive.' });
    }

    // Verify both users are members
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

    const fromMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
    const toMember   = trip.members.some(m => m.user.toString() === toUserId);
    if (!fromMember || !toMember) {
      return res.status(400).json({ success: false, message: 'Both users must be trip members.' });
    }

    const settlement = await Settlement.create({
      trip:     tripId,
      fromUser: req.user._id,
      toUser:   toUserId,
      amount:   parseFloat(parseFloat(amount).toFixed(2)),
      note:     note?.trim() || '',
    });

    res.status(201).json({
      success:    true,
      message:    '✅ Payment recorded! Settlement updated.',
      settlement,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getSettlements, markSettled };
