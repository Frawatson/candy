import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'

// Mock the main.js functionality since we don't have the actual file
class NavigationManager {
  constructor() {
    this.isMenuOpen = false
    this.init()
  }

  init() {
    this.bindEvents()
  }

  bindEvents() {
    const navToggle = document.getElementById('nav-toggle')
    const navMenu = document.getElementById('nav-menu')
    
    if (navToggle) {
      navToggle.addEventListener('click', () => this.toggleMobileMenu())
    }
  }

  toggleMobileMenu() {
    this.isMenuOpen = !this.isMenuOpen
    const navMenu = document.getElementById('nav-menu')
    const navToggle = document.getElementById('nav-toggle')
    
    if (navMenu) {
      navMenu.classList.toggle('nav__menu--active', this.isMenuOpen)
    }
    
    if (navToggle) {
      navToggle.classList.toggle('nav__toggle--active', this.isMenuOpen)
      navToggle.setAttribute('aria-expanded', this.isMenuOpen.toString())
    }
  }

  closeMobileMenu() {
    this.isMenuOpen = false
    const navMenu = document.getElementById('nav-menu')
    const navToggle = document.getElementById('nav-toggle')
    
    if (navMenu) {
      navMenu.classList.remove('nav__menu--active')
    }
    
    if (navToggle) {
      navToggle.classList.remove('nav__toggle--active')
      navToggle.setAttribute('aria-expanded', 'false')
    }
  }
}

class NewsletterManager {
  constructor() {
    this.init()
  }

  init() {
    const form = document.getElementById('newsletter-form')
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e))
    }
  }

  async handleSubmit(event) {
    event.preventDefault()
    const form = event.target
    const email = form.querySelector('input[type="email"]').value
    const button = form.querySelector('button[type="submit"]')
    
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email address')
    }

    button.disabled = true
    button.textContent = 'Subscribing...'

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Subscription failed')
      }

      this.showSuccessMessage()
      form.reset()
    } catch (error) {
      this.showErrorMessage(error.message)
    } finally {
      button.disabled = false
      button.textContent = 'Subscribe'
    }
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  showSuccessMessage() {
    const message = document.createElement('div')
    message.className = 'newsletter__message newsletter__message--success'
    message.textContent = 'Thank you for subscribing!'
    
    const form = document.getElementById('newsletter-form')
    form.parentNode.insertBefore(message, form)
    
    setTimeout(() => message.remove(), 5000)
  }

  showErrorMessage(error) {
    const message = document.createElement('div')
    message.className = 'newsletter__message newsletter__message--error'
    message.textContent = error
    
    const form = document.getElementById('newsletter-form')
    form.parentNode.insertBefore(message, form)
    
    setTimeout(() => message.remove(), 5000)
  }
}

describe('NavigationManager', () => {
  let dom
  let navigationManager

  beforeEach(() => {
    const htmlContent = `
      <nav class="nav">
        <ul class="nav__menu" id="nav-menu">
          <li><a href="/">Home</a></li>
          <li><a href="/products">Products</a></li>
        </ul>
        <button class="nav__toggle" id="nav-toggle">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
    `
    
    dom = new JSDOM(htmlContent)
    global.document = dom.window.document
    global.window = dom.window
    
    navigationManager = new NavigationManager()
  })

  describe('Mobile Menu Toggle', () => {
    it('should initialize with menu closed', () => {
      expect(navigationManager.isMenuOpen).toBe(false)
    })

    it('should toggle mobile menu when nav toggle is clicked', () => {
      const navToggle = document.getElementById('nav-toggle')
      const navMenu = document.getElementById('nav-menu')
      
      // Simulate click
      navToggle.click()
      
      expect(navigationManager.isMenuOpen).toBe(true)
      expect(navMenu.classList.contains('nav__menu--active')).toBe(true)
      expect(navToggle.classList.contains('nav__toggle--active')).toBe(true)
      expect(navToggle.getAttribute('aria-expanded')).toBe('true')
    })

    it('should close mobile menu when clicked twice', () => {
      const navToggle = document.getElementById('nav-toggle')
      const navMenu = document.getElementById('nav-menu')
      
      // Open menu
      navToggle.click()
      expect(navigationManager.isMenuOpen).toBe(true)
      
      // Close menu
      navToggle.click()
      expect(navigationManager.isMenuOpen).toBe(false)
      expect(navMenu.classList.contains('nav__menu--active')).toBe(false)
      expect(navToggle.classList.contains('nav__toggle--active')).toBe(false)
      expect(navToggle.getAttribute('aria-expanded')).toBe('false')
    })

    it('should close mobile menu programmatically', () => {
      const navToggle = document.getElementById('nav-toggle')
      const navMenu = document.getElementById('nav-menu')
      
      // Open menu first
      navigationManager.toggleMobileMenu()
      expect(navigationManager.isMenuOpen).toBe(true)
      
      // Close menu programmatically
      navigationManager.closeMobileMenu()
      
      expect(navigationManager.isMenuOpen).toBe(false)
      expect(navMenu.classList.contains('nav__menu--active')).toBe(false)
      expect(navToggle.getAttribute('aria-expanded')).toBe('false')
    })

    it('should handle missing navigation elements gracefully', () => {
      document.getElementById('nav-toggle').remove()
      document.getElementById('nav-menu').remove()
      
      expect(() => navigationManager.toggleMobileMenu()).not.toThrow()
      expect(() => navigationManager.closeMobileMenu()).not.toThrow()
    })
  })
})

describe('NewsletterManager', () => {
  let dom
  let newsletterManager

  beforeEach(() => {
    const htmlContent = `
      <form id="newsletter-form">
        <input type="email" placeholder="Enter your email" required>
        <button type="submit">Subscribe</button>
      </form>
    `
    
    dom = new JSDOM(htmlContent)
    global.document = dom.window.document
    global.window = dom.window
    
    global.fetch = vi.fn()
    newsletterManager = new NewsletterManager()
  })

  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      expect(newsletterManager.validateEmail('test@example.com')).toBe(true)
      expect(newsletterManager.validateEmail('user.name@domain.co.uk')).toBe(true)
      expect(newsletterManager.validateEmail('user+tag@example.org')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(newsletterManager.validateEmail('invalid-email')).toBe(false)
      expect(newsletterManager.validateEmail('test@')).toBe(false)
      expect(newsletterManager.validateEmail('@example.com')).toBe(false)
      expect(newsletterManager.validateEmail('test.example.com')).toBe(false)
      expect(newsletterManager.validateEmail('')).toBe(false)
    })
  })

  describe('Form Submission', () => {
    it('should handle successful subscription', async () => {
      const form = document.getElementById('newsletter-form')
      const emailInput = form.querySelector('input[type="email"]')
      const submitButton = form.querySelector('button[type="submit"]')
      
      emailInput.value = 'test@example.com'
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      const event = new dom.window.Event('submit')
      await newsletterManager.handleSubmit(event)
      
      expect(global.fetch).toHaveBeenCalledWith('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      })
      
      expect(emailInput.value).toBe('')
    })

    it('should handle subscription failure', async () => {
      const form = document.getElementById('newsletter-form')
      const emailInput = form.querySelector('input[type="email"]')
      
      emailInput.value = 'test@example.com'
      
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      })

      const event = new dom.window.Event('submit')
      
      await newsletterManager.handleSubmit(event)
      
      // Check if error message is displayed
      const errorMessage = document.querySelector('.newsletter__message--error')
      expect(errorMessage).toBeTruthy()
      expect(errorMessage.textContent).toBe('Subscription failed')
    })

    it('should handle network errors', async () => {
      const form = document.getElementById('newsletter-form')
      const emailInput = form.querySelector('input[type="email"]')
      
      emailInput.value = 'test@example.com'
      
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      const event = new dom.window.Event('submit')
      
      await newsletterManager.handleSubmit(event)
      
      const errorMessage = document.querySelector('.newsletter__message--error')
      expect(errorMessage).toBeTruthy()
      expect(errorMessage.textContent).toBe('Network error')
    })

    it('should prevent submission with invalid email', async () => {
      const form = document.getElementById('newsletter-form')
      const emailInput = form.querySelector('input[type="email"]')
      
      emailInput.value = 'invalid-email'
      
      const event = new dom.window.Event('submit')
      
      await expect(newsletterManager.handleSubmit(event)).rejects.toThrow('Invalid email address')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should disable submit button during submission', async () => {
      const form = document.getElementById('newsletter-form')
      const emailInput = form.querySelector('input[type="email"]')
      const submitButton = form.querySelector('button[type="submit"]')
      
      emailInput.value = 'test@example.com'
      
      // Mock a slow response
      let resolvePromise
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      
      global.fetch.mockReturnValueOnce(slowPromise)

      const event = new dom.window.Event('submit')
      const submissionPromise = newsletterManager.handleSubmit(event)
      
      expect(submitButton.disabled).toBe(true)
      expect(submitButton.textContent).toBe('Subscribing...')
      
      // Resolve the promise
      resolvePromise({
        ok: true,
        json: async () => ({ success: true })
      })
      
      await submissionPromise
      
      expect(submitButton.disabled).toBe(false)
      expect(submitButton.textContent).toBe('Subscribe')
    })
  })

  describe('Message Display', () => {
    it('should show success message', () => {
      newsletterManager.showSuccessMessage()
      
      const successMessage = document.querySelector('.newsletter__message--success')
      expect(successMessage).toBeTruthy()
      expect(successMessage.textContent).toBe('Thank you for subscribing!')
    })

    it('should show error message', () => {
      const errorText = 'Something went wrong'
      newsletterManager.showErrorMessage(errorText)
      
      const errorMessage = document.querySelector('.newsletter__message--error')
      expect(errorMessage).toBeTruthy()
      expect(errorMessage.textContent).toBe(errorText)
    })

    it('should remove messages after timeout', (done) => {
      vi.useFakeTimers()
      
      newsletterManager.showSuccessMessage()
      
      const successMessage = document.querySelector('.newsletter__message--success')
      expect(successMessage).toBeTruthy()
      
      vi.advanceTimersByTime(5000)
      
      setTimeout(() => {
        expect(document.querySelector('.newsletter__message--success')).toBeFalsy()
        vi.useRealTimers()
        done()
      }, 0)
    })
  })
})