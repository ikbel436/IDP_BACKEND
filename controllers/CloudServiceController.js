

const CloudService = require('../models/CloudService');

const addCloudService = async (req, res) => {
    const { provider, serviceName, serviceType, location } = req.body;
    const createdBy = req.user._id; // fetching createdBy from the token

    if (!provider || !serviceName || !serviceType || !location) {
        return res.status(400).send({ message: "All fields are required" });
    }

    const newService = new CloudService({
        provider,
        serviceName,
        serviceType,
        location,
        available: true,
        createdBy
    });

    try {
        const savedService = await newService.save();
        res.status(201).send({ message: "Cloud service added successfully", service: savedService });
    } catch (error) {
        res.status(500).send({ message: "Error adding cloud service", error });
    }
};

const getCloudServices = async (req, res) => {
    const { Role: role, _id: userId } = req.user; // assuming req.user contains the authenticated user with role and userId
    try {
        let services;
        if (role === 'admin') {
            services = await CloudService.find({ createdBy: userId });
        } else if (role === 'User') {
            services = await CloudService.find({ available: true });
        } else {
            return res.status(400).send({ message: "Invalid role specified" });
        }
        res.status(200).send(services);
    } catch (error) {
        res.status(500).send({ message: "Error retrieving cloud services", error });
    }
};

const updateServiceAvailability = async (req, res) => {
    const { serviceName, available } = req.body;
    const userId = req.user._id; // fetching userId from the token

    try {
        const service = await CloudService.findOne({ serviceName, createdBy: userId });
        if (!service) {
            return res.status(404).send({ message: "Service not found or you are not authorized to update this service" });
        }

        service.available = available;
        const updatedService = await service.save();
        res.status(200).send({ message: "Service availability updated", service: updatedService });
    } catch (error) {
        res.status(500).send({ message: "Error updating service availability", error });
    }
};

module.exports = {
    addCloudService,
    getCloudServices,
    updateServiceAvailability
};
