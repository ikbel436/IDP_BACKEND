
const express = require("express");
const { retreive, AddProjectToBundle, getBundleById } = require("../controllers/bundleController");
const router = express.Router();


router.get('/bundles/:id', getBundleById);
router.post("/BundleTouser", AddProjectToBundle);
router.get("/get",retreive);




module.exports = router;
