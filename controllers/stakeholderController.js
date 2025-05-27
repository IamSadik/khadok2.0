const stakeholderModel = require('../models/stakeholderModel');

const checkFirstTimeLogin = async (req, res) => {
  const { stakeholder_id } = req.query;

  if (!stakeholder_id) {
    return res.status(400).json({ error: 'stakeholder_id is required' });
  }

  try {
    const stakeholder = await stakeholderModel.getStakeholderById(stakeholder_id);

    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    const number = stakeholder.number;
    const isFirstTime = (
      number === null ||
      number === undefined ||
      number.toString().trim() === ''
    );

    return res.status(200).json({ firstTime: isFirstTime });
  } catch (error) {
    console.error('Error in checkFirstTimeLogin:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};


const updateStakeholderInfo = async (req, res) => {
  const {
    stakeholder_id,
    restaurant_name,
    contact_number,    // from FormData
    address,
    types,             // JSON string of array
    opens_at,
    closes_at,
    lat,
    lng
  } = req.body;

  // multer has put the uploaded file info on req.file
  const interiorPic = req.file ? req.file.filename : null;

  // required fields check
  if (
    !stakeholder_id ||
    !restaurant_name ||
    !contact_number ||
    !address ||
    !types ||
    !opens_at ||
    !closes_at ||
    !lat ||
    !lng
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const success = await stakeholderModel.updateStakeholderInfo({
      stakeholder_id,
      restaurant_name,
      number: contact_number,
      address,
      type: types,       // store JSON string or parse if needed
      opens_at,
      closes_at,
      lat,
      lng,
      picture: interiorPic
    });

    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: 'Update failed' });
    }
  } catch (err) {
    console.error('Update error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  checkFirstTimeLogin,
  updateStakeholderInfo
};