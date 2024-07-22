const dotenv = require('dotenv');


dotenv.config();

module.exports = {
    port: process.env.PORT || 3000,
    mongoURI: process.env.MONGO_URI,
    clientURL: process.env.CLIENT_URL,
    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    },
    email: {
        service: process.env.EMAIL_SERVICE,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
};
