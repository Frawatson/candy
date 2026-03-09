/**
 * Unit tests for post-merge-validation.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Mock child_process to avoid actual command execution
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

describe('Post-merge Validation', () => {
  let tempDir;
  let validationScript;
  let originalCwd;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validation-test-'));
    originalCwd = process.cwd();
    validationScript = require('../post-merge-validation.js');
  });

  afterAll(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.chdir(tempDir);
  });

  describe('checkForConflictMarkers', () => {
    test('should pass when no conflict markers are present', () => {
      // Setup clean files
      fs.writeFileSync(path.join(tempDir, 'clean.js'), 'console.log("hello");');
      fs.writeFileSync(path.join(tempDir, 'clean.md'), '# Clean markdown');
      
      execSync.mockReturnValue('clean.js\nclean.md\n');

      const { checkForConflictMarkers } = require('../post-merge-validation.js');
      
      expect(() => checkForConflictMarkers()).not.toThrow();
    });

    test('should fail when conflict markers are found', () => {
      const conflictedContent = `function test() {
<<<<<<< HEAD
  return "version A";
=======
  return "version B";
>>>>>>> main
}`;
      
      fs.writeFileSync(path.join(tempDir, 'conflicted.js'), conflictedContent);
      execSync.mockReturnValue('conflicted.js\n');

      const { checkForConflictMarkers } = require('../post-merge-validation.js');
      
      expect(() => checkForConflictMarkers()).toThrow('Unresolved conflict markers found');
    });

    test('should handle binary files gracefully', () => {
      // Create a binary-like file
      const binaryContent = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG header
      fs.writeFileSync(path.join(tempDir, 'image.png'), binaryContent);
      fs.writeFileSync(path.join(tempDir, 'text.js'), 'console.log("clean");');
      
      execSync.mockReturnValue('image.png\ntext.js\n');

      const { checkForConflictMarkers } = require('../post-merge-validation.js');
      
      expect(() => checkForConflictMarkers()).not.toThrow();
    });
  });

  describe('validateVercelConfig', () => {
    test('should validate correct vercel.json', () => {
      const vercelConfig = {
        version: 2,
        builds: [
          { src: "package.json", use: "@vercel/static-build" }
        ]
      };
      
      fs.writeFileSync(path.join(tempDir, 'vercel.json'), JSON.stringify(vercelConfig));
      
      const packageJson = {
        name: "test-app",
        version: "1.0.0",
        scripts: {
          build: "next build",
          start: "next start"
        }
      };
      
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

      const { validateVercelConfig } = require('../post-merge-validation.js');
      
      const result = validateVercelConfig();
      expect(result.details.vercelConfigExists).toBe(true);
      expect(result.details.hasVercelScripts).toBe(true);
    });

    test('should handle missing vercel.json gracefully', () => {
      const packageJson = {
        name: "test-app",
        version: "1.0.0",
        scripts: {
          build: "react-scripts build"
        }
      };
      
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

      const { validateVercelConfig } = require('../post-merge-validation.js');
      
      const result = validateVercelConfig();
      expect(result.details.vercelConfigExists).toBe(false);
      expect(result.details.hasVercelScripts).toBe(true);
    });

    test('should fail on invalid JSON in vercel.json', () => {
      fs.writeFileSync(path.join(tempDir, 'vercel.json'), '{ invalid json }');

      const { validateVercelConfig } = require('../post-merge-validation.js');
      
      expect(() => validateVercelConfig()).toThrow('Invalid vercel.json');
    });
  });

  describe('validatePackageJson', () => {
    test('should validate correct package.json', () => {
      const packageJson = {
        name: "test-app",
        version: "1.0.0",
        dependencies: {
          react: "^18.0.0"
        },
        devDependencies: {
          jest: "^29.0.0"
        },
        scripts: {
          test: "jest"
        }
      };
      
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

      const { validatePackageJson } = require('../post-merge-validation.js');
      
      const result = validatePackageJson();
      expect(result.details.dependencies).toBe(2);
      expect(result.details.hasScripts).toBe(true);
    });

    test('should fail when package.json is missing', () => {
      const { validatePackageJson } = require('../post-merge-validation.js');
      
      expect(() => validatePackageJson()).toThrow('package.json not found');
    });

    test('should fail when required fields are missing', () => {
      const packageJson = {
        description: "Missing name and version"
      };
      
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

      const { validatePackageJson } = require('../post-merge-validation.js');
      
      expect(() => validatePackageJson()).toThrow('Missing required fields');
    });

    test('should fail on invalid JSON syntax', () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{ "name": }');

      const { validatePackageJson } = require('../post-merge-validation.js');
      
      expect(() => validatePackageJson()).toThrow('Invalid package.json syntax');
    });
  });

  describe('checkCodeIntegrity', () => {
    test('should validate JavaScript files', () => {
      fs.writeFileSync(path.join(tempDir, 'valid.js'), 'const x = 1; export default x;');
      fs.writeFileSync(path.join(tempDir, 'valid.ts'), 'interface Test { name: string; }');
      
      execSync.mockReturnValue('valid.js\nvalid.ts\nREADME.md\n');

      const { checkCodeIntegrity } = require('../post-merge-validation.js');
      
      const result = checkCodeIntegrity();
      expect(result.details.filesChecked).toBe(2);
    });

    test('should handle empty files', () => {
      fs.writeFileSync(path.join(tempDir, 'empty.js'), '');
      fs.writeFileSync(path.join(tempDir, 'whitespace.js'), '   \n  \n  ');
      
      execSync.mockReturnValue('empty.js\nwhitespace.js\n');

      const { checkCodeIntegrity } = require('../post-merge-validation.js');
      
      expect(() => checkCodeIntegrity()).not.toThrow();
    });

    test('should handle git ls-files errors', () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const { checkCodeIntegrity } = require('../post-merge-validation.js');
      
      expect(() => checkCodeIntegrity()).toThrow('Failed to check code integrity');
    });
  });

  describe('runSecurityScan', () => {
    test('should handle successful npm audit', () => {
      const auditResult = {
        metadata: {
          vulnerabilities: {
            info: 0,
            low: 1,
            moderate: 0,
            high: 0,
            critical: 0
          }
        }
      };
      
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "test"}');
      execSync.mockReturnValue(JSON.stringify(auditResult));

      const { runSecurityScan } = require('../post-merge-validation.js');
      
      const result = runSecurityScan();
      expect(result.message).toContain('Security scan completed');
      expect(result.details).toEqual(auditResult.metadata);
    });

    test('should handle npm audit failures gracefully', () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "test"}');
      execSync.mockImplementation(() => {
        throw new Error('npm audit failed');
      });

      const { runSecurityScan } = require('../post-merge-validation.js');
      
      const result = runSecurityScan();
      expect(result.message).toContain('completed with warnings');
      expect(result.warning).toBe('npm audit failed');
    });

    test('should skip scan when no package.json exists', () => {
      const { runSecurityScan } = require('../post-merge-validation.js');
      
      const result = runSecurityScan();
      expect(result.message).toContain('skipping security scan');
    });
  });

  describe('generateValidationReport', () => {
    test('should create validation report file', () => {
      const mockResults = {
        conflictMarkers: { status: 'passed', message: 'No conflicts' },
        vercelConfig: { status: 'failed', error: 'Invalid config' }
      };

      const { generateValidationReport } = require('../post-merge-validation.js');
      generateValidationReport(mockResults);

      const reportPath = path.join(tempDir, 'merge-validation-report.json');
      expect(fs.existsSync(reportPath)).toBe(true);

      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      expect(report.results).toEqual(mockResults);
      expect(report.summary.totalChecks).toBe(2);
      expect(report.summary.passed).toBe(1);
      expect(report.summary.failed).toBe(1);
    });
  });
});