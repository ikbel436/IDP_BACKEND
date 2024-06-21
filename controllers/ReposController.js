const Repository = require("../models/Repositories");
const jwt = require("jsonwebtoken");
const config = require("config");
const secretOrKey = config.get("secretOrKey");



exports.getAllRepositories = async (req, res) => {
  try {
    const repositories = await Repository.find({});
    res.json(repositories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving repositories." });
  }
};

exports.updateRepository = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const result = await Repository.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!result) {
      return res.status(404).json({ message: "Repository not found" });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating repository." });
  }
};

exports.getRepoById = async (req, res) => {
  try {
    const { id } = req.params;

    const repository = await Repository.findById(id);

    if (!repository) {
      return res.status(404).json({ message: "Repository not found" });
    }

    res.json(repository);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving repository." });
  }
};

exports.createRepository = async (req, res) => {
  try {
    const repositories = req.body;
    const savedRepositories = await Repositories.insertMany(repositories);
    res.json(savedRepositories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving repositories." });
  }
};

// create Repo and assign it to a user
exports.AddRepotoUser = async (req, res) => {
  const repositories = req.body; // Assuming this is an array of repository objects

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }

  try {
    // Decode the JWT token to get the user ID
    const decoded = jwt.verify(token, secretOrKey);
    const userId = decoded.id;

    // Insert all repositories into the database
    const newRepos = await Repositories.insertMany(repositories);

    // Find the user by ID
    const searchedUser = await User.findOne({ _id: userId });
    if (!searchedUser) {
      return res.status(404).json({ errors: "User not found" });
    }

    // Update the user document to include the new repositories
    searchedUser.myRepo = [...searchedUser.myRepo,...newRepos];
    const user = await User.findByIdAndUpdate(userId, searchedUser, {
      strictPopulate: false,
      new: true,
      useFindAndModify: false,
    }).populate({ path: "myRepo", model: Repository });

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
      const user = await User.findById(req.user.id).populate("myRepo");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const repos = user.myRepo;

      res.status(200).json( repos );
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  },
];


exports.deleteRepository = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedRepository = await Repository.findByIdAndDelete(id);

    if (!deletedRepository) {
      return res.status(404).json({ message: "Repository not found" });
    }

    res.json(deletedRepository);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting repository." });
  }
};

