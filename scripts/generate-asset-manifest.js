// File: scripts/generate-asset-manifest.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ASSETS_DIR = path.join(__dirname, '../assets');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'manifest.json');

// Define what constitutes an essential asset
const ESSENTIAL_ASSETS = {
  cards: ['A_of_hearts', 'A_of_spades', 'A_of_clubs', 'A_of_diamonds', 
          'K_of_hearts', 'K_of_spades', 'K_of_clubs', 'K_of_diamonds',
          // Add other essential card assets here
         ],
  ui: ['button_default', 'button_pressed', 'panel_background', 'loading_icon'],
  // Add other essential assets for different categories
};

function generateManifest() {
  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    assets: {}
  };

  // Get all top-level directories in assets folder
  const categories = fs.readdirSync(ASSETS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  // Process each category
  for (const category of categories) {
    const categoryPath = path.join(ASSETS_DIR, category);
    manifest.assets[category] = {};

    // Get all files in the category directory
    const files = fs.readdirSync(categoryPath);

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        // Get file extension and base name
        const extname = path.extname(file);
        const basename = path.basename(file, extname);
        
        // Calculate file hash for versioning
        const fileBuffer = fs.readFileSync(filePath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        const hash = hashSum.digest('hex');
        
        // Determine if this is an essential asset
        const isEssential = 
          ESSENTIAL_ASSETS[category] && 
          ESSENTIAL_ASSETS[category].includes(basename);
        
        // Add to manifest
        manifest.assets[category][basename] = {
          path: `/assets/${category}/${file}`,
          hash: hash,
          version: '1.0.0',
          size: stats.size,
          essential: isEssential || false
        };
      }
    }
  }

  // Write manifest to file
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Manifest generated at ${MANIFEST_PATH}`);
  return manifest;
}

// Run if this script is executed directly
if (require.main === module) {
  generateManifest();
}

module.exports = { generateManifest };
