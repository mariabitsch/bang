#!/usr/bin/env node

const fs = require('fs');
const pkg = require('../package.json');

function createShebang(executable) {
  // Remove leading -S if user already provided it
  const cleanExecutable = executable.replace(/^-S\s+/, '');

  // If executable contains arguments, use env -S
  if (cleanExecutable.includes(' ')) {
    return `#!/usr/bin/env -S ${cleanExecutable}`;
  }
  return `#!/usr/bin/env ${cleanExecutable}`;
}

function addShebang(filePath, executable) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File '${filePath}' does not exist`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const shebang = createShebang(executable) + '\n';

  // Check if shebang already exists
  if (content.startsWith('#!')) {
    console.log(`File '${filePath}' already has a shebang, skipping`);
    return;
  }

  const newContent = shebang + content;
  fs.writeFileSync(filePath, newContent);
  fs.chmodSync(filePath, 0o755);

  console.log(
    `Added shebang '${shebang.trim()}' to '${filePath}' and made it executable`,
  );
}

function printUsage(print) {
  print('Usage:');
  print(
    '  bang                          # Process all files from package.json "bang" config',
  );
  print('  bang <filename> <executable>  # Add shebang to specific file');
  print('  bang --help, -h               # Print this usage information');
  print('  bang --version, -v            # Print the version number');
}

function printVersion() {
  console.log(pkg.version);
}

function main() {
  const args = process.argv.slice(2);

  // If called with arguments: bang <file> <executable>
  if (args.length === 2) {
    const [filePath, executable] = args;
    addShebang(filePath, executable);
    return;
  }

  // If called with a single argument, check options
  if (args.length === 1) {
    switch (args[0]) {
      case '-h':
      case '--help':
        printUsage(console.log);
        process.exit(0);
      case '-v':
      case '--version':
        printVersion();
        process.exit(0);
      default:
        printUsage(console.error);
        process.exit(1);
    }
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

  printUsage(console.error);
  process.exit(1);
}

main();
