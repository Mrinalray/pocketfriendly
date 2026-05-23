const express = require('express');
const router  = express.Router();
const { addExpense, getTripExpenses, approveExpense, rejectExpense, deleteExpense } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/',                 addExpense);
router.get('/:tripId',           getTripExpenses);
router.put('/:id/approve',       approveExpense);
router.put('/:id/reject',        rejectExpense);
router.delete('/:id',            deleteExpense);

module.exports = router;
