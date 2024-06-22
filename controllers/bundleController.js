const Project = require("../models/Project");
const jwt = require("jsonwebtoken");
const config = require("config");
const Bundle = require("../models/Bundle");
const secretOrKey = config.get("secretOrKey");



exports.getBundleById = async (req, res) => {
  try {
    const { id } = req.params;

    const bundle = await Bundle.findById(id);

    if (!bundle) {
      return res.status(404).json({ message: "Bundle not found" });
    }

    res.json(bundle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving Bundle." });
  }
};

exports.createBundle = async (req, res) => {
  try {
    const projects = req.body;
    const savedProjects = await Repositories.insertMany(projects);
    res.json(savedProjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving projects." });
  }
};

exports.AddProjectToBundle = async (req, res) => {
    const Projects = req.body; // Assuming this is an array of repository objects
  
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
  
    if (!token) {
      return res.status(401).json({ msg: "No token provided" });
    }
  
    try {
      // Decode the JWT token to get the user ID
      const decoded = jwt.verify(token, secretOrKey);
      const userId = decoded.id;
  
      const newBundle = await Bundle.insertMany(Projects);
  
      // Find the user by ID
      const searchedUser = await User.findOne({ _id: userId });
      if (!searchedUser) {
        return res.status(404).json({ errors: "User not found" });
      }
  
      // Update the user document to include the new repositories
      searchedUser.Bundles = [...searchedUser.Bundles,...newBundle];
      const user = await User.findByIdAndUpdate(userId, searchedUser, {
        strictPopulate: false,
        new: true,
        useFindAndModify: false,
      }).populate({ path: "Bundles", model: Bundle });
  
      return res.status(201).json(user); // Return the updated user document
    } catch (error) {
      res.status(500).json({ errors: error });
      console.log(error);
    }
  };

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }

  jwt.verify(token, secretOrKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ msg: "Token is not valid" });
    }
    req.user = decoded;
    next();
  });
};

exports.retreive = [
  verifyToken,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id).populate("Bundles");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const bundles = user.Bundles;

      res.status(200).json( bundles );
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  },
];


exports.deleteBundle = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBundle = await Bundle.findByIdAndDelete(id);

    if (!deletedBundle) {
      return res.status(404).json({ message: "Bundle not found" });
    }

    res.json(deletedBundle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting Bundle." });
  }
};