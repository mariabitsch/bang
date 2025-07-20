# bang 🔨

A tiny npm utility that adds shebang lines to your compiled scripts and makes them executable. Perfect for TypeScript projects that compile to executable Node.js scripts.

## Why?

When you compile TypeScript to JavaScript for CLI tools, you often end up with scripts that need:
1. A shebang line (`#!/usr/bin/env node`) 
2. Executable permissions (`chmod +x`)

Instead of manually managing this or writing custom build scripts, `bang` automates it with a simple configuration in your `package.json`.

## Installation

```bash
# As a dev dependency (recommended)
npm install --save-dev @mariabitsch/bang

# Or globally
npm install -g @mariabitsch/bang
```

## Usage

### Option 1: Configuration-based (recommended)

Add a `bang` configuration to your `package.json`:

```json
{
  "name": "my-cli-tool",
  "bin": {
    "my-tool": "dist/index.js",
    "helper": "dist/helper.js"
  },
  "scripts": {
    "build": "tsc && bang"
  },
  "bang": {
    "dist/index.js": "node",
    "dist/helper.js": "node"
  }
}
```

Then run:
```bash
npm run build
```

This will:
- Compile your TypeScript
- Add `#!/usr/bin/env node` to both scripts
- Make them executable with `chmod +x`

### Option 2: Direct usage

```bash
# Add shebang to a specific file
bang dist/my-script.js node
bang scripts/my-python-tool.py python3
bang scripts/my-bash-script.sh bash
```

## Configuration

The `bang` field in `package.json` maps file paths to executables:

```json
{
  "bang": {
    "dist/cli.js": "node",
    "scripts/setup.py": "python3",
    "scripts/deploy.sh": "bash",
    "bin/my-tool.rb": "ruby"
  }
}
```

## Features

- ✅ **Smart detection**: Won't add duplicate shebangs if they already exist
- ✅ **Cross-platform**: Works on macOS, Linux, and Windows
- ✅ **Zero config**: Works out of the box with sensible defaults
- ✅ **TypeScript friendly**: Perfect for compiled TS projects
- ✅ **Build integration**: Fits naturally into npm scripts
- ✅ **Flexible**: Use with any executable (node, python3, bash, etc.)

## Real-world example

```json
{
  "name": "my-awesome-cli",
  "version": "1.0.0",
  "bin": {
    "awesome": "dist/cli.js",
    "awesome-dev": "dist/dev-tools.js"
  },
  "scripts": {
    "build": "tsc && bang",
    "dev": "tsc --watch",
    "prepublishOnly": "npm run build"
  },
  "bang": {
    "dist/cli.js": "node",
    "dist/dev-tools.js": "node"
  },
  "devDependencies": {
    "@bitschmaria/bang": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Error handling

- 📁 **File not found**: Clear error message if target file doesn't exist
- 📄 **No package.json**: Helpful error if package.json is missing or malformed  
- ⚙️ **No config**: Clear instructions if `bang` field is missing
- 🔄 **Already has shebang**: Skips files that already have shebang lines

## Platform support

Works on:
- 🍎 **macOS** 
- 🐧 **Linux**
- 🪟 **Windows** (PowerShell, Git Bash, WSL)

## Why not just use a build script?

You could write a custom script, but `bang` gives you:
- Consistent behavior across projects
- Error handling and edge cases covered
- Clean, declarative configuration
- Easy to share and reuse
- Follows npm conventions

## Contributing

This is a tiny utility, but improvements are welcome! The source is simple and readable.

## License

MIT

---

*Made with ❤️ for developers who build CLI tools*
