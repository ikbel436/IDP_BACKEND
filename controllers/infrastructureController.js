const User = require('../models/User'); 
const config = require("config");
const cloudinary = require('cloudinary').v2;
const Infra = require('../models/catalogueInfra')
const secretOrKey = config.get("secretOrKey");
const jwt = require("jsonwebtoken");

cloudinary.config({
    cloud_name: "dms2pptzs",
    api_key: "234343386118662",
    api_secret: "3sKIhiWIOna-LmiAK7XO2_v5Kbg",
  });

exports.addInfra = async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (user.Role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admins only." });
      }
  
      const { title, description, steps } = req.body;
      const { image, file } = req.files;
  
      const uploadToCloudinary = (file, folder, resourceType = 'image') => {
        const fileName = file.originalname;
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: folder, resource_type: resourceType, public_id: fileName.split('.').slice(0, -1).join('.') },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          uploadStream.end(file.buffer);
        });
      };
  
      const imageResult = await uploadToCloudinary(image[0], `uploads/${req.user.id}`);
      const fileResult = await uploadToCloudinary(file[0], `uploads/${req.user.id}`, 'raw');
  
      const infra = new Infra({
        title,
        description,
        imageUrl: imageResult.secure_url,
        fileUrl: fileResult.secure_url,
        steps,
        addedBy: req.user.id,
      });
  
      await infra.save();
  
      res.status(201).json({ message: 'Infra added successfully', infra });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
exports.getInfras = async (req, res) => {
    try {
        const infras = await Infra.find();
        res.status(200).json(infras);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
  
exports.deleteInfra = [ verifyToken,async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.Role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        const infra = await Infra.findById(req.params.id);
        if (!infra) {
            return res.status(404).json({ message: 'Infra not found' });
        }

        // Delete image from Cloudinary
        const imagePublicId = infra.imageUrl.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(`uploads/${req.user.id}/${imagePublicId}`);

        // Delete file from Cloudinary
        const filePublicId = infra.fileUrl.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(`uploads/${req.user.id}/${filePublicId}`, { resource_type: 'raw' });

        // Delete infra from database
        await Infra.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Infra deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}];