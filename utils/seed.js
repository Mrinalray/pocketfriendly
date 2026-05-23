/**
 * Seed script — run with: npm run seed
 * Creates demo user (demo@pf.com / demo123) + a sample trip + expenses
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User       = require('../models/User');
const Trip       = require('../models/Trip');
const Expense    = require('../models/Expense');
const Settlement = require('../models/Settlement');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // ── Demo user ──────────────────────────────────────────────
  let demo = await User.findOne({ email: 'demo@pf.com' });
  if (!demo) {
    demo = await User.create({
      name:     'Demo User',
      email:    'demo@pf.com',
      password: 'demo123',
      isDemo:   true,
    });
    console.log('✅ Created demo user: demo@pf.com / demo123');
  } else {
    console.log('ℹ️  Demo user already exists');
  }

  // ── Second demo user (to show group features) ──────────────
  let demo2 = await User.findOne({ email: 'alice@pf.com' });
  if (!demo2) {
    demo2 = await User.create({
      name:     'Alice Demo',
      email:    'alice@pf.com',
      password: 'demo123',
      isDemo:   true,
    });
    console.log('✅ Created second demo user: alice@pf.com / demo123');
  }

  // ── Sample trip ────────────────────────────────────────────
  const existing = await Trip.findOne({ createdBy: demo._id });
  if (existing) {
    console.log('ℹ️  Demo trip already exists — skipping expense seed');
    await mongoose.disconnect();
    return;
  }

  const trip = await Trip.create({
    name:        'Goa Summer Trip',
    destination: 'Goa, India',
    budget:      30000,
    createdBy:   demo._id,
    members:     [{ user: demo._id }, { user: demo2._id }],
  });
  console.log(`✅ Created trip: ${trip.name} (Code: ${trip.teamCode})`);

  // ── Sample expenses ────────────────────────────────────────
  const expenses = [
    { name: 'Hotel — 2 nights', amount: 8000, category: '🏨 Hotel', paidBy: demo._id },
    { name: 'Dinner at Fisherman\'s Wharf', amount: 2400, category: '🍽 Food', paidBy: demo2._id },
    { name: 'Cab from airport', amount: 1200, category: '🚗 Transport', paidBy: demo._id },
    { name: 'Water sports', amount: 3500, category: '🎡 Activities', paidBy: demo2._id },
    { name: 'Groceries & snacks', amount: 900, category: '🛒 Shopping', paidBy: demo._id },
  ];

  for (const e of expenses) {
    const exp = await Expense.create({
      trip:      trip._id,
      name:      e.name,
      amount:    e.amount,
      category:  e.category,
      paidBy:    e.paidBy,
      // Both users approve all expenses
      approvals: [{ user: demo._id }, { user: demo2._id }],
      status:    'approved',
    });
    console.log(`   ✅ Expense: ${exp.name} — ₹${exp.amount}`);
  }

  console.log('\n🎉 Seed complete! Login with: demo@pf.com / demo123');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
