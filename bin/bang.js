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

function addShebang(filePath, executable, { force, dryRun }) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File '${filePath}' does not exist`);
    process.exit(1);
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const shebang = createShebang(executable) + '\n';

  // Check if shebang already exists
  if (content.startsWith('#!')) {
    if (dryRun) {
      if (!force) {
        console.log(`Would skip file '${filePath}'. It already has a shebang.`);
        return;
      } else {
        console.log(
          `Would replace shebang in '${filePath}' with '${shebang.trim()}'`,
        );
        return;
      }
    } else {
      if (!force) {
        console.log(`File '${filePath}' already has a shebang, skipping`);
        return;
      } else {
        content = content.split(/\n/g).slice(1).join('\n');
      }
    }
  }

  if (dryRun) {
    console.log(`Would add shebang '${shebang.trim()}' to '${filePath}'`);
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
  print('  [OPTIONS] bang <filename> <executable> ');
  print('                           # Add shebang to specific file');
  print(
    '  [OPTIONS] bang           # Process all files from package.json "bang" config',
  );
  print('Options:');
  print('  --help, -h               # Print this usage information');
  print('  --version, -v            # Print the version number');
  print('  --force, -f              # Overwrite existing shebang');
  print('  --dry-run, -n            # Preview changes without modifying files');
}

function printVersion() {
  console.log(pkg.version);
}

function parseArgs(args) {
  const options = {
    help: false,
    version: false,
    force: false,
    dryRun: false,
  };

  const positional = [];

  for (const arg of args) {
    if (arg === '--help' || arg == '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--dry-run' || arg === '-n') {
      options.dryRun = true;
    } else if (arg.match(/^--?[\w\d]+$/)) {
      throw new Error(`Unknown option '${arg}'`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 0 && positional.length !== 2) {
    throw new Error('Invalid number of arguments');
  }

  return { options, positional };
}

function main() {
  const args = process.argv.slice(2);
  let parsedArgs;

  try {
    parsedArgs = parseArgs(args);
  } catch (e) {
    console.error(`Error: ` + e.message);
    printUsage(console.error);
    process.exit(1);
  }

  const { options, positional } = parsedArgs;

  if (options.help) {
    printUsage(console.log);
    process.exit(0);
  }

  if (options.version) {
    printVersion();
    process.exit(0);
  }

  // If called with arguments: bang <file> <executable>
  if (positional.length === 2) {
    const [filePath, executable] = positional;
    addShebang(filePath, executable, options);
    return;
  }

  // If called without arguments, read from package.json
  if (positional.length === 0) {
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
      addShebang(filePath, executable, options);
    }
    return;
  }

  printUsage(console.error);
  process.exit(1);
}

main();
