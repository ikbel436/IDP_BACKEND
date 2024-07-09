const express = require("express");
const router = express.Router();
const { generateOtp, verifyOtp } = require("../controllers/otpController");

router.post("/generate-otp", generateOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;
