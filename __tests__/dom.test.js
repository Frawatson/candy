/**
 * DOM Structure and Accessibility Tests
 */
describe('DOM Structure Tests', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '';
    loadHTML();
  });

  describe('HTML Document Structure', () => {
    test('should have valid HTML5 document structure', () => {
      const doctype = document.doctype;
      expect(doctype.name).toBe('html');
      
      const html = document.documentElement;
      expect(html.getAttribute('lang')).toBe('en');
    });

    test('should have required meta tags', () => {
      const charset = document.querySelector('meta[charset]');
      expect(charset.getAttribute('charset')).toBe('UTF-8');

      const viewport = document.querySelector('meta[name="viewport"]');
      expect(viewport.getAttribute('content')).toBe('width=device-width, initial-scale=1.0');
    });

    test('should have proper title', () => {
      const title = document.querySelector('title');
      expect(title.textContent).toBe('Sweet Delights - Premium Handcrafted Candies');
    });

    test('should link to CSS stylesheet', () => {
      const cssLink = document.querySelector('link[rel="stylesheet"]');
      expect(cssLink.getAttribute('href')).toBe('styles/main.css');
    });
  });

  describe('Header Structure', () => {
    test('should have header with correct structure', () => {
      const header = document.querySelector('header.header');
      expect(header).toBeTruthy();

      const container = header.querySelector('.container');
      expect(container).toBeTruthy();

      const headerContent = container.querySelector('.header-content');
      expect(headerContent).toBeTruthy();
    });

    test('should have logo with icon and text', () => {
      const logo = document.querySelector('.logo');
      expect(logo).toBeTruthy();

      const logoIcon = logo.querySelector('.logo-icon');
      const logoText = logo.querySelector('.logo-text');
      
      expect(logoIcon.textContent).toBe('🍭');
      expect(logoText.textContent).toBe('Sweet Delights');
    });

    test('should have navigation with correct links', () => {
      const nav = document.querySelector('.nav');
      expect(nav).toBeTruthy();

      const navList = nav.querySelector('.nav-list');
      const navLinks = navList.querySelectorAll('.nav-link');
      
      expect(navLinks).toHaveLength(4);
      
      const expectedLinks = ['Home', 'Products', 'About', 'Contact'];
      navLinks.forEach((link, index) => {
        expect(link.textContent).toBe(expectedLinks[index]);
        expect(link.getAttribute('href')).toBe('#');
      });
    });

    test('should have cart element', () => {
      const cart = document.querySelector('.cart');
      expect(cart).toBeTruthy();

      const cartIcon = cart.querySelector('.cart-icon');
      const cartText = cart.querySelector('.cart-text');
      
      expect(cartIcon.textContent).toBe('🛒');
      expect(cartText.textContent).toBe('Cart (0)');
    });
  });

  describe('Main Content Structure', () => {
    test('should have hero section with correct content', () => {
      const hero = document.querySelector('.hero');
      expect(hero).toBeTruthy();

      const heroTitle = hero.querySelector('.hero-title');
      const heroDescription = hero.querySelector('.hero-description');
      const heroActions = hero.querySelector('.hero-actions');
      
      expect(heroTitle.textContent).toBe('Sweetest Moments Start Here');
      expect(heroDescription.textContent.trim()).toContain('Discover our handcrafted candies');
      expect(heroActions.querySelectorAll('.btn')).toHaveLength(2);
    });

    test('should have hero image with proper alt text', () => {
      const heroImg = document.querySelector('.hero-img');
      expect(heroImg).toBeTruthy();
      expect(heroImg.getAttribute('alt')).toBe('Colorful assorted candies');
      expect(heroImg.getAttribute('src')).toBe('images/hero-candies.jpg');
    });

    test('should have featured products section', () => {
      const featuredProducts = document.querySelector('.featured-products');
      expect(featuredProducts).toBeTruthy();

      const sectionTitle = featuredProducts.querySelector('.section-title');
      expect(sectionTitle.textContent).toBe('Featured Products');

      const productsGrid = featuredProducts.querySelector('.products-grid');
      const productPlaceholders = productsGrid.querySelectorAll('.product-placeholder');
      expect(productPlaceholders).toHaveLength(3);
    });

    test('should have features section', () => {
      const features = document.querySelector('.features');
      expect(features).toBeTruthy();

      const featuresGrid = features.querySelector('.features-grid');
      const featureItems = featuresGrid.querySelectorAll('.feature');
      expect(featureItems).toHaveLength(2);

      const expectedTitles = ['Natural Ingredients', 'Fast Shipping'];
      featureItems.forEach((feature, index) => {
        const title = feature.querySelector('.feature-title');
        expect(title.textContent).toBe(expectedTitles[index]);
      });
    });
  });

  describe('Accessibility Tests', () => {
    test('should have proper heading hierarchy', () => {
      const h1 = document.querySelectorAll('h1');
      const h2 = document.querySelectorAll('h2');
      const h3 = document.querySelectorAll('h3');

      expect(h1).toHaveLength(1);
      expect(h2.length).toBeGreaterThan(0);
      expect(h3.length).toBeGreaterThan(0);
    });

    test('should have alt text for images', () => {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        expect(img.getAttribute('alt')).toBeTruthy();
      });
    });

    test('should have semantic HTML elements', () => {
      expect(document.querySelector('header')).toBeTruthy();
      expect(document.querySelector('main')).toBeTruthy();
      expect(document.querySelector('nav')).toBeTruthy();
      expect(document.querySelectorAll('section')).toHaveLength(3);
    });

    test('should have proper link accessibility', () => {
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        // Links should have either text content or aria-label
        const hasText = link.textContent.trim().length > 0;
        const hasAriaLabel = link.getAttribute('aria-label');
        expect(hasText || hasAriaLabel).toBeTruthy();
      });
    });
  });
});