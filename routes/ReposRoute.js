
const express = require("express");
const { createRepository , getAllRepositories, updateRepository, getRepoById, AddRepotoUser, retreive } = require("../controllers/ReposController");
const router = express.Router();


router.post("/Addrepos", createRepository);
router.get("/Allrepos", getAllRepositories);
router.put('/repositories/:id', updateRepository);
router.get('/repositories/:id', getRepoById);
router.post("/RepoTouser", AddRepotoUser);
router.get("/get",retreive);




module.exports = router;
