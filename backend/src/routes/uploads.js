const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');

router.post('/:companyId/uploads', auth, upload.single('file'), uploadController.uploadFile);

module.exports = router;
