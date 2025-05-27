const express = require('express');
const router  = express.Router();
const stakeholderController = require('../controllers/stakeholderController');
const upload = require("../middlewares/multerUpload");

// Route for first-time check
router.get('/first-time', stakeholderController.checkFirstTimeLogin);
// UPDATE stakeholder info
router.post(
    '/update-info',
    upload.single('interior_pic'),         // matches FormData field name
    stakeholderController.updateStakeholderInfo
  );
  

module.exports = router;
