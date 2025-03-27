const fs = require('fs');
const path = require('path');

// Define paths
const projectDir = path.resolve(__dirname, '..'); // Adjust if necessary
const exportTemplatesDir = path.join(projectDir, 'export_templates');
const stagingHtmlPath = path.join(exportTemplatesDir, 'staging.html');
const outputDir = path.join(projectDir, 'exports', 'web', 'development');
const indexHtmlPath = path.join(outputDir, 'index.html');

// Read the staging.html template
let template = fs.readFileSync(stagingHtmlPath, 'utf8');

// Replace placeholders
template = template.replace('${title}', 'Lucky Deck Gaming');
template = template.replace('${head}', '');
template = template.replace('${body}', `
  <!-- Your game's body content -->
  <script src="godot.engine.js"></script>
  <script>
    WebAssembly.instantiateStreaming = undefined; // For browsers that don't support it
  </script>
  <script src="godot.loader.js"></script>
`);

// Write the output to index.html in the output directory
fs.writeFileSync(indexHtmlPath, template);

console.log('index.html has been generated successfully at ' + indexHtmlPath);
