const express = require('express');
const router  = express.Router();
const { createTrip, getMyTrips, getTrip, joinTrip, deleteTrip } = require('../controllers/tripController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').post(createTrip).get(getMyTrips);
router.post('/join', joinTrip);
router.route('/:id').get(getTrip).delete(deleteTrip);

module.exports = router;
