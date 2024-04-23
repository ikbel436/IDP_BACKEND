
const User = require("../models/User.js");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const config = require("config");
const secretOrkey = config.get("secretOrkey");
const nodemailer = require("nodemailer");
const RESET_PWD_KEY = config.get("RESET_PWD_KEY");
const Client_URL = config.get("Client_URL");


//Password Crypt
const bcrypt = require("bcryptjs");

// Login User

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try { 
      const user = await User.findOne({ email });
      if (!user)
        return res.status(404).json({ msg: `Email ou mot de passe incorrect` });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ msg: `Email ou mot de passe incorrect` });
  
      const payload = {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
      };
  
      const accessToken = await jwt.sign(payload, secretOrkey);
      return res.status(200).json({ accessToken: `${accessToken}`, user });
    } catch (error) {
      res.status(500).json({ errors: error });
    }
  };

  // Register User
exports.register = async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;
  
    try {
      const searchRes = await User.findOne({ email });
      if (searchRes)
        return res
          .status(401)
          .json({ msg: `Utilisateur existant , utiliser un autre E-mail` });
  
    //   // create reusable transporter object using the default SMTP transport
    //   let transporter = nodemailer.createTransport({
    //     host: "smtp.gmail.com",
    //     port: 587,
    //     secure: false, // true for 465, false for other ports
    //     auth: {
    //       user: "zaghouani.yosri@gmail.com", // generated ethereal user
    //       pass: "yimktgkvxvbbylzp", // generated ethereal password
    //     },
    //     tls: { rejectUnothorized: false },
    //   });
  
    //   // send mail with defined transport object
    //   let info = await transporter.sendMail({
    //     from: '"Node mailer contact" <zaghouani.yosri@gmail.com>', // sender address
    //     to: email, // list of receivers
    //     subject: "Hello ✔", // Subject line
    //     text: "Hello world?", // plain text body
    //     html: "<b>Hello world?</b>", // html body
    //   });
  
    //   console.log("Message sent: %s", info.messageId);
    //   // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
    //   // Preview only available when sending through an Ethereal account
    //   console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    //   // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  
    //   console.log("email has been sent");
  
      const newUser = new User({
        name,
        email,
        password,
        phoneNumber,
      });
  
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      newUser.password = hash;
  
      await newUser.save();
      newUser => console.log(newUser);

      res.status(201).json(newUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ errors: error });
    }
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
      const { name, email, phoneNumber } = req.body;
  
      const updatedUser = await User.findByIdAndUpdate(req.params.id, {
        name,
        email,
        phoneNumber,
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