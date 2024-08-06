const express = require('express');
const router = express.Router();
const { addInfra,getInfras,deleteInfra } = require('../controllers/infrastructureController');
const multer = require("multer");
const { isAuth, checkRole  } = require('../middlewares/passport-setup.js');
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
      "image/gif",
      "image/png",
      "image/jpeg",
      "application/pdf",
      "text/plain",
      "application/zip",
      "application/octet-stream"
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  };
  
  const upload = multer({
    limits: { fileSize: 5024 * 1024 },
    fileFilter: fileFilter,
  });
router.post('/addInfra', isAuth(), checkRole(['admin']), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }]), addInfra);
router.get('/getInfras', isAuth(), getInfras);
router.delete("/deleteInfra/:id",deleteInfra)
module.exports = router;