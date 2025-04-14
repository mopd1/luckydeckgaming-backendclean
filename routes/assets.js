const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const archiver = require('archiver');

// Base directory for assets
const ASSETS_DIR = path.join(__dirname, '../assets');

// Get asset manifest
router.get('/manifest', authenticateToken, (req, res) => {
  try {
    console.log('Manifest request received');
    const manifestPath = path.join(ASSETS_DIR, 'manifest.json');
    console.log('Looking for manifest at:', manifestPath);
    console.log('Manifest exists:', fs.existsSync(manifestPath));
    
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ error: 'Asset manifest not found' });
    }
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('Manifest loaded successfully');
    
    // Set cache control headers for the manifest
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
    res.json(manifest);
  } catch (error) {
    console.error('Error serving asset manifest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific asset
router.get('/:category/:assetId', authenticateToken, (req, res) => {
  try {
    const { category, assetId } = req.params;
    console.log('Asset request:', { category, assetId });
    
    const filePath = path.join(ASSETS_DIR, category, assetId);
    console.log('Looking for asset at:', filePath);
    console.log('Asset file exists:', fs.existsSync(filePath));
    
    // Validate the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Asset not found', path: filePath });
    }
    
    // Set cache control headers for long-term caching
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
    
    // Send the file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Error sending file' });
      }
    });
  } catch (error) {
    console.error('Error serving asset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch asset downloads
router.post('/batch', authenticateToken, (req, res) => {
  try {
    const { assets } = req.body;
    
    if (!assets || !Array.isArray(assets)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }
    
    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 5 } // Compression level
    });
    
    // Set the appropriate headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=assets-batch.zip`);
    
    // Pipe the archive to the response
    archive.pipe(res);
    
    // Add each requested asset to the archive
    assets.forEach(asset => {
      if (asset.category && asset.id) {
        const filePath = path.join(ASSETS_DIR, asset.category, asset.id);
        if (fs.existsSync(filePath)) {
          // Add file to the archive with appropriate path
          archive.file(filePath, { name: `${asset.category}/${asset.id}` });
        }
      }
    });
    
    // Finalize the archive and send the response
    archive.finalize();
  } catch (error) {
    console.error('Error creating batch download:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
