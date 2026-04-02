const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const TechStackAuditor = require('../../scripts/audit-dependencies');

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');
jest.mock('path');

describe('TechStackAuditor', () => {
  let auditor;
  let mockRootDir;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRootDir = '/mock/project';
    
    // Mock process.cwd()
    jest.spyOn(process, 'cwd').mockReturnValue(mockRootDir);
    
    auditor = new TechStackAuditor();
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(auditor.rootDir).toBe(mockRootDir);
      expect(auditor.results).toHaveProperty('timestamp');
      expect(auditor.results).toHaveProperty('dependencies');
      expect(auditor.results).toHaveProperty('frameworks');
      expect(auditor.results.frameworks).toEqual([]);
    });

    it('should detect package manager during initialization', () => {
      fs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('yarn.lock');
      });
      
      const newAuditor = new TechStackAuditor();
      expect(newAuditor.results.packageManager).toBe('yarn');
    });
  });

  describe('detectPackageManager', () => {
    it('should detect yarn when yarn.lock exists', () => {
      fs.existsSync.mockImplementation((filePath) => 
        filePath.includes('yarn.lock')
      );
      path.join.mockReturnValue('/mock/project/yarn.lock');
      
      const result = auditor.detectPackageManager();
      expect(result).toBe('yarn');
    });

    it('should detect pnpm when pnpm-lock.yaml exists', () => {
      fs.existsSync.mockImplementation((filePath) => 
        filePath.includes('pnpm-lock.yaml')
      );
      
      const result = auditor.detectPackageManager();
      expect(result).toBe('pnpm');
    });

    it('should detect npm when package-lock.json exists', () => {
      fs.existsSync.mockImplementation((filePath) => 
        filePath.includes('package-lock.json')
      );
      
      const result = auditor.detectPackageManager();
      expect(result).toBe('npm');
    });

    it('should return unknown when no lock files exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = auditor.detectPackageManager();
      expect(result).toBe('unknown');
    });
  });

  describe('analyzePackageFiles', () => {
    const mockPackageJson = {
      name: 'test-project',
      version: '1.0.0',
      description: 'A test project',
      dependencies: {
        'react': '^18.0.0',
        'express': '^4.18.0'
      },
      devDependencies: {
        'jest': '^29.0.0',
        'eslint': '^8.0.0'
      },
      peerDependencies: {
        'react': '^18.0.0'
      },
      optionalDependencies: {
        'fsevents': '^2.3.0'
      },
      engines: {
        'node': '>=16.0.0'
      },
      scripts: {
        'test': 'jest',
        'build': 'webpack'
      }
    };

    beforeEach(() => {
      path.join.mockReturnValue('/mock/project/package.json');
    });

    it('should analyze package.json successfully', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));
      
      await auditor.analyzePackageFiles();
      
      expect(auditor.results.name).toBe('test-project');
      expect(auditor.results.version).toBe('1.0.0');
      expect(auditor.results.description).toBe('A test project');
      expect(auditor.results.dependencies.production).toEqual(mockPackageJson.dependencies);
      expect(auditor.results.dependencies.development).toEqual(mockPackageJson.devDependencies);
      expect(auditor.results.engines).toEqual(mockPackageJson.engines);
      expect(auditor.results.scripts).toEqual(mockPackageJson.scripts);
    });

    it('should handle missing package.json gracefully', async () => {
      fs.existsSync.mockReturnValue(false);
      
      await auditor.analyzePackageFiles();
      
      expect(console.warn).toHaveBeenCalledWith('⚠️  No package.json found');
      expect(auditor.results.name).toBeUndefined();
    });

    it('should handle malformed package.json', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');
      
      await expect(auditor.analyzePackageFiles()).rejects.toThrow();
    });

    it('should handle package.json without optional fields', async () => {
      const minimalPackage = { name: 'minimal' };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(minimalPackage));
      
      await auditor.analyzePackageFiles();
      
      expect(auditor.results.engines).toEqual({});
      expect(auditor.results.scripts).toEqual({});
      expect(auditor.results.dependencies.production).toEqual({});
    });
  });

  describe('analyzeLockFile', () => {
    it('should analyze npm lock file', async () => {
      const mockLockContent = '{"lockfileVersion": 2}';
      fs.existsSync.mockImplementation((filePath) => 
        filePath.includes('package-lock.json')
      );
      fs.readFileSync.mockReturnValue(mockLockContent);
      
      await auditor.analyzeLockFile();
      
      expect(auditor.results.lockFileSize).toBe(mockLockContent.length);
    });

    it('should prioritize yarn lock over npm lock', async () => {
      const yarnContent = 'yarn lock content';
      const npmContent = 'npm lock content';
      
      fs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('yarn.lock') || filePath.includes('package-lock.json');
      });
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('yarn.lock')) return yarnContent;
        return npmContent;
      });
      
      await auditor.analyzeLockFile();
      
      expect(auditor.results.lockFileSize).toBe(yarnContent.length);
    });

    it('should handle missing lock files', async () => {
      fs.existsSync.mockReturnValue(false);
      
      await auditor.analyzeLockFile();
      
      expect(auditor.results.lockFileSize).toBeUndefined();
    });
  });

  describe('scanSourceCode', () => {
    beforeEach(() => {
      // Mock walkDirectory to simulate file scanning
      auditor.walkDirectory = jest.fn().mockImplementation((dir, callback) => {
        // Simulate calling callback with different file paths
        return Promise.all([
          callback('/mock/src/App.jsx'),
          callback('/mock/src/server.js'),
          callback('/mock/src/test.spec.js')
        ]);
      });
    });

    it('should detect React patterns in JSX files', async () => {
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('App.jsx')) {
          return 'import React from "react"; function App() { return <div>Hello</div>; }';
        }
        return '';
      });
      
      await auditor.scanSourceCode();
      
      expect(auditor.results.detectedTechnologies).toContain('react');
    });

    it('should detect Express patterns in JS files', async () => {
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('server.js')) {
          return 'const express = require("express"); const app = express(); app.listen(3000);';
        }
        return '';
      });
      
      await auditor.scanSourceCode();
      
      expect(auditor.results.detectedTechnologies).toContain('express');
    });

    it('should detect Jest patterns in test files', async () => {
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('test.spec.js')) {
          return 'describe("test", () => { test("should work", () => { expect(true).toBe(true); }); });';
        }
        return '';
      });
      
      await auditor.scanSourceCode();
      
      expect(auditor.results.detectedTechnologies).toContain('jest');
    });

    it('should handle file read errors gracefully', async () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      await auditor.scanSourceCode();
      
      expect(auditor.results.detectedTechnologies).toEqual([]);
    });

    it('should detect multiple technologies in same file', async () => {
      fs.readFileSync.mockReturnValue(`
        import React from 'react';
        import styled from 'styled-components';
        const StyledDiv = styled.div\`color: red;\`;
      `);
      
      await auditor.scanSourceCode();
      
      expect(auditor.results.detectedTechnologies).toContain('react');
      expect(auditor.results.detectedTechnologies).toContain('styled');
    });
  });

  describe('detectFrameworks', () => {
    it('should detect Next.js framework', async () => {
      fs.existsSync.mockImplementation((filePath) => 
        filePath.includes('next.config.js')
      );
      
      await auditor.detectFrameworks();
      
      expect(auditor.results.frameworks).toContain('Next.js');
    });

    it('should detect Create React App', async () => {
      fs.existsSync.mockImplementation((filePath) => 
        filePath.includes('public/index.html') || filePath.includes('src/App.js')
      );
      
      await auditor.detectFrameworks();
      
      expect(auditor.results.frameworks).toContain('Create React App');
    });

    it('should detect multiple frameworks', async () => {
      fs.existsSync.mockImplementation((filePath) => 
        filePath.includes('next.config.js') || filePath.includes('jest.config.js')
      );
      
      await auditor.detectFrameworks();
      
      expect(auditor.results.frameworks.length).toBeGreaterThan(0);
    });

    it('should handle directory indicators', async () => {
      fs.existsSync.mockImplementation((filePath) => {
        // Mock directory existence check
        return filePath.includes('pages') || filePath.includes('src/app');
      });
      
      await auditor.detectFrameworks();
      
      expect(auditor.results.frameworks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeConfigurations', () => {
    const mockStats = {
      size: 1024,
      mtime: new Date('2023-01-01T00:00:00Z')
    };

    it('should analyze existing configuration files', async () => {
      fs.existsSync.mockImplementation((filePath) => 
        filePath.includes('webpack.config.js') || filePath.includes('package.json')
      );
      fs.statSync.mockReturnValue(mockStats);
      
      await auditor.analyzeConfigurations();
      
      expect(auditor.results.configurations['webpack.config.js']).toEqual({
        exists: true,
        size: 1024,
        modified: '2023-01-01T00:00:00.000Z'
      });
    });

    it('should handle missing configuration files', async () => {
      fs.existsSync.mockReturnValue(false);
      
      await auditor.analyzeConfigurations();
      
      expect(Object.keys(auditor.results.configurations)).toHaveLength(0);
    });

    it('should handle file stat errors', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation(() => {
        throw new Error('Stat error');
      });
      
      await expect(auditor.analyzeConfigurations()).rejects.toThrow();
    });
  });

  describe('runSecurityAudit', () => {
    const mockAuditOutput = {
      metadata: {
        vulnerabilities: {
          low: 1,
          moderate: 2,
          high: 0,
          critical: 0
        },
        totalDependencies: 150
      }
    };

    beforeEach(() => {
      auditor.results.packageManager = 'npm';
    });

    it('should run npm security audit successfully', async () => {
      execSync.mockReturnValue(JSON.stringify(mockAuditOutput));
      
      await auditor.runSecurityAudit();
      
      expect(execSync).toHaveBeenCalledWith('npm audit --json', { encoding: 'utf8' });
      expect(auditor.results.security.vulnerabilities).toEqual(mockAuditOutput.metadata.vulnerabilities);
      expect(auditor.results.security.totalDependencies).toBe(150);
    });

    it('should run yarn security audit', async () => {
      auditor.results.packageManager = 'yarn';
      execSync.mockReturnValue(JSON.stringify(mockAuditOutput));
      
      await auditor.runSecurityAudit();
      
      expect(execSync).toHaveBeenCalledWith('yarn audit --json', { encoding: 'utf8' });
    });

    it('should run pnpm security audit', async () => {
      auditor.results.packageManager = 'pnpm';
      execSync.mockReturnValue(JSON.stringify(mockAuditOutput));
      
      await auditor.runSecurityAudit();
      
      expect(execSync).toHaveBeenCalledWith('pnpm audit --json', { encoding: 'utf8' });
    });

    it('should handle unknown package manager', async () => {
      auditor.results.packageManager = 'unknown';
      
      await auditor.runSecurityAudit();
      
      expect(console.warn).toHaveBeenCalledWith('⚠️  Unknown package manager, skipping security audit');
      expect(execSync).not.toHaveBeenCalled();
    });

    it('should handle audit command failure', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Audit failed');
      });
      
      await auditor.runSecurityAudit();
      
      expect(auditor.results.security.error).toBe('Audit failed');
      expect(console.warn).toHaveBeenCalledWith('⚠️  Security audit failed:', 'Audit failed');
    });

    it('should handle malformed audit output', async () => {
      execSync.mockReturnValue('invalid json');
      
      await auditor.runSecurityAudit();
      
      expect(auditor.results.security.error).toBeDefined();
    });
  });

  describe('analyzeLicenses', () => {
    beforeEach(() => {
      auditor.results.dependencies = {
        production: { 'react': '^18.0.0', 'express': '^4.18.0' },
        development: { 'jest': '^29.0.0' }
      };
    });

    it('should count total dependencies', async () => {
      await auditor.analyzeLicenses();
      
      expect(auditor.results.licenses.total).toBe(3);
      expect(auditor.results.licenses.analyzed).toBe(false);
    });

    it('should handle license analysis errors', async () => {
      // Mock an error scenario
      const originalDeps = auditor.results.dependencies;
      auditor.results.dependencies = null;
      
      await auditor.analyzeLicenses();
      
      expect(console.warn).toHaveBeenCalledWith('⚠️  License analysis failed:', expect.any(String));
      
      // Restore dependencies
      auditor.results.dependencies = originalDeps;
    });
  });

  describe('walkDirectory', () => {
    const mockCallback = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      path.join.mockImplementation((dir, item) => `${dir}/${item}`);
    });

    it('should walk directory and call callback for files', async () => {
      const mockItems = ['file1.js', 'file2.tsx', 'subdir'];
      fs.readdirSync.mockReturnValue(mockItems);
      fs.statSync.mockImplementation((filePath) => ({
        isFile: () => !filePath.includes('subdir'),
        isDirectory: () => filePath.includes('subdir')
      }));

      await auditor.walkDirectory('/mock/dir', mockCallback);

      expect(mockCallback).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenCalledWith('/mock/dir/file1.js');
      expect(mockCallback).toHaveBeenCalledWith('/mock/dir/file2.tsx');
    });

    it('should skip ignored directories', async () => {
      const mockItems = ['node_modules', '.git', 'src', 'dist'];
      fs.readdirSync.mockReturnValue(mockItems);
      fs.statSync.mockReturnValue({
        isFile: () => false,
        isDirectory: () => true
      });

      await auditor.walkDirectory('/mock/dir', mockCallback);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should respect max depth limit', async () => {
      fs.readdirSync.mockReturnValue(['subdir']);
      fs.statSync.mockReturnValue({
        isFile: () => false,
        isDirectory: () => true
      });

      await auditor.walkDirectory('/mock/dir', mockCallback, 1, 1);

      expect(fs.readdirSync).toHaveBeenCalledTimes(1);
    });

    it('should handle recursive directories', async () => {
      let callCount = 0;
      fs.readdirSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return ['subdir'];
        return ['file.js'];
      });
      
      fs.statSync.mockImplementation((filePath) => ({
        isFile: () => filePath.includes('file.js'),
        isDirectory: () => filePath.includes('subdir')
      }));

      await auditor.walkDirectory('/mock/dir', mockCallback);

      expect(mockCallback).toHaveBeenCalledWith('/mock/dir/subdir/file.js');
    });
  });

  describe('saveResults', () => {
    it('should save results to default file', async () => {
      const mockResults = { test: 'data' };
      auditor.results = mockResults;
      path.join.mockReturnValue('/mock/project/package-audit-results.json');

      await auditor.saveResults();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/project/package-audit-results.json',
        JSON.stringify(mockResults, null, 2)
      );
      expect(console.log).toHaveBeenCalledWith('📊 Audit results saved to package-audit-results.json');
    });

    it('should save results to custom file', async () => {
      const customPath = 'custom-audit.json';
      path.join.mockReturnValue(`/mock/project/${customPath}`);

      await auditor.saveResults(customPath);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        `/mock/project/${customPath}`,
        expect.any(String)
      );
      expect(console.log).toHaveBeenCalledWith(`📊 Audit results saved to ${customPath}`);
    });

    it('should handle file write errors', async () => {
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      await expect(auditor.saveResults()).rejects.toThrow('Write error');
    });
  });

  describe('audit - integration test', () => {
    let mockPackageJson;

    beforeEach(() => {
      mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: { 'react': '^18.0.0' },
        devDependencies: { 'jest': '^29.0.0' }
      };

      // Mock all required methods
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));
      fs.statSync.mockReturnValue({
        size: 1024,
        mtime: new Date('2023-01-01')
      });
      
      auditor.walkDirectory = jest.fn().mockResolvedValue();
      execSync.mockReturnValue(JSON.stringify({
        metadata: { vulnerabilities: {}, totalDependencies: 1 }
      }));
    });

    it('should complete full audit successfully', async () => {
      const results = await auditor.audit();

      expect(results).toBeDefined();
      expect(results.name).toBe('test-project');
      expect(results.version).toBe('1.0.0');
      expect(results.timestamp).toBeDefined();
      expect(console.log).toHaveBeenCalledWith('🔍 Starting tech stack audit...');
      expect(console.log).toHaveBeenCalledWith('✅ Audit completed successfully');
    });

    it('should handle audit errors and throw', async () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      await expect(auditor.audit()).rejects.toThrow('File read error');
      expect(console.error).toHaveBeenCalledWith('❌ Audit failed:', 'File read error');
    });

    it('should call all audit methods in sequence', async () => {
      const spies = [
        jest.spyOn(auditor, 'analyzePackageFiles'),
        jest.spyOn(auditor, 'scanSourceCode'),
        jest.spyOn(auditor, 'detectFrameworks'),
        jest.spyOn(auditor, 'analyzeConfigurations'),
        jest.spyOn(auditor, 'runSecurityAudit'),
        jest.spyOn(auditor, 'analyzeLicenses')
      ];

      await auditor.audit();

      spies.forEach(spy => {
        expect(spy).toHaveBeenCalled();
      });

      spies.forEach(spy => spy.mockRestore());
    });
  });
});