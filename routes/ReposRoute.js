
const express = require("express");
const { createRepository , getAllRepositories } = require("../controllers/ReposController");
const router = express.Router();


router.post("/Addrepos", createRepository);
router.get("/Allrepos", getAllRepositories);



module.exports = router;
