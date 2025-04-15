// update-manifest.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Set path to your assets directory
const ASSETS_DIR = path.join(process.cwd(), 'assets');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'manifest.json');

console.log(`Assets directory: ${ASSETS_DIR}`);
console.log(`Manifest path: ${MANIFEST_PATH}`);

// Load existing manifest
let manifest;
try {
  const existingManifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
  manifest = JSON.parse(existingManifest);
  console.log('Loaded existing manifest');
} catch (error) {
  console.log('Creating new manifest...');
  manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    assets: {}
  };
}

// Calculate hash for a file
function calculateFileHash(filePath) {
  const fileContent = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileContent).digest('hex');
}

// Scan directory and update manifest
function updateManifestForDirectory(dir, category) {
  console.log(`Processing directory: ${dir} for category: ${category}`);
  
  if (!manifest.assets[category]) {
    manifest.assets[category] = {};
  }
  
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      try {
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          // Handle subdirectories
          updateManifestForDirectory(filePath, `${category}/${file}`);
        } else {
          // Skip .import files and other non-asset files
          if (file.endsWith('.import') || file.endsWith('.meta')) {
            return;
          }
          
          // Get file info
          const relativePath = `/assets/${category}/${file}`;
          const fileHash = calculateFileHash(filePath);
          
          // Determine if asset is essential (very few are)
          const isEssential = false; // Default most assets as non-essential
          
          // Add to manifest
          const fileKey = file.includes('.') ? file.replace('.png', '') : file;
          manifest.assets[category][fileKey] = {
            path: relativePath,
            hash: fileHash,
            version: manifest.version,
            size: stats.size,
            essential: isEssential
          };
          
          console.log(`Added/updated: ${relativePath}`);
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error.message);
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
}

// Process all asset categories
try {
  const categories = fs.readdirSync(ASSETS_DIR);

  categories.forEach(category => {
    if (category === 'manifest.json') return; // Skip the manifest file
    
    const categoryPath = path.join(ASSETS_DIR, category);
    
    try {
      const stats = fs.statSync(categoryPath);
      if (stats.isDirectory()) {
        updateManifestForDirectory(categoryPath, category);
      }
    } catch (error) {
      console.error(`Error processing category ${category}:`, error.message);
    }
  });

  // Update manifest date
  manifest.generated = new Date().toISOString();

  // Write updated manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log('Manifest updated successfully!');
} catch (error) {
  console.error('Error updating manifest:', error.message);
}
