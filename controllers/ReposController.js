
const Repository = require('../models/Repositories');

exports.createRepository = async (req, res) => {
    try {
        const repositories = req.body; 
        const savedRepositories = await Repositories.insertMany(repositories);
        res.json(savedRepositories);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving repositories.' });
      }
  };
  
  exports.getAllRepositories = async (req, res) => {
    try {
        const repositories = await Repository.find({});
        res.json(repositories);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving repositories.' });
      }
  };