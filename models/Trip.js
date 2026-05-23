const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Trip name is required'],
    trim: true,
    maxlength: [80, 'Trip name cannot exceed 80 characters'],
  },
  destination: { type: String, trim: true, default: '' },
  budget:      { type: Number, default: 0, min: [0, 'Budget cannot be negative'] },
  teamCode: {
    type: String,
    unique: true,
    uppercase: true,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [
    {
      user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      joinedAt: { type: Date, default: Date.now },
    }
  ],
  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Auto-generate unique team code
TripSchema.pre('save', async function (next) {
  if (this.teamCode) return next();
  const prefix = this.name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(3, 'X');
  let code, exists;
  do {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    code = (prefix + suffix).slice(0, 8);
    exists = await mongoose.model('Trip').findOne({ teamCode: code });
  } while (exists);
  this.teamCode = code;
  next();
});

module.exports = mongoose.model('Trip', TripSchema);
