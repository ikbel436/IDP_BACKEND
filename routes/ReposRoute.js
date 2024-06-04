
const express = require("express");
const { createRepository , getAllRepositories, updateRepository, getRepoById } = require("../controllers/ReposController");
const router = express.Router();


router.post("/Addrepos", createRepository);
router.get("/Allrepos", getAllRepositories);
router.put('/repositories/:id', updateRepository);
router.get('/repositories/:id', getRepoById);




module.exports = router;
