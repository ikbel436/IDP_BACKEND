const Project = require("../models/Project.js");
const config = require("config");
const { concat } = require("lodash");
const path = require("path");
const fs = require("fs");
const secretOrKey = config.get("secretOrKey");
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const archiver = require('archiver');
const AWS = require('aws-sdk');



const s3 = new AWS.S3({
    accessKeyId: "AKIAZ2PCYYXTNQOXHEHO",
    secretAccessKey: "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",
    region: "ca-central-1"
  });
  const ensureUploadsDirectoryExists = () => {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
  };
  const compressFolder = (folderPath, outputPath) => {
    return new Promise((resolve, reject) => {
      console.log('Creating write stream for output path:', outputPath);
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Set the compression level
      });
  
      output.on('close', () => {
        console.log(`Compression complete: ${archive.pointer()} total bytes`);
        resolve(outputPath);
      });
  
      output.on('end', () => {
        console.log('Data has been drained');
      });
  
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('Archiver warning:', err);
        } else {
          reject(err);
        }
      });
  
      archive.on('error', (err) => {
        console.error('Archiver error:', err);
        reject(err);
      });
  
      archive.pipe(output);
      archive.directory(folderPath, false);
      console.log('Finalizing archive...');
      archive.finalize();
    });
  };
  const uploadToS3 = (filePath, bucketName, key) => {
    return new Promise((resolve, reject) => {
      const fileContent = fs.readFileSync(filePath);
      const params = {
        Bucket: bucketName,
        Key: key,
        Body: fileContent,
        Tagging: "public=true" // Tagging the object as public
      };
  
      s3.upload(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Location); // The S3 URL of the uploaded file
        }
      });
    });
  };
  
// create project and assign it to a user
exports.createProject = async (req, res) => {
    const { name, description,provider,lien, backendDockerImage, frontendDockerImage, databaseType} = req.body;
    var crypto = require("crypto");
    var reference = crypto.randomBytes(30).toString("hex");

    // Extract the JWT token from the Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ msg: 'No token provided' });
    }

    try {
        // Decode the JWT token to get the user ID
        const decoded = jwt.verify(token, secretOrKey);
        const userId = decoded.id;

        const newProject = new Project({
            name,
            reference,
            description,
            provider,
            lien,
           backendDockerImage,
            frontendDockerImage,
             databaseType
            
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
        console.log(error)
        res.status(500).json({ errors: error });
    }
};
// exports.createProject = async (req, res) =>{
//     console.log('Received request:', req.body);
  
//     const { name, description, provider, lien, folderPath } = req.body;
  
//     if (!folderPath || typeof folderPath !== 'string') {
//       console.log('Invalid folderPath:', folderPath);
//       return res.status(400).json({ errors: 'Invalid folderPath provided' });
//     }
  
//     const crypto = require('crypto');
//     const reference = crypto.randomBytes(30).toString('hex');
  
//     const authHeader = req.headers.authorization;
//     const token = authHeader && authHeader.split(' ')[1];
  
//     if (!token) {
//       return res.status(401).json({ msg: 'No token provided' });
//     }
  
//     try {
//         const decoded = jwt.verify(token, secretOrKey);
//       const userId = decoded.id;
  
//       console.log('User ID:', userId);
  
//       const resolvedFolderPath = path.resolve(folderPath);
//       console.log('Resolved folder path:', resolvedFolderPath);
  
//       if (!fs.existsSync(resolvedFolderPath)) {
//         console.log('Folder does not exist:', resolvedFolderPath);
//         return res.status(400).json({ errors: 'Folder does not exist' });
//       }
  
//       ensureUploadsDirectoryExists(); // Ensure uploads directory exists
  
//       const zipFilePath = path.join(__dirname, 'uploads', `${Date.now()}-project.zip`);
  
//       console.log('Compressing folder:', resolvedFolderPath);
//       await compressFolder(resolvedFolderPath, zipFilePath);
  
//       console.log('Uploading compressed file to S3:', zipFilePath);
//       const s3Url = await uploadToS3(zipFilePath, "s3-yosri", `${Date.now()}-project.zip`);
  
//       console.log('S3 upload result:', s3Url);
  
//       const newProject = new Project({
//         name,
//         reference,
//         description,
//         provider,
//         lien,
//         fileUrl: s3Url // Save S3 URL in the database
//       });
  
//       await newProject.save();
  
//       const searchedUser = await User.findOne({ _id: userId });
//       if (!searchedUser) {
//         console.error('User not found:', userId);
//         return res.status(404).json({ errors: 'User not found' });
//       }
//       searchedUser.myProject.push(newProject._id);
//       const user = await User.findByIdAndUpdate(userId, searchedUser, {
//         strictPopulate: false,
//         new: true,
//         useFindAndModify: false,
//       }).populate({ path: 'myProject', model: Project });
  
//       console.log('Project successfully created and assigned to user:', user);
  
//       // Remove the temporary zip file
//       fs.unlinkSync(zipFilePath);
  
//       return res.status(201).json(newProject);
//     } catch (error) {
//       console.error('Error during project creation:', error);
//       res.status(500).json({ errors: error });
//     }
//   };
  


const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ msg: 'No token provided' });
    }

    jwt.verify(token, secretOrKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ msg: 'Token is not valid' });
        }
        req.user = decoded;
        next();
    });
};


// Update a project
exports.updateProject = [verifyToken, async (req, res) => {
    const projectId = req.params.id;
    const { name, description,provider,lien } = req.body;
    console.log('Request parameters:', req.params);
    console.log(`Updating project with ID: ${projectId}`);
    console.log(`Request body:`, req.body);
    try {
        const updatedProject = await Project.findByIdAndUpdate(projectId, { name, description,provider,lien }, { new: true });
        if (!updatedProject) {
            return res.status(404).json({ message: "Project not found" });
        }
        res.status(200).json(updatedProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}];

exports.retreive = [verifyToken, async(req, res) => {
    try {
        console.log("Authenticated user:", req.user);
        console.log("Authenticated user ID:", req.user.id);
    
        const user = await User.findById(req.user.id).populate("myProject");
    
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
    
        // Extract projects from the user document
        const projects = user.myProject;
    
        res.status(200).json({ projects });
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
}
 ];

// Delete a project
exports.deleteProject = [verifyToken, async (req, res) => {
    const projectId = req.params.id;

    try {
        // Find the project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Remove the project from the user's myProject array
        const user = await User.findOne({ myProject: projectId });
        if (user) {
            user.myProject.pull(projectId);
            await user.save();
        }

        // Delete the project
        await Project.findByIdAndDelete(projectId);
        res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}];

  //Get User with id
  exports.retreivebyId = async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      res.status(200).json(project);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  };


