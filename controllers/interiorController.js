const interiorModel = require('../models/interiorModel');
const path = require('path');
const fs = require('fs');

//Add Tables
const addTables = (req, res) => {
  const { stakeholder_id, tables } = req.body;

  if (!stakeholder_id || !Array.isArray(tables)) {
    return res.status(400).json({ success: false, message: 'Invalid input data' });
  }

  let completed = 0;
  const errors = [];

  tables.forEach(({ table_type, quantity }) => {
    interiorModel.addTableToDB(stakeholder_id, table_type, quantity, (err) => {
      if (err) {
        errors.push({ table_type, error: err });
      }
      completed++;

      if (completed === tables.length) {
        if (errors.length > 0) {
          return res.status(500).json({ success: false, message: 'Some updates failed', errors });
        } else {
          return res.status(200).json({ success: true, message: 'Tables added/updated successfully' });
        }
      }
    });
  });
};


// Remove Tables
const removeTables = (req, res) => {
  const { stakeholder_id, tables } = req.body;

  if (!stakeholder_id || !Array.isArray(tables)) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  let completed = 0;
  const errors = [];

  tables.forEach(({ table_type, quantity }) => {
    interiorModel.removeTableFromDB(stakeholder_id, table_type, quantity, (err, result) => {
      if (err || result.affectedRows === 0) {
        errors.push({
          table_type,
          error: err ? err.message : 'Not enough tables to remove'
        });
      }

      completed++;

      if (completed === tables.length) {
        if (errors.length > 0) {
          return res.status(400).json({ success: false, message: 'Check table type or quantity carefully', errors });
        } else {
          return res.status(200).json({ success: true, message: 'Tables removed successfully' });
        }
      }
    });
  });
};


const getTableSummary = (req, res) => {
  const stakeholderId = req.query.stakeholder_id;

  if (!stakeholderId) {
    return res.status(400).json({ success: false, message: 'Missing stakeholder_id' });
  }

  interiorModel.fetchTableSummary(stakeholderId, (err, results) => {
    if (err) {
      console.error("Error in controller (getTableSummary):", err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    res.status(200).json({ success: true, tables: results });
  });
};




// Create new interior
const createInterior = async (req, res) => {
  try {
    const { stakeholder_id, floor_length, floor_width, floor_height, layout, name } = req.body;

    const interior = await interiorModel.create({
      stakeholder_id,
      floor_length,
      floor_width,
      floor_height,
      layout,
      name,
    });

    res.status(201).json({ success: true, data: interior });
  } catch (error) {
    console.error("Error creating interior:", error);
    res.status(500).json({ success: false, message: "Failed to create interior" });
  }
};

// Get interior by stakeholder
const getInteriorByStakeholder = async (req, res) => {
  try {
    const { stakeholderId } = req.params;
    const interior = await interiorModel.getByStakeholder(stakeholderId);

    if (!interior) {
      return res.status(404).json({ success: false, message: "No interior found" });
    }

    res.status(200).json({ success: true, data: interior });
  } catch (error) {
    console.error("Error fetching interior:", error);
    res.status(500).json({ success: false, message: "Failed to fetch interior" });
  }
};

// Update layout (auto-save)
const updateInterior = async (req, res) => {
  try {
    const { id } = req.params;
    const { layout, floor_length, floor_width, floor_height, name } = req.body;

    const updated = await interiorModel.update(id, {
      layout,
      floor_length,
      floor_width,
      floor_height,
      name,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Interior not found" });
    }

    res.status(200).json({ success: true, message: "Interior updated successfully" });
  } catch (error) {
    console.error("Error updating interior:", error);
    res.status(500).json({ success: false, message: "Failed to update interior" });
  }
};

// Soft delete interior
const deleteInterior = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await interiorModel.softDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Interior not found" });
    }

    res.status(200).json({ success: true, message: "Interior deleted successfully" });
  } catch (error) {
    console.error("Error deleting interior:", error);
    res.status(500).json({ success: false, message: "Failed to delete interior" });
  }
};



// ----------------------------
// Upload 360° image
// ----------------------------
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const stakeholderId = req.body.stakeholder_id;
    if (!stakeholderId) {
      return res.status(400).json({ success: false, message: "No stakeholder ID provided" });
    }
    
    // Check if an image already exists for this stakeholder
    const existingImage = await interiorModel.checkExistingImage(stakeholderId);
    if (existingImage) {
      return res.status(400).json({ success: false, message: "You can upload only one 360 image." });
    }

    // Extract the filename
    const fileName = req.file.filename;

    // Insert the new image into the database using the model's function
    await interiorModel.uploadImageToDB(stakeholderId, fileName);
    
    res.status(200).json({ success: true, message: "Image uploaded successfully!" });
  } catch (error) {
    console.error("Error during image upload:", error);
    res.status(500).json({ success: false, message: "Failed to upload image." });
  }
};

// ----------------------------
// Get 360° image
// ----------------------------
const getInteriorImage = async (req, res) => {
  try {
    const { stakeholder_id } = req.query;
    console.log('Received request for stakeholder_id:', stakeholder_id);

    if (!stakeholder_id) {
      return res.status(400).json({ success: false, message: 'Missing stakeholder_id parameter' });
    }

    const image = await interiorModel.getImageFromDB(stakeholder_id);
    console.log('Database query result:', image);

    if (!image) {
      return res.status(404).json({ success: false, message: 'No interior found' });
    }

    const imagePath = `/uploads/${encodeURIComponent(image)}`;
    const uploadedFilePath = path.join(__dirname, '..', 'uploads', image);

    // Helpful diagnostics for production where DB may contain filenames not present on disk.
    if (!fs.existsSync(uploadedFilePath)) {
      console.warn('Image file missing on server disk:', uploadedFilePath);
      return res.status(404).json({
        success: false,
        message: 'Image file not found on server. Please upload again.',
      });
    }

    // Behind proxies (Render), x-forwarded-* headers are more reliable than req.get('host').
    const forwardedProto = String(req.headers['x-forwarded-proto'] || req.protocol)
      .split(',')[0]
      .trim();
    const forwardedHost = String(req.headers['x-forwarded-host'] || req.get('host') || '')
      .split(',')[0]
      .trim();

    const imageUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}${imagePath}` : imagePath;
    console.log('Returning image URL:', imageUrl, 'imagePath:', imagePath);

    res.status(200).json({ success: true, imageUrl, imagePath });
  } catch (error) {
    console.error('Error in getInteriorImage:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch image.' });
  }
};
// ----------------------------
// Delete 360° image
// ----------------------------
const deleteImage = async (req, res) => {
  try {
    const { stakeholder_id } = req.body;
    if (!stakeholder_id) {
      return res.status(400).json({ success: false, message: "No stakeholder ID provided" });
    }

    // Delete the image from the database
    await interiorModel.deleteImageFromDB(stakeholder_id);
    res.status(200).json({ success: true, message: "360 view deleted successfully!" });
  } catch (error) {
    console.error("Error deleting 360 view:", error);
    res.status(500).json({ success: false, message: "Failed to delete 360 view." });
  }
};


module.exports = {
  addTables,
  removeTables,
  getTableSummary,
  createInterior,
  getInteriorByStakeholder,
  updateInterior,
  deleteInterior,
  uploadImage,
  getInteriorImage,
  deleteImage
};


