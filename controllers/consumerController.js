// /controllers/consumerController.js
const consumerModel = require('../models/consumerModel');
const checkFirstTimeLogin = async (req, res) => {
    const { consumer_id } = req.query;

    if (!consumer_id) {
        return res.status(400).json({ error: 'consumer_id is required' });
    }

    try {
        const consumer = await consumerModel.getConsumerById(consumer_id);

        if (!consumer) {
            return res.status(404).json({ error: 'Consumer not found' });
        }

        const number = consumer.number;
        const isFirstTime = (number === null || number === undefined || number.toString().trim() === '');

        

        return res.status(200).json({ firstTime: isFirstTime });

    } catch (error) {
        console.error('Error in checkFirstTimeLogin:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};


const updateConsumerInfo = async (req, res) => {
  const {
    consumer_id,
    full_name,
    number,
    address,
    gender,
    age,
    lat,
    lng
  } = req.body;

  // multer has put the uploaded file info on req.file
  const profilePic = req.file ? req.file.filename : null;

  // required field check
  if (!consumer_id || !full_name || !number || !address || !gender || !age || !lat || !lng) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const success = await consumerModel.updateConsumerInfo({
      consumer_id,
      full_name,
      number,
      address,
      gender,
      age,
      lat,
      lng,
      profile_pic: profilePic
    });

    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: "Update failed" });
    }
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
    checkFirstTimeLogin, updateConsumerInfo
};
