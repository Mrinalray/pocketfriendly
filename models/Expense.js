const mongoose = require('mongoose');

const CATEGORIES = [
  '🏨 Hotel', '🍽 Food', '🚗 Transport', '🎡 Activities',
  '🛒 Shopping', '⛽ Fuel', '💊 Medical', '🎟 Tickets', '🔖 Other',
];

const ExpenseSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Expense name is required'],
    trim: true,
    maxlength: [100, 'Name too long'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least ₹1'],
  },
  category: {
    type: String,
    enum: { values: CATEGORIES, message: '{VALUE} is not a valid category' },
    default: '🔖 Other',
  },
  notes:     { type: String, default: '', maxlength: [300, 'Notes too long'] },
  splitType: { type: String, enum: ['equal', 'custom'], default: 'equal' },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approvals: [
    {
      user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: { type: Date, default: Date.now },
    }
  ],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  date:      { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Expense', ExpenseSchema);
