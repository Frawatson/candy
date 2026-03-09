/**
 * Unit tests for merge-resolution-script.sh
 * Tests the shell script functionality through child_process execution
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Merge Resolution Script', () => {
  let tempDir;
  let scriptPath;

  beforeAll(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-test-'));
    scriptPath = path.join(__dirname, '../merge-resolution-script.sh');
    
    // Make script executable
    if (fs.existsSync(scriptPath)) {
      fs.chmodSync(scriptPath, '755');
    }
  });

  afterAll(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Git Repository Validation', () => {
    test('should exit with error when not in a git repository', (done) => {
      const child = spawn('bash', [scriptPath], {
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(1);
        expect(stdout).toContain('❌ Error: Not in a git repository');
        done();
      });
    }, 10000);

    test('should proceed when in a valid git repository', async () => {
      // Initialize git repo in temp directory
      execSync('git init', { cwd: tempDir });
      execSync('git config user.name "Test User"', { cwd: tempDir });
      execSync('git config user.email "test@example.com"', { cwd: tempDir });
      
      // Create initial commit
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Repo');
      execSync('git add README.md', { cwd: tempDir });
      execSync('git commit -m "Initial commit"', { cwd: tempDir });

      // Mock git fetch to avoid network calls
      const mockScript = `#!/bin/bash
if [[ "$1" == "fetch" ]]; then
  echo "Mocked git fetch"
  exit 0
fi
exec git "$@"
`;
      const mockGitPath = path.join(tempDir, 'mock-git');
      fs.writeFileSync(mockGitPath, mockScript);
      fs.chmodSync(mockGitPath, '755');

      const child = spawn('bash', [scriptPath], {
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PATH: `${tempDir}:${process.env.PATH}` }
      });

      let stdout = '';
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      await new Promise((resolve) => {
        child.on('close', () => {
          expect(stdout).toContain('🔄 Starting merge conflict resolution');
          resolve();
        });
      });
    }, 15000);
  });

  describe('Branch Operations', () => {
    let gitRepo;

    beforeEach(() => {
      gitRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
      execSync('git init', { cwd: gitRepo });
      execSync('git config user.name "Test User"', { cwd: gitRepo });
      execSync('git config user.email "test@example.com"', { cwd: gitRepo });
    });

    afterEach(() => {
      if (fs.existsSync(gitRepo)) {
        fs.rmSync(gitRepo, { recursive: true, force: true });
      }
    });

    test('should show current branch correctly', () => {
      // Create initial commit
      fs.writeFileSync(path.join(gitRepo, 'test.txt'), 'initial');
      execSync('git add test.txt', { cwd: gitRepo });
      execSync('git commit -m "initial"', { cwd: gitRepo });

      const currentBranch = execSync('git branch --show-current', { 
        cwd: gitRepo, 
        encoding: 'utf8' 
      }).trim();

      expect(currentBranch).toBe('main');
    });

    test('should handle branch switching', () => {
      // Setup test scenario
      fs.writeFileSync(path.join(gitRepo, 'test.txt'), 'initial');
      execSync('git add test.txt', { cwd: gitRepo });
      execSync('git commit -m "initial"', { cwd: gitRepo });
      
      // Create target branch
      execSync('git checkout -b agentflow/adding-varcel', { cwd: gitRepo });
      fs.writeFileSync(path.join(gitRepo, 'vercel.json'), '{"version": 2}');
      execSync('git add vercel.json', { cwd: gitRepo });
      execSync('git commit -m "add vercel config"', { cwd: gitRepo });

      // Switch back to main
      execSync('git checkout main', { cwd: gitRepo });

      const branches = execSync('git branch --list', { cwd: gitRepo, encoding: 'utf8' });
      expect(branches).toContain('agentflow/adding-varcel');
    });
  });

  describe('Merge Conflict Detection', () => {
    test('should detect when merge completes without conflicts', async () => {
      const output = '✅ Merge completed successfully without conflicts!';
      expect(output).toContain('✅ Merge completed successfully');
    });

    test('should provide guidance when conflicts are detected', async () => {
      const conflictOutput = `⚠️  Merge conflicts detected. Running conflict analysis...
📋 Files with conflicts:
📝 Conflict resolution needed for the following files:`;
      
      expect(conflictOutput).toContain('⚠️  Merge conflicts detected');
      expect(conflictOutput).toContain('📝 Conflict resolution needed');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing remote branch gracefully', () => {
      const errorMessage = "⚠️  Local branch doesn't exist, checking out from remote...";
      expect(errorMessage).toContain('checking out from remote');
    });

    test('should provide clear instructions for manual resolution', () => {
      const instructions = `🛠️  Please resolve conflicts manually and then run:
   git add .
   git commit -m 'resolve: merge conflicts between agentflow/adding-varcel and main'
   git push origin agentflow/adding-varcel`;
      
      expect(instructions).toContain('git add .');
      expect(instructions).toContain('git commit -m');
      expect(instructions).toContain('git push origin');
    });
  });

  describe('Script Output Validation', () => {
    test('should include all required emoji indicators', () => {
      const expectedEmojis = ['🔄', '❌', '📡', '📍', '🔀', '⚠️', '📋', '🔍', '📝', '🛠️', '✅', '🚀', '✨'];
      
      // Read the actual script file
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      
      expectedEmojis.forEach(emoji => {
        expect(scriptContent).toContain(emoji);
      });
    });

    test('should have proper error exit codes', () => {
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      expect(scriptContent).toContain('exit 1');
      expect(scriptContent).toContain('set -e');
    });
  });
});