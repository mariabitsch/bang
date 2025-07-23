const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const os = require('os');

// Helper to create temp directory for tests
function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bang-test-'));
}

// Helper to run bang command
function runBang(args = '', cwd = process.cwd()) {
  const bangPath = path.join(__dirname, '../bin/bang.js');
  return execSync(`node "${bangPath}" ${args}`, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

describe('bang CLI tool', () => {
  test('shows usage when no arguments and no package.json', () => {
    const tempDir = createTempDir();

    assert.throws(() => {
      runBang('', tempDir);
    }, /Error: Could not read package\.json/);
  });

  test('adds simple shebang to file', () => {
    const tempDir = createTempDir();
    const testFile = path.join(tempDir, 'test.js');

    fs.writeFileSync(testFile, 'console.log("hello");');

    const output = runBang(`"${testFile}" node`, tempDir);

    assert.match(output, /Added shebang.*node.*made it executable/);

    const content = fs.readFileSync(testFile, 'utf8');
    assert.strictEqual(content, '#!/usr/bin/env node\nconsole.log("hello");');

    // Check if file is executable
    const stats = fs.statSync(testFile);
    assert.ok(stats.mode & parseInt('111', 8), 'File should be executable');
  });

  test('adds complex shebang with env -S for commands with arguments', () => {
    const tempDir = createTempDir();
    const testFile = path.join(tempDir, 'test.py');

    fs.writeFileSync(testFile, 'print("hello")');

    const output = runBang(`"${testFile}" "uv run --script"`, tempDir);

    assert.match(output, /Added shebang.*env -S uv run --script/);

    const content = fs.readFileSync(testFile, 'utf8');
    assert.strictEqual(
      content,
      '#!/usr/bin/env -S uv run --script\nprint("hello")',
    );
  });

  test('ignores existing -S for simple commands', () => {
    const tempDir = createTempDir();
    const testFile = path.join(tempDir, 'test.py');

    fs.writeFileSync(testFile, 'print("hello")');

    const output = runBang(`"${testFile}" "-S node"`, tempDir);

    assert.match(output, /Added shebang.*env node/);

    const content = fs.readFileSync(testFile, 'utf8');
    assert.strictEqual(content, '#!/usr/bin/env node\nprint("hello")');
  });

  test('ignores existing -S for complex commands', () => {
    const tempDir = createTempDir();
    const testFile = path.join(tempDir, 'test.py');

    fs.writeFileSync(testFile, 'print("hello")');

    const output = runBang(`"${testFile}" "-S uv run --script"`, tempDir);

    assert.match(output, /Added shebang.*env -S uv run --script/);

    const content = fs.readFileSync(testFile, 'utf8');
    assert.strictEqual(
      content,
      '#!/usr/bin/env -S uv run --script\nprint("hello")',
    );
  });

  test('skips files that already have shebangs', () => {
    const tempDir = createTempDir();
    const testFile = path.join(tempDir, 'existing.sh');

    fs.writeFileSync(testFile, '#!/bin/bash\necho "hello"');

    const output = runBang(`"${testFile}" node`, tempDir);

    assert.match(output, /already has a shebang, skipping/);

    const content = fs.readFileSync(testFile, 'utf8');
    assert.strictEqual(content, '#!/bin/bash\necho "hello"');
  });

  test('replaces existing shebangs when force is set', () => {
    const tempDir = createTempDir();
    const testFile = path.join(tempDir, 'existing.sh');

    fs.writeFileSync(testFile, '#!/bin/bash\necho "hello"\necho "again"');

    const output = runBang(`--force "${testFile}" node`, tempDir);

    assert.match(output, /Added shebang.*node/);

    const content = fs.readFileSync(testFile, 'utf8');
    assert.strictEqual(content, '#!/usr/bin/env node\necho "hello"\necho "again"');
  });

  test('errors on non-existent file', () => {
    const tempDir = createTempDir();

    assert.throws(() => {
      runBang(`"${tempDir}/nonexistent.js" node`, tempDir);
    }, /Error: File.*does not exist/);
  });

  test('processes multiple files from package.json config', () => {
    const tempDir = createTempDir();

    // Create test files
    const file1 = path.join(tempDir, 'script1.js');
    const file2 = path.join(tempDir, 'script2.py');
    fs.writeFileSync(file1, 'console.log("script1");');
    fs.writeFileSync(file2, 'print("script2")');

    // Create package.json with bang config
    const packageJson = {
      name: 'test-project',
      bang: {
        'script1.js': 'node',
        'script2.py': 'python3 -u',
      },
    };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );

    const output = runBang('', tempDir);

    // Check both files were processed
    assert.match(output, /Added shebang.*node.*script1\.js/);
    assert.match(output, /Added shebang.*env -S python3 -u.*script2\.py/);

    // Verify file contents
    const content1 = fs.readFileSync(file1, 'utf8');
    const content2 = fs.readFileSync(file2, 'utf8');

    assert.strictEqual(
      content1,
      '#!/usr/bin/env node\nconsole.log("script1");',
    );
    assert.strictEqual(
      content2,
      '#!/usr/bin/env -S python3 -u\nprint("script2")',
    );
  });

  test('errors when package.json has no bang config', () => {
    const tempDir = createTempDir();

    const packageJson = { name: 'test-project' };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson),
    );

    assert.throws(() => {
      runBang('', tempDir);
    }, /No "bang" configuration found/);
  });

  test('makes files executable after adding shebang', () => {
    const tempDir = createTempDir();
    const testFile = path.join(tempDir, 'test-executable.js');

    // Create file without executable permissions
    fs.writeFileSync(testFile, 'console.log("test");');
    const initialStats = fs.statSync(testFile);

    // Verify file is not executable initially (on Unix-like systems)
    if (process.platform !== 'win32') {
      assert.ok(
        !(initialStats.mode & parseInt('111', 8)),
        'File should not be executable initially',
      );
    }

    runBang(`"${testFile}" node`, tempDir);

    const finalStats = fs.statSync(testFile);

    // Check that file is now executable (owner, group, and other can execute)
    if (process.platform !== 'win32') {
      assert.ok(
        finalStats.mode & parseInt('100', 8),
        'File should be executable by owner',
      );
      assert.ok(
        finalStats.mode & parseInt('010', 8),
        'File should be executable by group',
      );
      assert.ok(
        finalStats.mode & parseInt('001', 8),
        'File should be executable by other',
      );
      assert.strictEqual(
        finalStats.mode & parseInt('111', 8),
        parseInt('111', 8),
        'File should have full executable permissions',
      );
    }

    // On Windows, we can't really test this the same way, so just verify the file exists
    assert.ok(
      fs.existsSync(testFile),
      'File should still exist after processing',
    );
  });

  test('handles various executable formats correctly', () => {
    const testCases = [
      { input: 'node', expected: '#!/usr/bin/env node' },
      { input: 'python3', expected: '#!/usr/bin/env python3' },
      {
        input: 'node --experimental-modules',
        expected: '#!/usr/bin/env -S node --experimental-modules',
      },
      {
        input: 'uv run --script',
        expected: '#!/usr/bin/env -S uv run --script',
      },
      {
        input: 'python3 -u -W ignore',
        expected: '#!/usr/bin/env -S python3 -u -W ignore',
      },
    ];

    const tempDir = createTempDir();

    testCases.forEach((testCase, index) => {
      const testFile = path.join(tempDir, `test${index}.js`);
      fs.writeFileSync(testFile, 'console.log("test");');

      runBang(`"${testFile}" "${testCase.input}"`, tempDir);

      const content = fs.readFileSync(testFile, 'utf8');
      assert.ok(
        content.startsWith(testCase.expected),
        `Expected "${testCase.expected}" but got "${
          content.split('\\n')[0]
        }" for input "${testCase.input}"`,
      );
    });
  });
});

// Clean up function (optional, but nice)
process.on('exit', () => {
  // Node.js test runner handles cleanup, but we could add custom cleanup here if needed
});
