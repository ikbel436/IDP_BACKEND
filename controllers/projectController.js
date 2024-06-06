const Project = require("../models/Project.js");
const config = require("config");
const { concat } = require("lodash");
const path = require("path");
const fs = require("fs");
const secretOrKey = config.get("secretOrKey");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const archiver = require("archiver");
const AWS = require("aws-sdk");



// create project and assign it to a user
exports.createProject = async (req, res) => {
  const {
    name,
  description,
  createdAt,
  lastUpdated,
  cloneUrl,
  language,
  DBType,
  DockerImage , 
  Status ,
  SonarQube 
  } = req.body;
  var crypto = require("crypto");
  var reference = crypto.randomBytes(30).toString("hex");

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }

  try {
    // Decode the JWT token to get the user ID
    const decoded = jwt.verify(token, secretOrKey);
    const userId = decoded.id;

    const newProject = new Project({
      name,
      description,
      createdAt,
      lastUpdated,
      cloneUrl,
      language,
      DBType,
      DockerImage , 
      Status ,
      SonarQube 
    });

    await newProject.save();

    // Assign the project to the user
    const searchedUser = await User.findOne({ _id: userId });
    if (!searchedUser) {
      return res.status(404).json({ errors: "User not found" });
    }
    searchedUser.myProject.push(newProject._id);
    const user = await User.findByIdAndUpdate(userId, searchedUser, {
      strictPopulate: false,
      new: true,
      useFindAndModify: false,
    }).populate({ path: "myProject", model: Project });

    return res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ errors: error });
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

// Update a project
exports.updateProject = [
  verifyToken,
  async (req, res) => {
    const projectId = req.params.id;
    const { name, description, provider, lien } = req.body;
    try {
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        { name, description, provider, lien },
        { new: true }
      );
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(200).json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
];

exports.retreive = [
  verifyToken,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id).populate("myProject");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const projects = user.myProject;

      res.status(200).json({ projects });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Delete a project
exports.deleteProject = [
  verifyToken,
  async (req, res) => {
    const projectId = req.params.id;

    try {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const user = await User.findOne({ myProject: projectId });
      if (user) {
        user.myProject.pull(projectId);
        await user.save();
      }

      await Project.findByIdAndDelete(projectId);
      res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
];

//Get User with id
exports.retreivebyId = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    res.status(200).json(project);
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
};
