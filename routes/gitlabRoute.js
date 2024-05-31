const express = require("express");
const router = express.Router();
const { GetGitLabRepos } = require("../controllers/GitLabController");

router.post("/getrepos",GetGitLabRepos)
module.exports = router;
