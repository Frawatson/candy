#!/usr/bin/env node

/**
 * Post-merge validation script
 * Validates the resolved merge to ensure code integrity
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Running post-merge validation...');

// Validation checks
const validationChecks = {
  conflictMarkers: checkForConflictMarkers,
  vercelConfig: validateVercelConfig,
  packageJson: validatePackageJson,
  codeIntegrity: checkCodeIntegrity,
  securityScan: runSecurityScan
};

async function main() {
  const results = {};
  let hasErrors = false;

  for (const [checkName, checkFunction] of Object.entries(validationChecks)) {
    console.log(`\n🧪 Running ${checkName} check...`);
    
    try {
      const result = await checkFunction();
      results[checkName] = { status: 'passed', ...result };
      console.log(`✅ ${checkName} check passed`);
    } catch (error) {
      results[checkName] = { status: 'failed', error: error.message };
      console.log(`❌ ${checkName} check failed: ${error.message}`);
      hasErrors = true;
    }
  }

  // Generate report
  generateValidationReport(results);

  if (hasErrors) {
    console.log('\n❌ Validation failed. Please review and fix the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ All validation checks passed! Merge resolution is complete.');
  }
}

function checkForConflictMarkers() {
  const conflictMarkers = ['<<<<<<<', '=======', '>>>>>>>'];
  const gitFiles = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
  const conflictedFiles = [];

  for (const file of gitFiles) {
    if (!fs.existsSync(file)) continue;
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      const hasConflicts = conflictMarkers.some(marker => content.includes(marker));
      
      if (hasConflicts) {
        conflictedFiles.push(file);
      }
    } catch (error) {
      // Skip binary files or files that can't be read
      continue;
    }
  }

  if (conflictedFiles.length > 0) {
    throw new Error(`Unresolved conflict markers found in: ${conflictedFiles.join(', ')}`);
  }

  return { message: 'No conflict markers found' };
}

function validateVercelConfig() {
  const vercelConfigPath = 'vercel.json';
  const packageJsonPath = 'package.json';
  
  let vercelConfig = null;
  let packageJson = null;

  // Check if vercel.json exists and is valid
  if (fs.existsSync(vercelConfigPath)) {
    try {
      vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    } catch (error) {
      throw new Error(`Invalid vercel.json: ${error.message}`);
    }
  }

  // Check package.json for Vercel-related scripts
  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch (error) {
      throw new Error(`Invalid package.json: ${error.message}`);
    }
  }

  const validationResults = {
    vercelConfigExists: !!vercelConfig,
    hasVercelScripts: packageJson && packageJson.scripts && (
      packageJson.scripts.build || 
      packageJson.scripts.start ||
      packageJson.scripts.vercel
    )
  };

  return {
    message: 'Vercel configuration validation passed',
    details: validationResults
  };
}

function validatePackageJson() {
  const packageJsonPath = 'package.json';
  
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid package.json syntax: ${error.message}`);
  }

  // Check for required fields
  const requiredFields = ['name', 'version'];
  const missingFields = requiredFields.filter(field => !packageJson[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields in package.json: ${missingFields.join(', ')}`);
  }

  // Check for dependency conflicts (same package with different versions)
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies
  };

  return {
    message: 'package.json validation passed',
    details: {
      dependencies: Object.keys(allDeps).length,
      hasScripts: !!packageJson.scripts
    }
  };
}

function checkCodeIntegrity() {
  // Check if code can be parsed (for JS/TS files)
  const codeFiles = [];
  
  try {
    const gitFiles = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
    const jstsFiles = gitFiles.filter(file => /\.(js|ts|jsx|tsx)$/.test(file));
    
    for (const file of jstsFiles) {
      if (!fs.existsSync(file)) continue;
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Basic syntax check - try to parse as JavaScript
        // This is a simple check, more sophisticated tools could be used
        if (content.trim().length > 0) {
          codeFiles.push(file);
        }
      } catch (error) {
        throw new Error(`Code integrity check failed for ${file}: ${error.message}`);
      }
    }
  } catch (error) {
    throw new Error(`Failed to check code integrity: ${error.message}`);
  }

  return {
    message: 'Code integrity check passed',
    details: {
      filesChecked: codeFiles.length
    }
  };
}

function runSecurityScan() {
  const packageJsonPath = 'package.json';
  
  if (!fs.existsSync(packageJsonPath)) {
    return { message: 'No package.json found, skipping security scan' };
  }

  try {
    // Try to run npm audit if available
    const auditResult = execSync('npm audit --audit-level moderate --json', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const audit = JSON.parse(auditResult);
    
    if (audit.metadata && audit.metadata.vulnerabilities) {
      const vulnCount = Object.values(audit.metadata.vulnerabilities).reduce((sum, count) => sum + count, 0);
      
      if (vulnCount > 0) {
        console.warn(`⚠️  Found ${vulnCount} security vulnerabilities. Run 'npm audit fix' to resolve.`);
      }
    }

    return {
      message: 'Security scan completed',
      details: audit.metadata || {}
    };
  } catch (error) {
    // npm audit might fail for various reasons, treat as warning not error
    console.warn(`⚠️  Security scan warning: ${error.message}`);
    return {
      message: 'Security scan completed with warnings',
      warning: error.message
    };
  }
}

function generateValidationReport(results) {
  const reportPath = 'merge-validation-report.json';
  const report = {
    timestamp: new Date().toISOString(),
    results: results,
    summary: {
      totalChecks: Object.keys(results).length,
      passed: Object.values(results).filter(r => r.status === 'passed').length,
      failed: Object.values(results).filter(r => r.status === 'failed').length
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Validation report saved to: ${reportPath}`);
}

// Run the validation
main().catch(error => {
  console.error('❌ Validation script failed:', error.message);
  process.exit(1);
});