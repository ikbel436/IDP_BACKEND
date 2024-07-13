const ProjectDeploymentConfig = require('../models/ProjectDeployment');

exports.updateProjectDepl = async (req, res) => {
  try {
    const updatedProjectDepl = await ProjectDeploymentConfig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedProjectDepl);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
