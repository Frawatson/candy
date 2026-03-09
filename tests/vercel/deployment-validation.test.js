```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

describe('Deployment Validation', () => {
  let vercelConfig;

  beforeEach(() => {
    const configPath = join(process.cwd(), 'vercel.json');
    const configContent = readFileSync(configPath, 'utf-8');
    vercelConfig = JSON.parse(configContent);
  });

  describe('package.json compatibility', () => {
    it('should have required scripts for Vercel deployment', async () => {
      const packagePath = join(process.cwd(), 'package.json');
      
      if (existsSync(packagePath)) {
        const packageContent = readFileSync(packagePath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        
        expect(packageJson.scripts).toBeDefined();
        expect(packageJson.scripts.build).toBeDefined();
        expect(packageJson.scripts.dev).toBeDefined();
      }
    });

    it('should validate build command exists', () => {
      expect(vercelConfig.buildCommand).toBe('npm run build');
    });

    it('should validate dev command exists', () => {
      expect(vercelConfig.devCommand).toBe('npm run dev');
    });
  });

  describe('route pattern validation', () => {
    it('should have valid regex patterns for routes', () => {
      vercelConfig.routes.forEach((route, index) => {
        if (route.src) {
          expect(() => new RegExp(route.src)).not.toThrow();
        }
      });
    });

    it('should have valid regex patterns for headers', () => {
      vercelConfig.headers.forEach((headerConfig, index) => {
        expect(() => new RegExp(headerConfig.source)).not.toThrow();
      });
    });
  });

  describe('security header validation', () => {
    it('should have all required security headers', () => {
      const globalHeaders = vercelConfig.headers.find(h => h.source === '/(.*)');
      const requiredHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Referrer-Policy',
        'Permissions-Policy'
      ];

      requiredHeaders.forEach(headerName => {
        const header = globalHeaders.headers.find(h => h.key === headerName);
        expect(header).toBeDefined();
        expect(header.value).toBeTruthy();
      });
    });

    it('should have secure header values', () => {
      const globalHeaders = vercelConfig.headers.find(h => h.source === '/(.*)');
      
      const xFrameOptions = globalHeaders.headers.find(h => h.key === 'X-Frame-Options');
      expect(['DENY', 'SAMEORIGIN']).toContain(xFrameOptions.value);

      const xContentTypeOptions = globalHeaders.headers.find(h => h.key === 'X-Content-Type-Options');
      expect(xContentTypeOptions.value).toBe('nosniff');
    });
  });

  describe('caching strategy validation', () => {
    it('should have appropriate cache headers for different file types', () => {
      const staticAssetHeader = vercelConfig.headers.find(h => 
        h.source === '/(.*\\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot))'
      );
      
      expect(staticAssetHeader).toBeDefined();
      const cacheControl = staticAssetHeader.headers.find(h => h.key === 'Cache-Control');
      expect(cacheControl.value).toContain('max-age=31536000');
      expect(cacheControl.value).toContain('immutable');
    });

    it('should prevent caching of HTML files', () => {
      const htmlHeader = vercelConfig.headers.find(h => h.source === '/(.*\\.html)');
      
      expect(htmlHeader).toBeDefined();
      const cacheControl = htmlHeader.headers.find(h => h.key === 'Cache-Control');
      expect(cacheControl.value).toContain('max-age=0');
      expect(cacheControl.value).toContain('must-revalidate');
    });
  });

  describe('function configuration validation', () => {
    it('should have valid Node.js runtime version', () => {
      const functionConfig = vercelConfig.functions['app/api/**/*.js'];
      expect(functionConfig.runtime).toMatch(/^nodejs\d+\.x$/);
    });

    it('should use supported Node.js version', () => {
      const functionConfig = vercelConfig.functions['app/api/**/*.js'];
      const supportedVersions = ['nodejs14.x', 'nodejs16.x', 'nodejs18.x', 'nodejs20.x'];
      expect(supportedVersions).toContain(functionConfig.runtime);
    });
  });

  describe('region configuration validation', () => {
    it('should have valid Vercel regions', () => {
      const validRegions = [
        'iad1', 'bom1', 'cdg1', 'cle1', 'cpt1', 'dub1', 'fra1',
        'gru1', 'hkg1', 'hnd1', 'kix1', 'lhr1', 'pdx1', 'sfo1',
        'sin1', 'syd1'
      ];
      
      vercelConfig.regions.forEach(region => {
        expect(validRegions).toContain(region);
      });
    });

    it('should not have duplicate regions', () => {
      const uniqueRegions = [...new Set(vercelConfig.regions)];
      expect(uniqueRegions).toHaveLength(vercelConfig.regions.length);
    });
  });
});
```