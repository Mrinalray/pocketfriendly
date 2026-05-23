const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema({
  trip:     { type: mongoose.Schema.Types.ObjectId, ref: 'Trip',  required: true, index: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  toUser:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  amount:   { type: Number, required: true, min: [0.01, 'Amount must be positive'] },
  note:     { type: String, default: '' },
  settledAt:{ type: Date, default: Date.now },
});

module.exports = mongoose.model('Settlement', SettlementSchema);
