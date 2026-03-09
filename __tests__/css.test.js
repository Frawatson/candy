/**
 * CSS Styling and Layout Tests
 */
describe('CSS Styling Tests', () => {
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

  describe('CSS Variables (Custom Properties)', () => {
    test('should define color variables', () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      expect(computedStyle.getPropertyValue('--color-primary').trim()).toBe('#FF6B9D');
      expect(computedStyle.getPropertyValue('--color-secondary').trim()).toBe('#4ECDC4');
      expect(computedStyle.getPropertyValue('--color-accent').trim()).toBe('#FFE66D');
      expect(computedStyle.getPropertyValue('--color-background').trim()).toBe('#FFFFFF');
    });

    test('should define typography variables', () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      expect(computedStyle.getPropertyValue('--font-weight-normal').trim()).toBe('400');
      expect(computedStyle.getPropertyValue('--font-weight-bold').trim()).toBe('700');
    });

    test('should define spacing variables', () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      expect(computedStyle.getPropertyValue('--spacing-sm').trim()).toBe('0.5rem');
      expect(computedStyle.getPropertyValue('--spacing-md').trim()).toBe('1rem');
      expect(computedStyle.getPropertyValue('--spacing-lg').trim()).toBe('1.5rem');
    });

    test('should define border radius variables', () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      expect(computedStyle.getPropertyValue('--radius').trim()).toBe('8px');
      expect(computedStyle.getPropertyValue('--radius-lg').trim()).toBe('12px');
    });
  });

  describe('Base Styles', () => {
    test('should apply CSS reset', () => {
      const body = document.body;
      const computedStyle = getComputedStyle(body);
      
      expect(computedStyle.margin).toBe('0px');
      expect(computedStyle.padding).toBe('0px');
      expect(computedStyle.boxSizing).toBe('border-box');
    });

    test('should set body typography', () => {
      const body = document.body;
      const computedStyle = getComputedStyle(body);
      
      expect(computedStyle.fontFamily).toContain('system');
      expect(computedStyle.lineHeight).toBe('1.6');
    });
  });

  describe('Header Styles', () => {
    test('should style header correctly', () => {
      const header = document.querySelector('.header');
      const computedStyle = getComputedStyle(header);
      
      expect(computedStyle.position).toBe('sticky');
      expect(computedStyle.top).toBe('0px');
      expect(computedStyle.zIndex).toBe('100');
    });

    test('should style logo correctly', () => {
      const logo = document.querySelector('.logo');
      const computedStyle = getComputedStyle(logo);
      
      expect(computedStyle.display).toBe('flex');
      expect(computedStyle.alignItems).toBe('center');
    });

    test('should style navigation correctly', () => {
      const navList = document.querySelector('.nav-list');
      const computedStyle = getComputedStyle(navList);
      
      expect(computedStyle.display).toBe('flex');
      expect(computedStyle.listStyle).toBe('none');
    });
  });

  describe('Hero Section Styles', () => {
    test('should style hero section correctly', () => {
      const hero = document.querySelector('.hero');
      const computedStyle = getComputedStyle(hero);
      
      expect(computedStyle.background).toContain('linear-gradient');
    });

    test('should style hero title correctly', () => {
      const heroTitle = document.querySelector('.hero-title');
      const computedStyle = getComputedStyle(heroTitle);
      
      expect(computedStyle.fontSize).toBe('3rem');
      expect(computedStyle.fontWeight).toBe('700');
    });
  });

  describe('Button Styles', () => {
    test('should style primary button correctly', () => {
      const primaryBtn = document.querySelector('.btn-primary');
      const computedStyle = getComputedStyle(primaryBtn);
      
      expect(computedStyle.background).toContain('linear-gradient');
      expect(computedStyle.color).toBe('white');
      expect(computedStyle.border).toBe('none');
    });

    test('should style secondary button correctly', () => {
      const secondaryBtn = document.querySelector('.btn-secondary');
      const computedStyle = getComputedStyle(secondaryBtn);
      
      expect(computedStyle.background).toBe('transparent');
      expect(computedStyle.border).toContain('2px solid');
    });
  });

  describe('Product Grid Styles', () => {
    test('should style products grid correctly', () => {
      const productsGrid = document.querySelector('.products-grid');
      const computedStyle = getComputedStyle(productsGrid);
      
      expect(computedStyle.display).toBe('grid');
      expect(computedStyle.gridTemplateColumns).toContain('repeat(auto-fit, minmax(300px, 1fr))');
    });

    test('should style product placeholders correctly', () => {
      const productPlaceholder = document.querySelector('.product-placeholder');
      const computedStyle = getComputedStyle(productPlaceholder);
      
      expect(computedStyle.borderRadius).toBe('12px');
      expect(computedStyle.boxShadow).toBeTruthy();
    });
  });

  describe('Features Section Styles', () => {
    test('should style features grid correctly', () => {
      const featuresGrid = document.querySelector('.features-grid');
      const computedStyle = getComputedStyle(featuresGrid);
      
      expect(computedStyle.display).toBe('grid');
      expect(computedStyle.gridTemplateColumns).toContain('repeat(auto-fit, minmax(400px, 1fr))');
    });
  });
});