const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const User = require("../models/User.js");
const fs = require('fs');
const path = require('path');

exports.generateOtp = async (req, res) => {
  const { userEmail } = req.body;
  const otp = otpGenerator.generate(6, {
    upperCase: false,
    specialChars: true,
  });

  try {
    const user = await User.findOne({ email: userEmail });

    if (user) {
      user.otp = otp;
      await user.save();
    } else {
      // Create a new user with the OTP
      const newUser = new User({ email: userEmail, otp });
      await newUser.save();
    }

    // Read the HTML template
    const filePath = path.join(__dirname, '../templates/otpEmailTemplate.html'); 
    const htmlContent = fs.readFileSync(filePath, 'utf8');

    // Replace placeholders in the HTML content with actual values
    const finalHtml = htmlContent.replace('{otp}', otp);

    // Setup email transport
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "ikbelbenmansour4@gmail.com",
        pass: "axva rqhb oqas fmuh",
      },
    });

    // Send OTP via email
    let mailOptions = {
      from: "noreply.inpsark@contact.tn",
      to: userEmail,
      subject: "Your OTP",
      html: finalHtml, // Use the modified HTML content here
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send({ error: "Failed to send OTP" });
      } else {
        return res.status(200).send({ message: "OTP sent successfully" });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.verifyOtp = async (req, res) => {
  const { userEmail, userOtp } = req.body;

  try {
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    if (user.otp === userOtp) {
      user.otp = null;
      await user.save();
      return res.status(200).send({ message: "OTP verified successfully" });
    } else {
      return res.status(400).send({ error: "Invalid OTP" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};
