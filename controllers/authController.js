/* The above code is a Node.js application that handles user authentication and user management
                                          functionalities.*/

const User = require("../models/User.js");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const config = require("config");
const secretOrkey = config.get("secretOrKey");
const nodemailer = require("nodemailer");
const RESET_PWD_KEY = config.get("RESET_PWD_KEY");
const Client_URL = config.get("Client_URL");
const path = require("path");
//Password Crypt
const bcrypt = require("bcryptjs");
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: "dms2pptzs",
  api_key: "234343386118662",
  api_secret: "3sKIhiWIOna-LmiAK7XO2_v5Kbg",
});



// Login User
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(404).json({ msg: 'Email or password incorrect' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Email or password incorrect' });
    }

    // Ensure trustedDevices is an array
    const trustedDevices = user.trustedDevices || [];
    console.log('Trusted Devices:', trustedDevices);

    const now = new Date();
    // Check for non-expired trusted devices
    const trustedDevice = trustedDevices.find(device => new Date(device.expiresAt) > now);
    console.log('Non-expired Trusted Device:', trustedDevice);

    if (!trustedDevice) {
      return res.status(401).json({ msg: 'No trusted device found, please verify your device', untrustedDevice: true });
    }

    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.Role,
      address: user.address,
      birthDate: user.birthDate,
      codePostal: user.codePostal,
      country: user.country,
      myProjects: user.myProject,
      myRepos: user.myRepo,
      deviceId: trustedDevice.deviceId,
      deviceInfo: trustedDevice.deviceInfo,
    };

    const token = jwt.sign(payload, secretOrkey);
    res.cookie('jwt', token, { httpOnly: true, secure: true });
    return res.status(200).json({ token: `${token}`, user });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ msg: 'Internal server error', error: error.message });
  }
};




// Register User
exports.register = async (req, res) => {
  const { name, email, phoneNumber, password, birthDate } = req.body;
  const role = req.body.Role || "User";
  try {
    const searchRes = await User.findOne({ email });
    if (searchRes)
      return res
        .status(401)
        .json({ msg: `Utilisateur existant , utiliser un autre E-mail` });
    const currentDate = new Date();
    const birthDateObj = new Date(birthDate);
    const age = currentDate.getFullYear() - birthDateObj.getFullYear();
    const monthDifference = currentDate.getMonth() - birthDateObj.getMonth();
    const dayDifference = currentDate.getDate() - birthDateObj.getDate();

    if (
      age < 18 ||
      (age === 18 &&
        (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)))
    ) {
      return res.status(400).json({ msg: "L'âge doit être de 18 ans ou plus" });
    }
    const newUser = new User({
      name,
      email,
      password,
      phoneNumber,
      role,
      birthDate,
    });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    newUser.password = hash;

    await newUser.save();

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ errors: error });
  }
};

// Logout endpoint
exports.logout = (req, res) => {
  // Clear the JWT token cookie
  res.cookie("jwt", "", {
    expires: new Date(0),
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "strict",
  });
  res.status(200).send("Logged out");
};

// Handle user roles
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const user = User.findById(req.params.id);
    if (!roles.includes(user.role)) {
      return next(
        res.status(403).json({
          msg: `Role (${user.role}) is not allowed to acces this resource`,
        })
      );
    }
  };
};

// Update User
exports.updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      countryCode,
      status,
      description,
      birthDate,
      codePostal,
      country,
      address,
      city,
    } = req.body;
    if (birthDate) {
      const currentDate = new Date();
      const birthDateObj = new Date(birthDate);
      const age = currentDate.getFullYear() - birthDateObj.getFullYear();
      const monthDifference = currentDate.getMonth() - birthDateObj.getMonth();
      const dayDifference = currentDate.getDate() - birthDateObj.getDate();

      if (
        age < 18 ||
        (age === 18 &&
          (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)))
      ) {
        return res
          .status(400)
          .json({ msg: "L'âge doit être de 18 ans ou plus" });
      }
    }
    const updatedUser = await User.findByIdAndUpdate(req.params.id, {
      name,
      email,
      phoneNumber,
      countryCode,
      status,
      description,
      address,
      birthDate,
      codePostal,
      country,
      city,
    });

    return res.status(201).json({
      msg: "L'utilisateur a été modifié avec succès",
      user: updatedUser,
    });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
};

// Get all users
exports.allUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({
      users,
    });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
};
//Delete a User
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: "utilisateur supprimé avec succès" });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
};

//Get User with id
exports.getSingleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.status(200).json({
      succes: true,
      user,
    });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
};

// new forgot password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ error: "user with this email does not exist" });
    }

    const accessToken = jwt.sign({ _id: user._id }, RESET_PWD_KEY, {
      expiresIn: "20m",
    });

    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "ikbelbenmansour4@gmail.com", // generated ethereal user
        pass: "axva rqhb oqas fmuh", // generated ethereal password
      },
      tls: { rejectUnauthorized: false },
    });

    let info = await transporter.sendMail({
      from: "noreplybackappX@backapp.com",
      to: email,
      subject: "Account Activation link",
      text: "Account Activation link",
      html: `<h2>Please click on given link to activate your account</h2>
        <p>${Client_URL}/resetpassword/${accessToken}</p>`,
    });

    await user.updateOne({ resetLink: accessToken });

    return res.status(200).json({
      message: "Email has been sent, kindly activate your account",
      accessToken,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

//Reset Password
exports.resetPassword = async (req, res) => {
  const { resetLink, newPass } = req.body;
  if (resetLink && typeof resetLink === "string") {
    jwt.verify(resetLink, RESET_PWD_KEY, function (err, decodedDatra) {
      if (err) {
        return res.status(401).json({ err: "Incorrect accessToken/expired" });
      }
      User.findOne({ resetLink }, async (err, user) => {
        if (err || !user) {
          return res
            .status(400)
            .json({ error: "User with this accessToken does not exist" });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPass, salt);
        user.password = hash;
        user.resetLink = "";

        user.save((err, result) => {
          if (err) {
            return res.status(400).json({ error: "reset password error" });
          } else {
            return res.status(200).json({
              message: "Your password has been changed",
            });
          }
        });
      });
    });
  } else {
    return res.status(401).json({ error: "Invalid or missing reset link" });
  }
};

exports.uploadImage = async (req, res) => {
  const { userId } = req.params;

  if (req.file) {
    try {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: `uploads/${userId}` },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        uploadStream.end(req.file.buffer);
      });

      const fileUrl = result.secure_url;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { image: fileUrl },
        { new: true }
      );

      return res.json({
        status: "ok",
        success: true,
        url: fileUrl,
        user: updatedUser,
      });
    } catch (error) {
      return res.status(500).json({ status: "error", message: error.message });
    }
  } else {
    return res.status(400).json({
      status: "error",
      message: "File not found",
    });
  }
};
exports.getImage = async (req, res) => {
  const { userId, imageName } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user || !user.image) {
      return res
        .status(404)
        .json({ status: "error", message: "Image not found" });
    }

    // Assuming user.image contains the Cloudinary URL
    const imageUrl = user.image;

    return res.json({
      status: "ok",
      success: true,
      url: imageUrl,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};
exports.removeImage = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user || !user.image) {
      return res
        .status(404)
        .json({ status: "error", message: "User or image not found" });
    }

    await cloudinary.uploader.destroy(user.image);

    // Update user image field
    user.image = "";
    await user.save();

    return res.json({
      status: "ok",
      success: true,
      message: "Image removed",
      user,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id } = req.user;

  if (!newPassword) {
    return res.status(400).json({ msg: "New password is required" });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { password: hashedNewPassword },
      { new: true }
    );

    return res.status(200).json({
      msg: "Password successfully changed",
      user: updatedUser,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ msg: "Internal server error", error: error.message });
  }
};
