// routes/settleRoutes.js
const express = require('express');
const router  = express.Router();
const { getSettlements, markSettled } = require('../controllers/settleController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/:tripId', getSettlements);
router.post('/',       markSettled);

module.exports = router;
