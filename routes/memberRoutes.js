// routes/memberRoutes.js
const express = require('express');
const router  = express.Router();
const { getTripMembers, removeMember } = require('../controllers/memberController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/:tripId',              getTripMembers);
router.delete('/:tripId/:userId',   removeMember);

module.exports = router;
