
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


  exports.updateRepository = async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = req.body;
  
      const result = await Repository.findByIdAndUpdate(id, updatedData, { new: true });
  
      if (!result) {
        return res.status(404).json({ message: 'Repository not found' });
      }
  
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating repository.' });
    }
  };




exports.getRepoById = async (req, res) => {
  try {
    const { id } = req.params; 

    const repository = await Repository.findById(id);

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' });
    }

    res.json(repository);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving repository.' });
  }
};
