/**
 * Responsive Design Tests
 */
describe('Responsive Design Tests', () => {
  let styleElement;

  beforeEach(() => {
    document.documentElement.innerHTML = '';
    loadHTML();
    styleElement = loadCSS();
  });

  afterEach(() => {
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
  });

  describe('Viewport Meta Tag', () => {
    test('should have responsive viewport meta tag', () => {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      expect(viewportMeta).toBeTruthy();
      expect(viewportMeta.getAttribute('content')).toBe('width=device-width, initial-scale=1.0');
    });
  });

  describe('Container Responsiveness', () => {
    test('should have responsive container', () => {
      const container = document.querySelector('.container');
      const computedStyle = getComputedStyle(container);
      
      expect(computedStyle.maxWidth).toBe('1200px');
      expect(computedStyle.margin).toBe('0px auto');
    });
  });

  describe('Grid Responsiveness', () => {
    test('should have responsive product grid', () => {
      const productsGrid = document.querySelector('.products-grid');
      const computedStyle = getComputedStyle(productsGrid);
      
      expect(computedStyle.display).toBe('grid');
      expect(computedStyle.gridTemplateColumns).toContain('auto-fit');
      expect(computedStyle.gridTemplateColumns).toContain('minmax(300px, 1fr)');
    });

    test('should have responsive features grid', () => {
      const featuresGrid = document.querySelector('.features-grid');
      const computedStyle = getComputedStyle(featuresGrid);
      
      expect(computedStyle.display).toBe('grid');
      expect(computedStyle.gridTemplateColumns).toContain('auto-fit');
      expect(computedStyle.gridTemplateColumns).toContain('minmax(400px, 1fr)');
    });
  });

  describe('Mobile Layout Structure', () => {
    test('should maintain proper heading hierarchy on mobile', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const h1 = document.querySelector('h1');
      const h2s = document.querySelectorAll('h2');
      const h3s = document.querySelectorAll('h3');

      expect(h1).toBeTruthy();
      expect(h2s.length).toBeGreaterThan(0);
      expect(h3s.length).toBeGreaterThan(0);
    });
  });

  describe('Flexible Images', () => {
    test('should have responsive images', () => {
      const heroImg = document.querySelector('.hero-img');
      const computedStyle = getComputedStyle(heroImg);
      
      expect(computedStyle.width).toBe('100%');
      expect(computedStyle.height).toBe('auto');
    });
  });
});