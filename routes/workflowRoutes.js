const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');

router.put('/create-workflow', async (req, res) => {
    try {
        await workflowController.pushWorkflowToFile(req.body);
        res.status(200).send('Workflow file created successfully.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to create workflow file.');
    }
});

router.get('/yaml', async (req, res) => {
    const { platform } = req.params;
    if (!platform) {
        return res.status(400).json({ message: 'Platform not specified in request body' });
    }
    try {
        const yamlData = await workflowController.readYaml({ platform });
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to read YAML file.');
    }
});

router.put('/yaml', async (req, res) => {
    const { owner, token, repo, platform, yamlData } = req.body;
    if (!owner || !token || !repo || !platform || !yamlData) {
        return res.status(400).json({ message: 'Required parameters are missing in request body' });
    }
    try {
        await workflowController.updateYaml({ owner, token, repo, platform, yamlData });
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to update YAML file.');
    }
});

module.exports = router;
