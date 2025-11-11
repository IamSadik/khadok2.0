// controllers/locationController.js
const { getConsumerLocation } = require("../models/locationModel");

const getLocation = async (req, res) => {
  try {
    const { consumerId } = req.params;

    if (!consumerId) {
      return res.status(400).json({ error: "Consumer ID required" });
    }

    const location = await getConsumerLocation(consumerId);

    if (!location) {
      return res.status(404).json({ message: "No location found for this user" });
    }

    return res.status(200).json({
      success: true,
      lat: location.lat,
      lng: location.lng,
    });
  } catch (err) {
    console.error("Error fetching location:", err);
    res.status(500).json({ error: "Server error fetching location" });
  }
};

module.exports = { getLocation };
