/**
 * Accessibility (a11y) Tests
 */
describe('Accessibility Tests', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '';
    loadHTML();
    loadCSS();
  });

  describe('Semantic HTML', () => {
    test('should use semantic HTML5 elements', () => {
      expect(document.querySelector('header')).toBeTruthy();
      expect(document.querySelector('main')).toBeTruthy();
      expect(document.querySelector('nav')).toBeTruthy();
      expect(document.querySelectorAll('section')).toHaveLength(3);
    });

    test('should have proper heading hierarchy', () => {
      const h1 = document.querySelectorAll('h1');
      expect(h1).toHaveLength(1);

      const h2 = document.querySelectorAll('h2');
      expect(h2.length).toBeGreaterThanOrEqual(1);

      const h3 = document.querySelectorAll('h3');
      expect(h3.length).toBeGreaterThanOrEqual(1);
    });

    test('should have meaningful heading text', () => {
      const h1 = document.querySelector('h1');
      expect(h1.textContent.trim()).toBe('Sweetest Moments Start Here');

      const h2 = document.querySelector('h2');
      expect(h2.textContent.trim()).toBe('Featured Products');
    });
  });

  describe('Images and Media', () => {
    test('should have alt text for all images', () => {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        const alt = img.getAttribute('alt');
        expect(alt).toBeTruthy();
        expect(alt.length).toBeGreaterThan(0);
      });
    });

    test('should have descriptive alt text', () => {
      const heroImg = document.querySelector('.hero-img');
      expect(heroImg.getAttribute('alt')).toBe('Colorful assorted candies');
    });
  });

  describe('Navigation and Links', () => {
    test('should have accessible navigation structure', () => {
      const nav = document.querySelector('nav');
      expect(nav).toBeTruthy();

      const navList = nav.querySelector('ul');
      expect(navList).toBeTruthy();

      const navItems = navList.querySelectorAll('li');
      expect(navItems.length).toBeGreaterThan(0);
    });

    test('should have meaningful link text', () => {
      const navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        const text = link.textContent.trim();
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toBe('click here');
        expect(text).not.toBe('read more');
      });
    });

    test('should have proper button accessibility', () => {
      const buttons = document.querySelectorAll('.btn');
      buttons.forEach(btn => {
        const text = btn.textContent.trim();
        expect(text.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Language and Content', () => {
    test('should have language attribute', () => {
      const html = document.documentElement;
      expect(html.getAttribute('lang')).toBe('en');
    });

    test('should have meaningful page title', () => {
      const title = document.querySelector('title');
      expect(title.textContent).toBe('Sweet Delights - Premium Handcrafted Candies');
    });
  });

  describe('Color Contrast and Visibility', () => {
    test('should use high contrast color variables', () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      const primaryColor = computedStyle.getPropertyValue('--color-primary').trim();
      const textColor = computedStyle.getPropertyValue('--color-text').trim();
      const backgroundColor = computedStyle.getPropertyValue('--color-background').trim();
      
      expect(primaryColor).toBe('#FF6B9D');
      expect(textColor).toBe('#2D3436');
      expect(backgroundColor).toBe('#FFFFFF');
    });

    test('should support high contrast mode', () => {
      // CSS should include @media (prefers-contrast: high) rules
      const cssContent = document.querySelector('style').textContent;
      expect(cssContent).toContain('prefers-contrast: high');
    });

    test('should support reduced motion preferences', () => {
      const cssContent = document.querySelector('style').textContent;
      expect(cssContent).toContain('prefers-reduced-motion: reduce');
    });
  });

  describe('Focus Management', () => {
    test('should have focus styles defined', () => {
      const cssContent = document.querySelector('style').textContent;
      expect(cssContent).toContain(':focus');
    });

    test('should have visible focus indicators', () => {
      const cssContent = document.querySelector('style').textContent;
      expect(cssContent).toContain('outline: 2px solid');
    });
  });

  describe('Content Structure', () => {
    test('should have descriptive section content', () => {
      const heroDescription = document.querySelector('.hero-description');
      expect(heroDescription.textContent.trim().length).toBeGreaterThan(50);

      const sectionDescription = document.querySelector('.section-description');
      expect(sectionDescription.textContent.trim().length).toBeGreaterThan(20);
    });

    test('should have meaningful feature descriptions', () => {
      const featureDescriptions = document.querySelectorAll('.feature-description');
      featureDescriptions.forEach(desc => {
        expect(desc.textContent.trim().length).toBeGreaterThan(30);
      });
    });
  });
});