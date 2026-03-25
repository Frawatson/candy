#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Comprehensive dependency audit script
 * Analyzes the codebase to extract all technologies, frameworks, and dependencies
 */

class TechStackAuditor {
  constructor() {
    this.rootDir = process.cwd();
    this.results = {
      timestamp: new Date().toISOString(),
      packageManager: this.detectPackageManager(),
      dependencies: {
        production: {},
        development: {},
        peer: {},
        optional: {}
      },
      devTools: {},
      frameworks: [],
      libraries: [],
      configurations: {},
      scripts: {},
      engines: {},
      security: {},
      licenses: {}
    };
  }

  /**
   * Main audit execution
   */
  async audit() {
    console.log('🔍 Starting tech stack audit...');
    
    try {
      await this.analyzePackageFiles();
      await this.scanSourceCode();
      await this.detectFrameworks();
      await this.analyzeConfigurations();
      await this.runSecurityAudit();
      await this.analyzeLicenses();
      
      console.log('✅ Audit completed successfully');
      return this.results;
    } catch (error) {
      console.error('❌ Audit failed:', error.message);
      throw error;
    }
  }

  /**
   * Detect package manager being used
   */
  detectPackageManager() {
    if (fs.existsSync(path.join(this.rootDir, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(this.rootDir, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(this.rootDir, 'package-lock.json'))) return 'npm';
    return 'unknown';
  }

  /**
   * Analyze package.json and lock files
   */
  async analyzePackageFiles() {
    console.log('📦 Analyzing package files...');
    
    const packageJsonPath = path.join(this.rootDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.warn('⚠️  No package.json found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Extract basic package info
    this.results.name = packageJson.name;
    this.results.version = packageJson.version;
    this.results.description = packageJson.description;
    this.results.engines = packageJson.engines || {};
    this.results.scripts = packageJson.scripts || {};

    // Analyze dependencies
    this.results.dependencies.production = packageJson.dependencies || {};
    this.results.dependencies.development = packageJson.devDependencies || {};
    this.results.dependencies.peer = packageJson.peerDependencies || {};
    this.results.dependencies.optional = packageJson.optionalDependencies || {};

    // Analyze lock files for exact versions
    await this.analyzeLockFile();
  }

  /**
   * Analyze lock files for detailed dependency information
   */
  async analyzeLockFile() {
    const lockFiles = {
      'package-lock.json': 'npm',
      'yarn.lock': 'yarn',
      'pnpm-lock.yaml': 'pnpm'
    };

    for (const [lockFile, manager] of Object.entries(lockFiles)) {
      const lockPath = path.join(this.rootDir, lockFile);
      if (fs.existsSync(lockPath)) {
        console.log(`🔒 Analyzing ${lockFile}...`);
        // Basic lock file analysis - could be extended based on format
        const lockContent = fs.readFileSync(lockPath, 'utf8');
        this.results.lockFileSize = lockContent.length;
        break;
      }
    }
  }

  /**
   * Scan source code for technology patterns
   */
  async scanSourceCode() {
    console.log('🔍 Scanning source code...');
    
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.py', '.java', '.go', '.php'];
    const techPatterns = {
      // Frontend frameworks
      react: [/import.*from ['"]react['"]/, /React\./],
      vue: [/import.*from ['"]vue['"]/, /<template>/],
      angular: [/import.*from ['"]@angular/, /ngOnInit/],
      svelte: [/<script>/, /export let/],
      
      // Backend frameworks
      express: [/require\(['"]express['"]\)/, /app\.listen/],
      fastify: [/require\(['"]fastify['"]\)/, /fastify\./],
      koa: [/require\(['"]koa['"]\)/, /ctx\./],
      
      // Testing frameworks
      jest: [/describe\(/, /test\(/, /expect\(/],
      mocha: [/describe\(/, /it\(/],
      cypress: [/cy\./, /Cypress\./],
      
      // Build tools
      webpack: [/webpack/, /module\.exports/],
      vite: [/vite/, /import\.meta/],
      rollup: [/rollup/],
      
      // Styling
      tailwind: [/@tailwind/, /class.*['"]/],
      sass: [/@import/, /\$\w+:/],
      styled: [/styled\./, /css`/]
    };

    const foundTechnologies = new Set();
    
    await this.walkDirectory(this.rootDir, async (filePath) => {
      const ext = path.extname(filePath);
      if (!extensions.includes(ext)) return;
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        for (const [tech, patterns] of Object.entries(techPatterns)) {
          if (patterns.some(pattern => pattern.test(content))) {
            foundTechnologies.add(tech);
          }
        }
      } catch (error) {
        // Ignore files that can't be read
      }
    });

    this.results.detectedTechnologies = Array.from(foundTechnologies);
  }

  /**
   * Detect frameworks based on file structure and patterns
   */
  async detectFrameworks() {
    console.log('🏗️  Detecting frameworks...');
    
    const frameworkIndicators = {
      'Next.js': ['next.config.js', 'pages/'],
      'Nuxt.js': ['nuxt.config.js', 'nuxt.config.ts'],
      'Gatsby': ['gatsby-config.js', 'gatsby-node.js'],
      'Create React App': ['public/index.html', 'src/App.js'],
      'Vue CLI': ['vue.config.js', 'src/main.js'],
      'Angular CLI': ['angular.json', 'src/app/'],
      'Svelte Kit': ['svelte.config.js', 'src/routes/'],
      'Remix': ['remix.config.js', 'app/root.tsx'],
      'Astro': ['astro.config.mjs', 'src/pages/'],
      'Express.js': ['app.js', 'server.js'],
      'Fastify': ['server.js', 'index.js'],
      'Django': ['manage.py', 'settings.py'],
      'Flask': ['app.py', 'wsgi.py'],
      'Spring Boot': ['pom.xml', 'build.gradle'],
      'Laravel': ['artisan', 'composer.json']
    };

    for (const [framework, indicators] of Object.entries(frameworkIndicators)) {
      const hasFramework = indicators.some(indicator => {
        const fullPath = path.join(this.rootDir, indicator);
        return fs.existsSync(fullPath) || 
               (indicator.endsWith('/') && fs.existsSync(fullPath.slice(0, -1)));
      });

      if (hasFramework) {
        this.results.frameworks.push(framework);
      }
    }
  }

  /**
   * Analyze configuration files
   */
  async analyzeConfigurations() {
    console.log('⚙️  Analyzing configurations...');
    
    const configFiles = [
      'webpack.config.js', 'vite.config.js', 'rollup.config.js',
      '.babelrc', 'babel.config.js',
      '.eslintrc.js', '.eslintrc.json', 'eslint.config.js',
      'prettier.config.js', '.prettierrc',
      'tsconfig.json', 'jsconfig.json',
      'jest.config.js', 'vitest.config.js',
      'cypress.json', 'cypress.config.js',
      'tailwind.config.js', 'postcss.config.js',
      '.env', '.env.example', '.env.local',
      'docker-compose.yml', 'Dockerfile',
      '.github/workflows/', '.gitlab-ci.yml',
      'vercel.json', 'netlify.toml'
    ];

    for (const configFile of configFiles) {
      const fullPath = path.join(this.rootDir, configFile);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        this.results.configurations[configFile] = {
          exists: true,
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      }
    }
  }

  /**
   * Run security audit
   */
  async runSecurityAudit() {
    console.log('🔐 Running security audit...');
    
    try {
      let auditCommand;
      switch (this.results.packageManager) {
        case 'npm':
          auditCommand = 'npm audit --json';
          break;
        case 'yarn':
          auditCommand = 'yarn audit --json';
          break;
        case 'pnpm':
          auditCommand = 'pnpm audit --json';
          break;
        default:
          console.warn('⚠️  Unknown package manager, skipping security audit');
          return;
      }

      const auditOutput = execSync(auditCommand, { encoding: 'utf8' });
      const auditResult = JSON.parse(auditOutput);
      
      this.results.security = {
        vulnerabilities: auditResult.metadata?.vulnerabilities || {},
        totalDependencies: auditResult.metadata?.totalDependencies || 0,
        auditDate: new Date().toISOString()
      };
    } catch (error) {
      console.warn('⚠️  Security audit failed:', error.message);
      this.results.security = { error: error.message };
    }
  }

  /**
   * Analyze dependency licenses
   */
  async analyzeLicenses() {
    console.log('📄 Analyzing licenses...');
    
    try {
      // This would require license-checker package, but we'll do basic analysis
      const allDeps = {
        ...this.results.dependencies.production,
        ...this.results.dependencies.development
      };

      this.results.licenses = {
        total: Object.keys(allDeps).length,
        analyzed: false,
        note: 'Install license-checker for detailed license analysis'
      };
    } catch (error) {
      console.warn('⚠️  License analysis failed:', error.message);
    }
  }

  /**
   * Walk directory recursively
   */
  async walkDirectory(dir, callback, maxDepth = 10, currentDepth = 0) {
    if (currentDepth >= maxDepth) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      // Skip common directories that shouldn't be scanned
      if (['node_modules', '.git', 'dist', 'build', '.next', '.nuxt'].includes(item)) {
        continue;
      }
      
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isFile()) {
        await callback(fullPath);
      } else if (stats.isDirectory()) {
        await this.walkDirectory(fullPath, callback, maxDepth, currentDepth + 1);
      }
    }
  }

  /**
   * Save results to file
   */
  async saveResults(outputPath = 'package-audit-results.json') {
    const outputFile = path.join(this.rootDir, outputPath);
    fs.writeFileSync(outputFile, JSON.stringify(this.results, null, 2));
    console.log(`📊 Audit results saved to ${outputPath}`);
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new TechStackAuditor();
  auditor.audit()
    .then(results => auditor.saveResults())
    .catch(error => {
      console.error('❌ Audit failed:', error);
      process.exit(1);
    });
}

module.exports = TechStackAuditor;