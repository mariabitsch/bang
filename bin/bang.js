#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function addShebang(filePath, executable) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File '${filePath}' does not exist`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const shebang = `#!/usr/bin/env ${executable}\n`;
  
  // Check if shebang already exists
  if (content.startsWith('#!')) {
    console.log(`File '${filePath}' already has a shebang, skipping`);
    return;
  }

  const newContent = shebang + content;
  fs.writeFileSync(filePath, newContent);
  fs.chmodSync(filePath, 0o755);
  
  console.log(`Added shebang '#!/usr/bin/env ${executable}' to '${filePath}' and made it executable`);
}

function main() {
  const args = process.argv.slice(2);
  
  // If called with arguments: bang <file> <executable>
  if (args.length === 2) {
    const [filePath, executable] = args;
    addShebang(filePath, executable);
    return;
  }
  
  // If called without arguments, read from package.json
  if (args.length === 0) {
    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    } catch (error) {
      console.error('Error: Could not read package.json');
      process.exit(1);
    }
    
    const bangConfig = packageJson.bang;
    if (!bangConfig) {
      console.error('Error: No "bang" configuration found in package.json');
      console.error('Add a "bang" field with file -> executable mappings');
      process.exit(1);
    }
    
    for (const [filePath, executable] of Object.entries(bangConfig)) {
      addShebang(filePath, executable);
    }
    return;
  }
  
  console.error('Usage:');
  console.error('  bang <filename> <executable>  # Add shebang to specific file');
  console.error('  bang                          # Process all files from package.json "bang" config');
  process.exit(1);
}

main();
