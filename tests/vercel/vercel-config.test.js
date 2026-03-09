```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Vercel Configuration', () => {
  let vercelConfig;
  let vercelIgnore;

  beforeEach(() => {
    // Load vercel.json configuration
    const configPath = join(process.cwd(), 'vercel.json');
    const configContent = readFileSync(configPath, 'utf-8');
    vercelConfig = JSON.parse(configContent);

    // Load .vercelignore file
    const ignorePath = join(process.cwd(), '.vercelignore');
    vercelIgnore = readFileSync(ignorePath, 'utf-8');
  });

  describe('vercel.json structure', () => {
    it('should have correct version', () => {
      expect(vercelConfig.version).toBe(2);
    });

    it('should have correct project name', () => {
      expect(vercelConfig.name).toBe('agentflow-app');
    });

    it('should have valid build configuration', () => {
      expect(vercelConfig.builds).toHaveLength(1);
      expect(vercelConfig.builds[0]).toEqual({
        src: 'package.json',
        use: '@vercel/static-build',
        config: {
          distDir: 'dist'
        }
      });
    });

    it('should have production environment set', () => {
      expect(vercelConfig.env).toEqual({
        NODE_ENV: 'production'
      });
    });

    it('should have correct output directory', () => {
      expect(vercelConfig.outputDirectory).toBe('dist');
    });

    it('should have build commands defined', () => {
      expect(vercelConfig.buildCommand).toBe('npm run build');
      expect(vercelConfig.devCommand).toBe('npm run dev');
      expect(vercelConfig.installCommand).toBe('npm install');
    });

    it('should have clean URLs enabled and trailing slash disabled', () => {
      expect(vercelConfig.cleanUrls).toBe(true);
      expect(vercelConfig.trailingSlash).toBe(false);
    });

    it('should have correct regions configured', () => {
      expect(vercelConfig.regions).toEqual(['iad1']);
    });
  });

  describe('routing configuration', () => {
    it('should have filesystem route handler first', () => {
      expect(vercelConfig.routes[0]).toEqual({
        handle: 'filesystem'
      });
    });

    it('should have API route configuration', () => {
      const apiRoute = vercelConfig.routes.find(route => route.src === '/api/(.*)');
      expect(apiRoute).toBeDefined();
      expect(apiRoute.dest).toBe('/api/$1');
    });

    it('should have SPA fallback route', () => {
      const spaRoute = vercelConfig.routes.find(route => route.src === '/(.*)');
      expect(spaRoute).toBeDefined();
      expect(spaRoute.dest).toBe('/index.html');
    });

    it('should have correct route order', () => {
      expect(vercelConfig.routes[0].handle).toBe('filesystem');
      expect(vercelConfig.routes[1].src).toBe('/api/(.*)');
      expect(vercelConfig.routes[2].src).toBe('/(.*)');
    });
  });

  describe('security headers', () => {
    let globalHeaders;

    beforeEach(() => {
      globalHeaders = vercelConfig.headers.find(h => h.source === '/(.*)');
    });

    it('should have security headers for all routes', () => {
      expect(globalHeaders).toBeDefined();
      expect(globalHeaders.headers).toHaveLength(5);
    });

    it('should have X-Content-Type-Options header', () => {
      const header = globalHeaders.headers.find(h => h.key === 'X-Content-Type-Options');
      expect(header).toBeDefined();
      expect(header.value).toBe('nosniff');
    });

    it('should have X-Frame-Options header', () => {
      const header = globalHeaders.headers.find(h => h.key === 'X-Frame-Options');
      expect(header).toBeDefined();
      expect(header.value).toBe('DENY');
    });

    it('should have X-XSS-Protection header', () => {
      const header = globalHeaders.headers.find(h => h.key === 'X-XSS-Protection');
      expect(header).toBeDefined();
      expect(header.value).toBe('1; mode=block');
    });

    it('should have Referrer-Policy header', () => {
      const header = globalHeaders.headers.find(h => h.key === 'Referrer-Policy');
      expect(header).toBeDefined();
      expect(header.value).toBe('strict-origin-when-cross-origin');
    });

    it('should have Permissions-Policy header', () => {
      const header = globalHeaders.headers.find(h => h.key === 'Permissions-Policy');
      expect(header).toBeDefined();
      expect(header.value).toBe('camera=(), microphone=(), geolocation=()');
    });
  });

  describe('caching configuration', () => {
    it('should have long-term caching for static assets', () => {
      const staticHeaders = vercelConfig.headers.find(h => h.source === '/static/(.*)');
      expect(staticHeaders).toBeDefined();
      
      const cacheHeader = staticHeaders.headers.find(h => h.key === 'Cache-Control');
      expect(cacheHeader.value).toBe('public, max-age=31536000, immutable');
    });

    it('should have long-term caching for asset files', () => {
      const assetHeaders = vercelConfig.headers.find(h => 
        h.source === '/(.*\\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot))'
      );
      expect(assetHeaders).toBeDefined();
      
      const cacheHeader = assetHeaders.headers.find(h => h.key === 'Cache-Control');
      expect(cacheHeader.value).toBe('public, max-age=31536000, immutable');
    });

    it('should have no caching for HTML files', () => {
      const htmlHeaders = vercelConfig.headers.find(h => h.source === '/(.*\\.html)');
      expect(htmlHeaders).toBeDefined();
      
      const cacheHeader = htmlHeaders.headers.find(h => h.key === 'Cache-Control');
      expect(cacheHeader.value).toBe('public, max-age=0, must-revalidate');
    });
  });

  describe('rewrites and redirects', () => {
    it('should have API rewrites configured', () => {
      expect(vercelConfig.rewrites).toHaveLength(1);
      expect(vercelConfig.rewrites[0]).toEqual({
        source: '/api/(.*)',
        destination: '/api/$1'
      });
    });

    it('should have home redirect configured', () => {
      expect(vercelConfig.redirects).toHaveLength(1);
      expect(vercelConfig.redirects[0]).toEqual({
        source: '/home',
        destination: '/',
        permanent: true
      });
    });
  });

  describe('functions configuration', () => {
    it('should have Node.js runtime for API functions', () => {
      expect(vercelConfig.functions).toBeDefined();
      expect(vercelConfig.functions['app/api/**/*.js']).toEqual({
        runtime: 'nodejs18.x'
      });
    });
  });
});
```