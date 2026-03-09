import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'

// Mock Cart functionality
class CartManager {
  constructor() {
    this.items = []
    this.init()
  }

  init() {
    this.loadCartFromStorage()
    this.updateCartCount()
    this.bindEvents()
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-to-cart')) {
        e.preventDefault()
        const productId = e.target.dataset.productId
        const productData = this.getProductData(e.target)
        this.addToCart(productId, productData)
      }
      
      if (e.target.classList.contains('remove-from-cart')) {
        e.preventDefault()
        const productId = e.target.dataset.productId
        this.removeFromCart(productId)
      }
      
      if (e.target.classList.contains('update-quantity')) {
        e.preventDefault()
        const productId = e.target.dataset.productId
        const quantity = parseInt(e.target.dataset.quantity)
        this.updateQuantity(productId, quantity)
      }
    })
  }

  getProductData(button) {
    const productCard = button.closest('.product-card')
    return {
      name: productCard?.querySelector('.product__name')?.textContent || '',
      price: parseFloat(productCard?.querySelector('.product__price')?.dataset.price) || 0,
      image: productCard?.querySelector('.product__image img')?.src || '',
    }
  }

  addToCart(productId, productData = {}) {
    if (!productId) {
      throw new Error('Product ID is required')
    }

    const existingItem = this.items.find(item => item.id === productId)
    
    if (existingItem) {
      existingItem.quantity += 1
    } else {
      this.items.push({
        id: productId,
        name: productData.name,
        price: productData.price,
        image: productData.image,
        quantity: 1,
      })
    }
    
    this.saveCartToStorage()
    this.updateCartCount()
    this.showNotification(`${productData.name || 'Product'} added to cart!`)
  }

  removeFromCart(productId) {
    const initialLength = this.items.length
    this.items = this.items.filter(item => item.id !== productId)
    
    if (this.items.length < initialLength) {
      this.saveCartToStorage()
      this.updateCartCount()
      this.showNotification('Product removed from cart')
    }
  }

  updateQuantity(productId, quantity) {
    if (quantity < 0) {
      throw new Error('Quantity cannot be negative')
    }

    const item = this.items.find(item => item.id === productId)
    
    if (item) {
      if (quantity === 0) {
        this.removeFromCart(productId)
      } else {
        item.quantity = quantity
        this.saveCartToStorage()
        this.updateCartCount()
      }
    }
  }

  updateCartCount() {
    const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0)
    const cartCountElements = document.querySelectorAll('#cart-count')
    
    cartCountElements.forEach(element => {
      element.textContent = totalItems.toString()
    })
  }

  getTotalPrice() {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  clearCart() {
    this.items = []
    this.saveCartToStorage()
    this.updateCartCount()
  }

  saveCartToStorage() {
    try {
      localStorage.setItem('cart', JSON.stringify(this.items))
    } catch (error) {
      console.error('Failed to save cart to storage:', error)
    }
  }

  loadCartFromStorage() {
    try {
      const cartData = localStorage.getItem('cart')
      if (cartData) {
        this.items = JSON.parse(cartData)
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error)
      this.items = []
    }
  }

  showNotification(message) {
    const notification = document.createElement('div')
    notification.className = 'cart-notification'
    notification.textContent = message
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.classList.add('cart-notification--show')
    }, 100)
    
    setTimeout(() => {
      notification.classList.remove('cart-notification--show')
      setTimeout(() => notification.remove(), 300)
    }, 3000)
  }
}

describe('CartManager', () => {
  let dom
  let cartManager

  beforeEach(() => {
    const htmlContent = `
      <div class="nav__actions">
        <a href="cart.html" class="cart-btn">
          Cart (<span id="cart-count">0</span>)
        </a>
      </div>
      <div class="product-card">
        <img class="product__image" src="candy.jpg" alt="Candy">
        <h3 class="product__name">Chocolate Bar</h3>
        <span class="product__price" data-price="4.99">$4.99</span>
        <button class="add-to-cart" data-product-id="1">Add to Cart</button>
      </div>
    `
    
    dom = new JSDOM(htmlContent)
    global.document = dom.window.document
    global.window = dom.window
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    global.localStorage = localStorageMock
    
    cartManager = new CartManager()
  })

  describe('Initialization', () => {
    it('should initialize with empty cart', () => {
      expect(cartManager.items).toEqual([])
      expect(cartManager.getItemCount()).toBe(0)
      expect(cartManager.getTotalPrice()).toBe(0)
    })

    it('should load cart from localStorage on init', () => {
      const mockCartData = [
        { id: '1', name: 'Test Product', price: 10, quantity: 2 }
      ]
      
      localStorage.getItem.mockReturnValue(JSON.stringify(mockCartData))
      
      const newCartManager = new CartManager()
      expect(newCartManager.items).toEqual(mockCartData)
    })

    it('should handle invalid localStorage data gracefully', () => {
      localStorage.getItem.mockReturnValue('invalid-json')
      
      const newCartManager = new CartManager()
      expect(newCartManager.items).toEqual([])
    })
  })

  describe('Adding Items to Cart', () => {
    it('should add new item to cart', () => {
      const productData = {
        name: 'Chocolate Bar',
        price: 4.99,
        image: 'candy.jpg'
      }
      
      cartManager.addToCart('1', productData)
      
      expect(cartManager.items).toHaveLength(1)
      expect(cartManager.items[0]).toEqual({
        id: '1',
        name: 'Chocolate Bar',
        price: 4.99,
        image: 'candy.jpg',
        quantity: 1
      })
    })

    it('should increase quantity for existing item', () => {
      const productData = {
        name: 'Chocolate Bar',
        price: 4.99,
        image: 'candy.jpg'
      }
      
      cartManager.addToCart('1', productData)
      cartManager.addToCart('1', productData)
      
      expect(cartManager.items).toHaveLength(1)
      expect(cartManager.items[0].quantity).toBe(2)
    })

    it('should throw error for missing product ID', () => {
      expect(() => cartManager.addToCart('')).toThrow('Product ID is required')
      expect(() => cartManager.addToCart(null)).toThrow('Product ID is required')
    })

    it('should add item via click event', () => {
      const addButton = document.querySelector('.add-to-cart')
      addButton.click()
      
      expect(cartManager.items).toHaveLength(1)
      expect(cartManager.items[0].id).toBe('1')
      expect(cartManager.items[0].name).toBe('Chocolate Bar')
    })

    it('should save to localStorage when adding item', () => {
      const productData = { name: 'Test', price: 5.99 }
      
      cartManager.addToCart('1', productData)
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cart',
        JSON.stringify(cartManager.items)
      )
    })
  })

  describe('Removing Items from Cart', () => {
    beforeEach(() => {
      // Add test items
      cartManager.addToCart('1', { name: 'Product 1', price: 5.99 })
      cartManager.addToCart('2', { name: 'Product 2', price: 7.99 })
    })

    it('should remove item from cart', () => {
      cartManager.removeFromCart('1')
      
      expect(cartManager.items).toHaveLength(1)
      expect(cartManager.items[0].id).toBe('2')
    })

    it('should handle removing non-existent item gracefully', () => {
      const initialLength = cartManager.items.length
      cartManager.removeFromCart('999')
      
      expect(cartManager.items).toHaveLength(initialLength)
    })
  })

  describe('Updating Quantities', () => {
    beforeEach(() => {
      cartManager.addToCart('1', { name: 'Product 1', price: 5.99 })
    })

    it('should update item quantity', () => {
      cartManager.updateQuantity('1', 3)
      
      expect(cartManager.items[0].quantity).toBe(3)
    })

    it('should remove item when quantity is set to 0', () => {
      cartManager.updateQuantity('1', 0)
      
      expect(cartManager.items).toHaveLength(0)
    })

    it('should throw error for negative quantity', () => {
      expect(() => cartManager.updateQuantity('1', -1)).toThrow('Quantity cannot be negative')
    })

    it('should handle updating non-existent item', () => {
      cartManager.updateQuantity('999', 5)
      
      // Should not throw error or add new item
      expect(cartManager.items).toHaveLength(1)
      expect(cartManager.items[0].id).toBe('1')
    })
  })

  describe('Cart Calculations', () => {
    beforeEach(() => {
      cartManager.addToCart('1', { name: 'Product 1', price: 5.99 })
      cartManager.addToCart('2', { name: 'Product 2', price: 7.99 })
      cartManager.updateQuantity('1', 2)
    })

    it('should calculate total price correctly', () => {
      // 2 * 5.99 + 1 * 7.99 = 19.97
      expect(cartManager.getTotalPrice()).toBe(19.97)
    })

    it('should calculate total item count correctly', () => {
      expect(cartManager.getItemCount()).toBe(3) // 2 + 1
    })

    it('should update cart count in DOM', () => {
      const cartCountElement = document.getElementById('cart-count')
      expect(cartCountElement.textContent).toBe('3')
    })
  })

  describe('Cart Persistence', () => {
    it('should save cart to localStorage', () => {
      cartManager.addToCart('1', { name: 'Test', price: 5.99 })
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cart',
        JSON.stringify(cartManager.items)
      )
    })

    it('should handle localStorage save errors gracefully', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      // Should not throw error
      expect(() => cartManager.addToCart('1', { name: 'Test', price: 5.99 })).not.toThrow()
    })
  })

  describe('Cart Clearing', () => {
    beforeEach(() => {
      cartManager.addToCart('1', { name: 'Product 1', price: 5.99 })
      cartManager.addToCart('2', { name: 'Product 2', price: 7.99 })
    })

    it('should clear all items from cart', () => {
      cartManager.clearCart()
      
      expect(cartManager.items).toHaveLength(0)
      expect(cartManager.getItemCount()).toBe(0)
      expect(cartManager.getTotalPrice()).toBe(0)
    })

    it('should update DOM and localStorage when clearing', () => {
      cartManager.clearCart()
      
      const cartCountElement = document.getElementById('cart-count')
      expect(cartCountElement.textContent).toBe('0')
      expect(localStorage.setItem).toHaveBeenCalledWith('cart', '[]')
    })
  })

  describe('Notifications', () => {
    it('should show notification when adding item', () => {
      cartManager.showNotification('Test message')
      
      const notification = document.querySelector('.cart-notification')
      expect(notification).toBeTruthy()
      expect(notification.textContent).toBe('Test message')
    })

    it('should remove notification after timeout', (done) => {
      vi.useFakeTimers()
      
      cartManager.showNotification('Test message')
      
      expect(document.querySelector('.cart-notification')).toBeTruthy()
      
      vi.advanceTimersByTime(3500)
      
      setTimeout(() => {
        expect(document.querySelector('.cart-notification')).toBeFalsy()
        vi.useRealTimers()
        done()
      }, 0)
    })
  })
})