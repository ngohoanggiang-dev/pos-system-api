const multer = require("multer");

const uploadService = multer({ storage: multer.memoryStorage() });

module.exports = { uploadService }