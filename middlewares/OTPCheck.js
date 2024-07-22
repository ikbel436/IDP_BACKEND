const jwt = require('jsonwebtoken');
const config = require('config');



const secretOrKey = config.get('secretOrKey');



module.exports = {checkDeviceId};
