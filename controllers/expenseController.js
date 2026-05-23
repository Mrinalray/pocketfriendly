const Expense = require('../models/Expense');
const Trip    = require('../models/Trip');

const populateExpense = (query) =>
  query
    .populate('paidBy', 'name email')
    .populate('approvals.user', 'name email');

// ── POST /api/expenses ───────────────────────────────────────
const addExpense = async (req, res) => {
  try {
    const { tripId, name, amount, category, notes, splitType } = req.body;

    if (!tripId || !name?.trim() || !amount) {
      return res.status(400).json({ success: false, message: 'tripId, name and amount are required.' });
    }
    if (parseFloat(amount) < 1) {
      return res.status(400).json({ success: false, message: 'Amount must be at least ₹1.' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

    const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'You are not a member of this trip.' });

    // Creator auto-approves; auto-approve if only member
    const expense = await Expense.create({
      trip:      tripId,
      name:      name.trim(),
      amount:    parseFloat(amount),
      category:  category || '🔖 Other',
      notes:     notes?.trim() || '',
      splitType: splitType || 'equal',
      paidBy:    req.user._id,
      approvals: [{ user: req.user._id }],
      status:    trip.members.length === 1 ? 'approved' : 'pending',
    });

    const populated = await populateExpense(Expense.findById(expense._id));

    res.status(201).json({
      success: true,
      message: trip.members.length === 1
        ? '✅ Expense added and auto-approved!'
        : '✅ Expense added! Waiting for group approval.',
      expense: populated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/expenses/:tripId ────────────────────────────────
const getTripExpenses = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

    const isMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'You are not a member of this trip.' });

    const expenses = await populateExpense(
      Expense.find({ trip: req.params.tripId }).sort({ createdAt: -1 })
    );

    // Summary stats
    const approved = expenses.filter(e => e.status === 'approved');
    const totalApproved = approved.reduce((s, e) => s + e.amount, 0);
    const myExpenses    = expenses.filter(e => e.paidBy._id.toString() === req.user._id.toString());
    const myTotal       = myExpenses.reduce((s, e) => s + e.amount, 0);

    res.json({
      success:  true,
      count:    expenses.length,
      summary:  { totalApproved, myTotal, pending: expenses.filter(e => e.status === 'pending').length },
      expenses,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/expenses/:id/approve ────────────────────────────
const approveExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

    if (expense.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Expense is already ${expense.status}.` });
    }

    const alreadyApproved = expense.approvals.some(a => a.user.toString() === req.user._id.toString());
    if (alreadyApproved) {
      return res.status(400).json({ success: false, message: 'You have already approved this expense.' });
    }

    expense.approvals.push({ user: req.user._id });

    const trip = await Trip.findById(expense.trip);
    if (expense.approvals.length >= trip.members.length) {
      expense.status = 'approved';
    }

    await expense.save();
    const populated = await populateExpense(Expense.findById(expense._id));

    res.json({
      success: true,
      message: expense.status === 'approved'
        ? '✅ Expense fully approved!'
        : `✅ Approval recorded. (${expense.approvals.length}/${trip.members.length} approvals)`,
      expense: populated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/expenses/:id/reject ─────────────────────────────
const rejectExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

    if (expense.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Expense is already ${expense.status}.` });
    }

    expense.status = 'rejected';
    await expense.save();

    res.json({ success: true, message: 'Expense rejected.', expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/expenses/:id ─────────────────────────────────
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

    if (expense.paidBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the person who added this expense can delete it.' });
    }

    await expense.deleteOne();
    res.json({ success: true, message: 'Expense deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { addExpense, getTripExpenses, approveExpense, rejectExpense, deleteExpense };
