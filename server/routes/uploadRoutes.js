const express = require('express');
const router = express.Router();

const { upload } = require('../config/cloudinary');

router.post('/image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: 'No file uploaded',
            });
        }

        res.status(200).json({
            message: 'File uploaded successfully',
            file: req.file,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Upload failed',
            error: error.message,
        });
    }
});

module.exports = router;