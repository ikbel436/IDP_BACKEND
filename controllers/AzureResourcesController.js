const fs = require('fs');
const csv = require('csv-parser');

// Function to read CSV file and convert to JSON
const readCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
};

exports.getResources = async (req, res) => {
    try {
        const resources = await readCSV('./cloudPdata/azure_resources.csv');
        res.json(resources);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
