const express = require('express');
const router = express.Router();
const { addInfra,getInfras,deleteInfra } = require('../controllers/infrastructureController');
const multer = require("multer");
const { isAuth, checkRole  } = require('../middlewares/passport-setup.js');
const upload = multer({

    limits: { fileSize: 5024 * 1024 }
  });
router.post('/addInfra', isAuth(), checkRole(['admin']), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }]), addInfra);
router.get('/getInfras', isAuth(), getInfras);
router.delete("/deleteInfra/:id",deleteInfra)
module.exports = router;