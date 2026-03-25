/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Design Tokens (tokens.css)', () => {
  let testElement;
  let computedStyle;

  beforeEach(() => {
    // Create a test element to check computed styles
    testElement = document.createElement('div');
    testElement.className = 'test-element';
    document.body.appendChild(testElement);
    computedStyle = getComputedStyle(testElement);
  });

  afterEach(() => {
    document.body.removeChild(testElement);
  });

  describe('Color Tokens', () => {
    describe('Primary Colors', () => {
      it('should define all primary color shades', () => {
        const primaryShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
        
        primaryShades.forEach(shade => {
          const value = computedStyle.getPropertyValue(`--color-primary-${shade}`);
          expect(value.trim()).toBeTruthy();
          expect(value.trim()).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });

      it('should have correct main primary color', () => {
        const primaryMain = computedStyle.getPropertyValue('--color-primary-500').trim();
        expect(primaryMain).toBe('#FF6B9D');
      });

      it('should have progressive color intensity', () => {
        const primary200 = computedStyle.getPropertyValue('--color-primary-200').trim();
        const primary500 = computedStyle.getPropertyValue('--color-primary-500').trim();
        const primary800 = computedStyle.getPropertyValue('--color-primary-800').trim();
        
        expect(primary200).toBe('#FBD0D9'); // Lighter
        expect(primary500).toBe('#FF6B9D'); // Main
        expect(primary800).toBe('#A8295F'); // Darker
      });
    });

    describe('Secondary Colors', () => {
      it('should define all secondary color shades', () => {
        const secondaryShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
        
        secondaryShades.forEach(shade => {
          const value = computedStyle.getPropertyValue(`--color-secondary-${shade}`);
          expect(value.trim()).toBeTruthy();
          expect(value.trim()).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });

      it('should have correct main secondary color', () => {
        const secondaryMain = computedStyle.getPropertyValue('--color-secondary-500').trim();
        expect(secondaryMain).toBe('#4ECDC4');
      });
    });

    describe('Accent Colors', () => {
      it('should define all accent color shades', () => {
        const accentShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
        
        accentShades.forEach(shade => {
          const value = computedStyle.getPropertyValue(`--color-accent-${shade}`);
          expect(value.trim()).toBeTruthy();
          expect(value.trim()).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });

      it('should have correct main accent color', () => {
        const accentMain = computedStyle.getPropertyValue('--color-accent-500').trim();
        expect(accentMain).toBe('#FFE66D');
      });
    });

    describe('Neutral Colors', () => {
      it('should define white color', () => {
        const white = computedStyle.getPropertyValue('--color-white').trim();
        expect(white).toBe('#FFFFFF');
      });

      it('should define all gray color shades', () => {
        const grayShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
        
        grayShades.forEach(shade => {
          const value = computedStyle.getPropertyValue(`--color-gray-${shade}`);
          expect(value.trim()).toBeTruthy();
          expect(value.trim()).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });
    });

    describe('Semantic Colors', () => {
      it('should define success colors', () => {
        const successColors = [50, 100, 500, 600];
        
        successColors.forEach(shade => {
          const value = computedStyle.getPropertyValue(`--color-success-${shade}`);
          expect(value.trim()).toBeTruthy();
          expect(value.trim()).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });

      it('should define warning colors', () => {
        const warningColors = [50, 100, 500, 600];
        
        warningColors.forEach(shade => {
          const value = computedStyle.getPropertyValue(`--color-warning-${shade}`);
          expect(value.trim()).toBeTruthy();
          expect(value.trim()).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });

      it('should define error colors', () => {
        const errorColors = [50, 100, 500, 600];
        
        errorColors.forEach(shade => {
          const value = computedStyle.getPropertyValue(`--color-error-${shade}`);
          expect(value.trim()).toBeTruthy();
          expect(value.trim()).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });
    });

    describe('Surface Colors', () => {
      it('should define surface color variables', () => {
        const surfaceColors = [
          '--color-background',
          '--color-surface',
          '--color-surface-light',
          '--color-surface-elevated',
          '--color-overlay'
        ];

        surfaceColors.forEach(colorVar => {
          const value = computedStyle.getPropertyValue(colorVar);
          expect(value.trim()).toBeTruthy();
        });
      });

      it('should have semi-transparent overlay', () => {
        const overlay = computedStyle.getPropertyValue('--color-overlay').trim();
        expect(overlay).toMatch(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.5\s*\)/);
      });
    });

    describe('Text Colors', () => {
      it('should define all text color variables', () => {
        const textColors = [
          '--color-text',
          '--color-text-secondary',
          '--color-text-muted',
          '--color-text-inverse',
          '--color-text-link',
          '--color-text-link-hover'
        ];

        textColors.forEach(colorVar => {
          const value = computedStyle.getPropertyValue(colorVar);
          expect(value.trim()).toBeTruthy();
        });
      });
    });

    describe('Border Colors', () => {
      it('should define all border color variables', () => {
        const borderColors = [
          '--color-border',
          '--color-border-light',
          '--color-border-muted',
          '--color-border-strong',
          '--color-border-focus'
        ];

        borderColors.forEach(colorVar => {
          const value = computedStyle.getPropertyValue(colorVar);
          expect(value.trim()).toBeTruthy();
        });
      });
    });

    describe('Gradients', () => {
      it('should define gradient variables', () => {
        const gradients = [
          '--gradient-primary',
          '--gradient-accent',
          '--gradient-surface'
        ];

        gradients.forEach(gradient => {
          const value = computedStyle.getPropertyValue(gradient);
          expect(value.trim()).toBeTruthy();
          expect(value.trim()).toContain('linear-gradient');
        });
      });
    });
  });

  describe('Typography Tokens', () => {
    describe('Font Families', () => {
      it('should define font family variables', () => {
        const fontFamilies = [
          '--font-family-primary',
          '--font-family-secondary',
          '--font-family-mono'
        ];

        fontFamilies.forEach(fontFamily => {
          const value = computedStyle.getPropertyValue(fontFamily);
          expect(value.trim()).toBeTruthy();
        });
      });

      it('should have system font stack for primary', () => {
        const primaryFont = computedStyle.getPropertyValue('--font-family-primary').trim();
        expect(primaryFont).toContain('-apple-system');
        expect(primaryFont).toContain('BlinkMacSystemFont');
        expect(primaryFont).toContain('Segoe UI');
      });

      it('should have monospace fonts for code', () => {
        const monoFont = computedStyle.getPropertyValue('--font-family-mono').trim();
        expect(monoFont).toContain('SF Mono');
        expect(monoFont).toContain('Monaco');
        expect(monoFont).toContain('monospace');
      });
    });

    describe('Font Weights', () => {
      it('should define all font weight variables', () => {
        const fontWeights = [
          '--font-weight-light',
          '--font-weight-regular',
          '--font-weight-medium',
          '--font-weight-semibold',
          '--font-weight-bold',
          '--font-weight-extrabold'
        ];

        fontWeights.forEach(weight => {
          const value = computedStyle.getPropertyValue(weight);
          expect(value.trim()).toBeTruthy();
          expect(parseInt(value.trim())).toBeGreaterThanOrEqual(300);
          expect(parseInt(value.trim())).toBeLessThanOrEqual(800);
        });
      });

      it('should have correct font weight values', () => {
        expect(computedStyle.getPropertyValue('--font-weight-regular').trim()).toBe('400');
        expect(computedStyle.getPropertyValue('--font-weight-bold').trim()).toBe('700');
      });
    });

    describe('Font Sizes', () => {
      it('should define all font size variables', () => {
        const fontSizes = [
          '--font-size-xs',
          '--font-size-sm',
          '--font-size-base',
          '--font-size-lg',
          '--font-size-xl',
          '--font-size-2xl',
          '--font-size-3xl',
          '--font-size-4xl',
          '--font-size-5xl',
          '--font-size-6xl'
        ];

        fontSizes.forEach(size => {
          const value = computedStyle.getPropertyValue(size);
          expect(value.trim()).toBeTruthy();
          expect(value.trim()).toMatch(/^[\d.]+rem$/);
        });
      });

      it('should have base font size of 1rem', () => {
        const baseSize = computedStyle.getPropertyValue('--font-size-base').trim();
        expect(baseSize).toBe('1rem');
      });

      it('should follow type scale progression', () => {
        const xs = parseFloat(computedStyle.getPropertyValue('--font-size-xs'));
        const sm = parseFloat(computedStyle.getPropertyValue('--font-size-sm'));
        const base = parseFloat(computedStyle.getPropertyValue('--font-size-base'));
        const lg = parseFloat(computedStyle.getPropertyValue('--font-size-lg'));

        expect(sm).toBeGreaterThan(xs);
        expect(base).toBeGreaterThan(sm);
        expect(lg).toBeGreaterThan(base);
      });
    });

    describe('Line Heights', () => {
      it('should define all line height variables', () => {
        const lineHeights = [
          '--line-height-tight',
          '--line-height-snug',
          '--line-height-normal',
          '--line-height-relaxed',
          '--line-height-loose'
        ];

        lineHeights.forEach(lineHeight => {
          const value = computedStyle.getPropertyValue(lineHeight);
          expect(value.trim()).toBeTruthy();
          expect(parseFloat(value.trim())).toBeGreaterThan(1);
          expect(parseFloat(value.trim())).toBeLessThan(3);
        });
      });
    });

    describe('Letter Spacing', () => {
      it('should define all letter spacing variables', () => {
        const letterSpacings = [
          '--letter-spacing-tighter',
          '--letter-spacing-tight',
          '--letter-spacing-normal',
          '--letter-spacing-wide',
          '--letter-spacing-wider',
          '--letter-spacing-widest'
        ];

        letterSpacings.forEach(spacing => {
          const value = computedStyle.getPropertyValue(spacing);
          expect(value.trim()).toBeTruthy();
        });
      });

      it('should have normal spacing as 0', () => {
        const normal = computedStyle.getPropertyValue('--letter-spacing-normal').trim();
        expect(normal).toBe('0');
      });
    });
  });

  describe('Spacing System', () => {
    it('should define all spacing variables', () => {
      const spacings = [
        '--space-0', '--space-1', '--space-2', '--space-3', '--space-4',
        '--space-5', '--space-6', '--space-8', '--space-10', '--space-12',
        '--space-16', '--space-20', '--space-24', '--space-32'
      ];

      spacings.forEach(spacing => {
        const value = computedStyle.getPropertyValue(spacing);
        expect(value.trim()).toBeTruthy();
      });
    });

    it('should follow 8pt grid system', () => {
      expect(computedStyle.getPropertyValue('--space-2').trim()).toBe('0.5rem'); // 8px
      expect(computedStyle.getPropertyValue('--space-4').trim()).toBe('1rem'); // 16px
      expect(computedStyle.getPropertyValue('--space-8').trim()).toBe('2rem'); // 32px
    });

    it('should define semantic spacing aliases', () => {
      const semanticSpacings = [
        '--space-xs', '--space-sm', '--space-md',
        '--space-lg', '--space-xl', '--space-2xl', '--space-3xl'
      ];

      semanticSpacings.forEach(spacing => {
        const value = computedStyle.getPropertyValue(spacing);
        expect(value.trim()).toBeTruthy();
      });
    });

    it('should have space-0 as 0', () => {
      const zeroSpace = computedStyle.getPropertyValue('--space-0').trim();
      expect(zeroSpace).toBe('0');
    });
  });

  describe('Border Radius', () => {
    it('should define all border radius variables', () => {
      const borderRadii = [
        '--radius-none', '--radius-sm', '--radius-base',
        '--radius-md', '--radius-lg', '--radius-xl',
        '--radius-2xl', '--radius-full'
      ];

      borderRadii.forEach(radius => {
        const value = computedStyle.getPropertyValue(radius);
        expect(value.trim()).toBeTruthy();
      });
    });

    it('should have correct radius values', () => {
      expect(computedStyle.getPropertyValue('--radius-none').trim()).toBe('0');
      expect(computedStyle.getPropertyValue('--radius-full').trim()).toBe('9999px');
    });
  });

  describe('Shadows', () => {
    it('should define all shadow variables', () => {
      const shadows = [
        '--shadow-xs', '--shadow-sm', '--shadow-base',
        '--shadow-md', '--shadow-lg', '--shadow-xl',
        '--shadow-2xl', '--shadow-inner'
      ];

      shadows.forEach(shadow => {
        const value = computedStyle.getPropertyValue(shadow);
        expect(value.trim()).toBeTruthy();
        expect(value.trim()).toMatch(/\d+px.*rgba\(/);
      });
    });

    it('should define colored shadows', () => {
      const coloredShadows = [
        '--shadow-primary',
        '--shadow-secondary',
        '--shadow-accent'
      ];

      coloredShadows.forEach(shadow => {
        const value = computedStyle.getPropertyValue(shadow);
        expect(value.trim()).toBeTruthy();
        expect(value.trim()).toMatch(/rgba\(/);
      });
    });
  });

  describe('Transitions', () => {
    it('should define transition duration variables', () => {
      const transitions = [
        '--transition-fast',
        '--transition-base',
        '--transition-slow',
        '--transition-slower'
      ];

      transitions.forEach(transition => {
        const value = computedStyle.getPropertyValue(transition);
        expect(value.trim()).toBeTruthy();
        expect(value.trim()).toMatch(/\d+ms ease/);
      });
    });

    it('should define transition property variables', () => {
      const transitionProps = [
        '--transition-all',
        '--transition-colors',
        '--transition-shadow',
        '--transition-transform'
      ];

      transitionProps.forEach(prop => {
        const value = computedStyle.getPropertyValue(prop);
        expect(value.trim()).toBeTruthy();
      });
    });
  });

  describe('Z-Index Scale', () => {
    it('should define all z-index variables', () => {
      const zIndices = [
        '--z-dropdown', '--z-sticky', '--z-fixed',
        '--z-modal-backdrop', '--z-modal', '--z-popover',
        '--z-tooltip', '--z-toast'
      ];

      zIndices.forEach(zIndex => {
        const value = computedStyle.getPropertyValue(zIndex);
        expect(value.trim()).toBeTruthy();
        expect(parseInt(value.trim())).toBeGreaterThan(999);
      });
    });

    it('should have correct z-index hierarchy', () => {
      const dropdown = parseInt(computedStyle.getPropertyValue('--z-dropdown'));
      const modal = parseInt(computedStyle.getPropertyValue('--z-modal'));
      const toast = parseInt(computedStyle.getPropertyValue('--z-toast'));

      expect(modal).toBeGreaterThan(dropdown);
      expect(toast).toBeGreaterThan(modal);
    });
  });

  describe('Breakpoints and Container Sizes', () => {
    it('should define breakpoint variables', () => {
      const breakpoints = [
        '--breakpoint-xs', '--breakpoint-sm', '--breakpoint-md',
        '--breakpoint-lg', '--breakpoint-xl', '--breakpoint-2xl'
      ];

      breakpoints.forEach(breakpoint => {
        const value = computedStyle.getPropertyValue(breakpoint);
        expect(value.trim()).toBeTruthy();
        expect(value.trim()).toMatch(/\d+px/);
      });
    });

    it('should define container variables', () => {
      const containers = [
        '--container-xs', '--container-sm', '--container-md',
        '--container-lg', '--container-xl', '--container-2xl',
        '--container-max', '--container-padding'
      ];

      containers.forEach(container => {
        const value = computedStyle.getPropertyValue(container);
        expect(value.trim()).toBeTruthy();
      });
    });
  });

  describe('Animation Properties', () => {
    it('should define easing functions', () => {
      const easings = [
        '--ease-linear', '--ease-in', '--ease-out',
        '--ease-in-out', '--ease-back'
      ];

      easings.forEach(easing => {
        const value = computedStyle.getPropertyValue(easing);
        expect(value.trim()).toBeTruthy();
        expect(value.trim()).toMatch(/cubic-bezier\(/);
      });
    });

    it('should define animation durations', () => {
      const durations = [
        '--duration-75', '--duration-100', '--duration-150',
        '--duration-200', '--duration-300', '--duration-500',
        '--duration-700', '--duration-1000'
      ];

      durations.forEach(duration => {
        const value = computedStyle.getPropertyValue(duration);
        expect(value.trim()).toBeTruthy();
        expect(value.trim()).toMatch(/\d+ms/);
      });
    });
  });

  describe('Focus Ring', () => {
    it('should define focus ring variables', () => {
      const focusVars = [
        '--focus-ring-width',
        '--focus-ring-offset',
        '--focus-ring-color',
        '--focus-ring',
        '--focus-ring-offset-shadow',
        '--focus-ring-shadow'
      ];

      focusVars.forEach(focusVar => {
        const value = computedStyle.getPropertyValue(focusVar);
        expect(value.trim()).toBeTruthy();
      });
    });
  });
});

describe('Theme Variants', () => {
  let testElement;

  beforeEach(() => {
    testElement = document.createElement('div');
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    document.body.removeChild(testElement);
  });

  describe('Dark Theme', () => {
    it('should apply dark theme when data-theme="dark" is set', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      
      const computedStyle = getComputedStyle(testElement);
      const background = computedStyle.getPropertyValue('--color-background').trim();
      
      // Should use gray-900 for dark background
      expect(background).toMatch(/#111827|var\(--color-gray-900\)/);
      
      document.documentElement.removeAttribute('data-theme');
    });

    it('should have lighter primary colors in dark theme', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      
      const computedStyle = getComputedStyle(testElement);
      const primaryColor = computedStyle.getPropertyValue('--color-primary-500').trim();
      
      expect(primaryColor).toBe('#FF8FB3');
      
      document.documentElement.removeAttribute('data-theme');
    });
  });

  describe('High Contrast Theme', () => {
    it('should apply high contrast theme when data-theme="high-contrast" is set', () => {
      document.documentElement.setAttribute('data-theme', 'high-contrast');
      
      const computedStyle = getComputedStyle(testElement);
      const primaryColor = computedStyle.getPropertyValue('--color-primary-500').trim();
      const textColor = computedStyle.getPropertyValue('--color-text').trim();
      
      expect(primaryColor).toBe('#FF0066');
      expect(textColor).toBe('#000000');
      
      document.documentElement.removeAttribute('data-theme');
    });
  });
});