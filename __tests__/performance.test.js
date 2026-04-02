/**
 * Performance and Optimization Tests
 */
describe('Performance Tests', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '';
    loadHTML();
    loadCSS();
  });

  describe('CSS Optimization', () => {
    test('should use CSS custom properties for consistency', () => {
      const cssContent = document.querySelector('style').textContent;
      
      expect(cssContent).toContain('--color-primary');
      expect(cssContent).toContain('--spacing-md');
      expect(cssContent).toContain('--font-weight-bold');
      expect(cssContent).toContain('--radius');
    });

    test('should use efficient CSS selectors', () => {
      const cssContent = document.querySelector('style').textContent;
      
      // Should avoid overly specific selectors
      expect(cssContent).not.toContain('div.container > div.header > div.logo');
      
      // Should use class-based selectors
      expect(cssContent).toContain('.header');
      expect(cssContent).toContain('.logo');
      expect(cssContent).toContain('.btn');
    });

    test('should minimize CSS resets and normalize', () => {
      const cssContent = document.querySelector('style').textContent;
      
      // Should have a focused reset
      expect(cssContent).toContain('box-sizing: border-box');
      expect(cssContent).toContain('margin: 0');
      expect(cssContent).toContain('padding: 0');
    });

    test('should use CSS Grid and Flexbox efficiently', () => {
      const cssContent = document.querySelector('style').textContent;
      
      expect(cssContent).toContain('display: grid');
      expect(cssContent).toContain('display: flex');
      expect(cssContent).toContain('grid-template-columns');
      expect(cssContent).toContain('align-items');
    });
  });

  describe('Image Optimization', () => {
    test('should have proper image attributes', () => {
      const heroImg = document.querySelector('.hero-img');
      expect(heroImg.getAttribute('alt')).toBeTruthy();
      expect(heroImg.getAttribute('src')).toBeTruthy();
    });

    test('should use CSS for decorative images where possible', () => {
      const productImagePlaceholder = document.querySelector('.product-image-placeholder');
      expect(productImagePlaceholder).toBeTruthy();
      
      const computedStyle = getComputedStyle(productImagePlaceholder);
      expect(computedStyle.background).toContain('linear-gradient');
    });
  });

  describe('Font Loading', () => {
    test('should use system font stack for performance', () => {
      const body = document.body;
      const computedStyle = getComputedStyle(body);
      
      expect(computedStyle.fontFamily).toContain('system');
      expect(computedStyle.fontFamily).toContain('BlinkMacSystemFont');
      expect(computedStyle.fontFamily).toContain('Segoe UI');
    });
  });

  describe('Animation Performance', () => {
    test('should use transform and opacity for animations', () => {
      const cssContent = document.querySelector('style').textContent;
      
      expect(cssContent).toContain('transform: translateY');
      expect(cssContent).toContain('opacity');
    });

    test('should respect reduced motion preferences', () => {
      const cssContent = document.querySelector('style').textContent;
      
      expect(cssContent).toContain('prefers-reduced-motion: reduce');
      expect(cssContent).toContain('animation-duration: 0.01ms');
      expect(cssContent).toContain('transition-duration: 0.01ms');
    });

    test('should use efficient CSS transitions', () => {
      const cssContent = document.querySelector('style').textContent;
      
      expect(cssContent).toContain('transition: all 0.3s ease');
      expect(cssContent).not.toContain('transition: all');
    });
  });

  describe('Layout Optimization', () => {
    test('should avoid layout thrashing with sticky header', () => {
      const header = document.querySelector('.header');
      const computedStyle = getComputedStyle(header);
      
      expect(computedStyle.position).toBe('sticky');
      expect(computedStyle.zIndex).toBe('100');
    });

    test('should use efficient grid layouts', () => {
      const productsGrid = document.querySelector('.products-grid');
      const computedStyle = getComputedStyle(productsGrid);
      
      expect(computedStyle.display).toBe('grid');
      expect(computedStyle.gridTemplateColumns).toContain('auto-fit');
    });
  });

  describe('Resource Loading', () => {
    test('should have minimal external dependencies', () => {
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      const scripts = document.querySelectorAll('script[src]');
      
      expect(links).toHaveLength(1); // Only main.css
      expect(scripts).toHaveLength(0); // No external scripts
    });

    test('should use relative paths for assets', () => {
      const cssLink = document.querySelector('link[rel="stylesheet"]');
      const heroImg = document.querySelector('.hero-img');
      
      expect(cssLink.getAttribute('href')).toBe('styles/main.css');
      expect(heroImg.getAttribute('src')).toBe('images/hero-candies.jpg');
    });
  });
});