const express = require("express");
const { GetRepos } = require("../controllers/O'AuthController");
const router = express.Router();

// GetRepos route
router.post("/repositories", GetRepos);

module.exports = router;
