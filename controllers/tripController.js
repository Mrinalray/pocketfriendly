const Trip    = require('../models/Trip');
const Expense = require('../models/Expense');

// Populate helper
const populateTrip = (query) =>
  query
    .populate('createdBy', 'name email')
    .populate('members.user', 'name email');

// ── POST /api/trips ──────────────────────────────────────────
const createTrip = async (req, res) => {
  try {
    const { name, destination, budget } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Trip name is required.' });
    }

    const trip = await Trip.create({
      name:        name.trim(),
      destination: destination?.trim() || '',
      budget:      parseFloat(budget) || 0,
      createdBy:   req.user._id,
      members:     [{ user: req.user._id }],
    });

    await populateTrip(Trip.findById(trip._id)).then(t => { trip.__proto__ = t.__proto__; Object.assign(trip, t.toObject()); });
    const populated = await populateTrip(Trip.findById(trip._id));

    res.status(201).json({
      success: true,
      message: `Trip "${populated.name}" created! Share code: ${populated.teamCode} 🎉`,
      trip:    populated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/trips ───────────────────────────────────────────
const getMyTrips = async (req, res) => {
  try {
    const trips = await populateTrip(
      Trip.find({ 'members.user': req.user._id, isActive: true }).sort({ createdAt: -1 })
    );

    res.json({ success: true, count: trips.length, trips });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/trips/:id ───────────────────────────────────────
const getTrip = async (req, res) => {
  try {
    const trip = await populateTrip(Trip.findById(req.params.id));

    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

    const isMember = trip.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'You are not a member of this trip.' });

    res.json({ success: true, trip });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid trip ID.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/trips/join ─────────────────────────────────────
const joinTrip = async (req, res) => {
  try {
    const { teamCode } = req.body;

    if (!teamCode?.trim()) {
      return res.status(400).json({ success: false, message: 'Team code is required.' });
    }

    const trip = await Trip.findOne({ teamCode: teamCode.trim().toUpperCase() });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'No trip found with that team code.' });
    }

    const alreadyMember = trip.members.some(m => m.user.toString() === req.user._id.toString());
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'You are already a member of this trip.' });
    }

    trip.members.push({ user: req.user._id });
    await trip.save();

    const populated = await populateTrip(Trip.findById(trip._id));

    res.json({
      success: true,
      message: `Joined "${trip.name}" successfully! Welcome aboard 🎉`,
      trip:    populated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/trips/:id ────────────────────────────────────
const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

    if (trip.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the trip creator can delete it.' });
    }

    // Also delete related expenses
    await Expense.deleteMany({ trip: trip._id });
    await trip.deleteOne();

    res.json({ success: true, message: 'Trip and all its expenses have been deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createTrip, getMyTrips, getTrip, joinTrip, deleteTrip };
