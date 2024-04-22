const express = require("express");
const { registerRules, validator } = require("../middlewares/validator.js");
const isAuth = require("../middlewares/passport-setup.js");

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
   
  } = require("../controllers/authController.js");

const router = express.Router();


router.post("/register", registerRules(), validator, register);
router.post("/login", login, authorizeRoles);
router.put("/profile/:id", updateUser);
router.delete("/delete/:id", deleteUser);

router.get("/users", allUsers);
router.get("/user/:id", getSingleUser);
router.get("/current", isAuth(), (req, res) => {
    console.log("req", req);
    res.json(req.user);
  });


module.exports = router;
