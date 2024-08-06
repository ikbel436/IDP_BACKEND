const express = require("express");
const { registerRules, validator  } = require("../middlewares/validator.js");
//const isAuth = require("../middlewares/passport-setup.js");
const multer = require("multer");
const fs = require("fs");
const { isAuth, checkRole , checkDeviceId } = require('../middlewares/passport-setup.js');
const cloudinary = require('cloudinary').v2;
const {
  register,
  login,
  authorizeRoles,
  updateUser,
  deleteUser,
  allUsers,
  getSingleUser,
  forgotPassword,
  resetPassword,
  uploadImage,
  getImage,
  logout,
  removeImage,
  changePassword,
  checkDevice

} = require("../controllers/authController.js");

const router = express.Router();


router.post("/register", registerRules(), validator, register);
// router.post('/check-device', checkDevice);
router.post("/login", login, authorizeRoles , checkDeviceId);
router.put("/profile/:id", updateUser);
router.delete("/delete/:id", isAuth(), checkRole(['admin']), deleteUser);
router.post("/logout", logout);
router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword);
router.get("/users", isAuth(), checkRole(['admin']), allUsers);
router.get("/user/:id", isAuth(), checkRole(['admin', 'User']), getSingleUser);
router.put("/changepassword", isAuth(), changePassword);
router.get("/current", isAuth(), (req, res) => {
  res.json(req.user);
});

// router.post('/protected-route', isAuth(), checkDeviceId, (req, res) => {
//   res.status(200).send('Access granted');
// });


//upload Config 


cloudinary.config({
  cloud_name: 'dms2pptzs',
  api_key: '234343386118662',
  api_secret: '3sKIhiWIOna-LmiAK7XO2_v5Kbg'
});

const storage = multer.memoryStorage();
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const userId = req.params.userId;
//     const uploadDir = `./uploads/${userId}`;
//     fs.mkdirSync(uploadDir, { recursive: true });
//     cb(null, uploadDir);
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + "--" + file.originalname);
//   },
// });

const fileFilter = (req, file, cb) => {
  let filetype = "";
  let fileExtension = "";
  if (file.mimetype === "image/gif") {
    filetype = "image-";
    fileExtension = "gif";
  }
  if (file.mimetype === "image/png") {
    filetype = "image-";
    fileExtension = "png";
  }
  if (file.mimetype === "image/jpeg") {
    filetype = "image-";
    fileExtension = "jpeg";
  }
  if (file.mimetype === "application/pdf") {
    filetype = "pdf-";
    fileExtension = "pdf";
  }else if (file.mimetype === "text/plain") {
    filetype = "text-";
    fileExtension = "txt";
  } else if (file.mimetype === "application/zip") {
    filetype = "zip-";
    fileExtension = "zip";
  }  else if (file.mimetype === "application/octet-stream") {
    filetype = "tf-";
    fileExtension = "tf";
  } 

  cb(null, filetype + Date.now() + "." + fileExtension);
  h = cb;
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5024 * 1024 },
  fileFilter: fileFilter,
});

router.put("/upload/:userId", upload.single("image"), uploadImage);
router.get("/image/:userId/:imageName", getImage);

router.delete("/remove/:userId", removeImage);

module.exports = router;