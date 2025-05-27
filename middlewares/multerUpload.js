// /middlewares/multerUpload.js

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `upload_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter (accept only images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = allowedTypes.test(file.mimetype);
  const extMatch = allowedTypes.test(ext);

  if (mimeType && extMatch) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// Init upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB limit
});

module.exports = upload;
