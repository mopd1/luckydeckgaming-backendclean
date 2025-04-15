const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const archiver = require('archiver');

// Base directory for assets
const ASSETS_DIR = path.join(__dirname, '../assets');

// List of categories that don't require authentication
const publicAssetCategories = ['cards', 'avatars'];

// PRODUCTION OPTIMIZATION: Add file existence cache at the top of the file
const fileExistenceCache = new Map();

// Middleware to check if authentication is required for an asset category
const conditionalAuth = (req, res, next) => {
  const { category } = req.params;

  // Skip authentication for public asset categories
  if (publicAssetCategories.includes(category)) {
    return next();
  }

  // Apply authentication for protected categories
  return authenticateToken(req, res, next);
};

// Get asset manifest
router.get('/manifest', conditionalAuth, (req, res) => {
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

// Special route specifically for avatars with nested paths
router.get('/avatars/:avatarPath(*)', (req, res) => {
  try {
    // Get the path after /avatars/
    const avatarPath = req.params.avatarPath;
    console.log('Avatar asset request:', avatarPath);
    
    // Split into folder and filename
    const parts = avatarPath.split('/');
    if (parts.length !== 2) {
      return res.status(400).json({
        error: 'Invalid avatar path format',
        path: avatarPath
      });
    }
    
    const folder = parts[0];
    const filename = parts[1];
    
    // Generate possible filenames to try
    const possibleFilenames = [
      filename,  // Original request (e.g., "eyes_1.png")
      filename.replace(/(\w+)_(\d+)(\.png)$/, '$1$2$3'),  // Remove underscore (e.g., "eyes_1.png" → "eyes1.png")
      filename.replace(/(\w+)(\d+)(\.png)$/, '$1_$2$3')   // Add underscore (e.g., "eyes1.png" → "eyes_1.png")
    ];
    
    // PRODUCTION OPTIMIZATION: Enhanced logging
    console.log('Avatar request details:', {
      path: avatarPath,
      folder,
      filename,
      possibleFilenames
    });
    
    // PRODUCTION OPTIMIZATION: Use the cache for file existence checks
    let filePath = null;
    for (const possibleFilename of possibleFilenames) {
      const testPath = path.join(ASSETS_DIR, 'avatars', folder, possibleFilename);
      const cacheKey = `exists:${testPath}`;
      
      // Check cache first
      if (fileExistenceCache.has(cacheKey)) {
        if (fileExistenceCache.get(cacheKey)) {
          filePath = testPath;
          console.log('Cache hit - found file at:', testPath);
          break;
        }
        console.log('Cache hit - file does not exist:', testPath);
        continue;
      }
      
      // Check file system and cache result
      console.log('Testing path:', testPath);
      const exists = fs.existsSync(testPath);
      fileExistenceCache.set(cacheKey, exists);
      
      if (exists) {
        filePath = testPath;
        console.log('Found matching file at:', filePath);
        break;
      }
    }
    
    // If no matching file was found
    if (!filePath) {
      console.log('No matching file found for any variant');
      return res.status(404).json({
        error: 'Avatar asset not found',
        path: path.join(ASSETS_DIR, 'avatars', avatarPath),
        requestedPath: avatarPath,
        triedVariants: possibleFilenames
      });
    }
    
    // Set cache control headers
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
    
    // Send the file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending avatar file:', err);
        res.status(500).json({ error: 'Error sending file' });
      }
    });
  } catch (error) {
    console.error('Error serving avatar asset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific asset for non-avatar categories - uses conditional authentication
router.get('/:category/:assetId', conditionalAuth, (req, res) => {
  try {
    const { category, assetId } = req.params;
    console.log('Asset request:', { category, assetId });
    console.log('Authentication:', req.user ? 'Authenticated' : 'Not Authenticated');

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
