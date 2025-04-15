const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { User } = require('../models');
const sharp = require('sharp');

// Directory for composite avatars
const COMPOSITE_DIR = path.join(__dirname, '../assets/avatars/composite');

// Ensure the directory exists
if (!fs.existsSync(COMPOSITE_DIR)) {
  fs.mkdirSync(COMPOSITE_DIR, { recursive: true });
}

// Upload a new composite avatar
router.post('/composite', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if we have the image data
    if (!req.body.imageData) {
      return res.status(400).json({ error: 'Missing avatar image data' });
    }
    
    // Process the base64 image data
    const base64Data = req.body.imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Resize and optimize the image
    let processedBuffer = imageBuffer;
    try {
      processedBuffer = await sharp(imageBuffer)
        .resize(200, 200, { fit: 'contain' })
        .png({ quality: 90 })
        .toBuffer();
    } catch (sharpError) {
      console.error('Error processing image with sharp:', sharpError);
      // Fall back to unprocessed buffer if sharp fails
    }
    
    // Save the composite image
    const filename = `${userId}.png`;
    const filePath = path.join(COMPOSITE_DIR, filename);
    fs.writeFileSync(filePath, processedBuffer);
    
    // Update user record to track the composite
    await User.update(
      { has_composite_avatar: true },
      { where: { id: userId } }
    );
    
    console.log(`Composite avatar saved for user ${userId}`);
    res.status(200).json({ 
      success: true,
      message: 'Composite avatar uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading composite avatar:', error);
    res.status(500).json({ error: 'Failed to upload composite avatar' });
  }
});

// Get a user's composite avatar
router.get('/composite/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const filePath = path.join(COMPOSITE_DIR, `${userId}.png`);
    
    if (fs.existsSync(filePath)) {
      // Set cache control headers
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      
      // Send the file
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error(`Error sending composite avatar for user ${userId}:`, err);
          res.status(500).json({ error: 'Error sending file' });
        }
      });
    } else {
      // No composite found
      res.status(404).json({ error: 'Composite avatar not found' });
    }
  } catch (error) {
    console.error('Error retrieving composite avatar:', error);
    res.status(500).json({ error: 'Failed to retrieve composite avatar' });
  }
});

module.exports = router;
