// /routes/consumerRoutes.js
const express = require('express');
const router = express.Router();
const consumerController = require('../controllers/consumerController');
const upload = require("../middlewares/multerUpload");


// Route for first-time check
router.get('/first-time', consumerController.checkFirstTimeLogin);

// Update consumer info with profile picture
router.post(
    "/update-info",
    upload.single("profile_pic"), // This matches the FormData field name
    consumerController.updateConsumerInfo
  );
  

module.exports = router;
