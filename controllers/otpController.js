const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const config = require("config");
const User = require("../models/User.js");
const fs = require("fs");
const path = require("path");
const SenderEmail = config.get("SenderEmail");
const SenderPassword = config.get("SenderPassword");
const { v4: uuidv4 } = require("uuid");
const { send } = require("process");

exports.generateOtp = async (req, res) => {
  const { userEmail } = req.body;
  const otp = otpGenerator.generate(6, {
    upperCase: true,
    specialChars: true,
  });

  try {
    let user = await User.findOne({ email: userEmail });

    if (user) {
      user.otp = otp;
    } else {
      user = new User({ email: userEmail, otp });
    }

    const filePath = path.join(__dirname, "../templates/otpEmailTemplate.html");
    const htmlContent = fs.readFileSync(filePath, "utf8");
    const finalHtml = htmlContent.replace("{otp}", otp);

    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: SenderEmail,
        pass: SenderPassword,
      },
    });

    let mailOptions = {
      from: "noreply.inpsark@contact.tn",
      to: userEmail,
      subject: "Your OTP",
      html: finalHtml,
    };

    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send({ error: "Failed to send OTP" });
      } else {
        await user.save();
        return res.status(200).send({ message: "OTP sent successfully" });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.verifyOtp = async (req, res) => {
  const { userEmail, userOtp, deviceInfo } = req.body;

  try {
    const user = await User.findOne({ email: userEmail });
    console.log(user,"user");

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    if (user.otp === userOtp) {
      user.otp = null;
      user.verified = true; 

      const deviceId = uuidv4(); 
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      user.trustedDevices.push({
        deviceId: deviceId,
        expiresAt: expirationDate,
        deviceInfo: deviceInfo,
      });

      await user.save();
      return res.status(200).send({ message: "OTP verified successfully", verified: true, deviceId });
    } else {
      return res.status(400).send({ error: "Invalid OTP" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};