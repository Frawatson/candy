/**
 * Test setup configuration for DOM testing
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Setup JSDOM environment
const dom = new JSDOM();
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

// Load CSS for style testing
const cssPath = path.join(__dirname, '../styles/main.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// Helper to create a style element with CSS
global.loadCSS = () => {
  const style = document.createElement('style');
  style.textContent = cssContent;
  document.head.appendChild(style);
  return style;
};

// Helper to load HTML
global.loadHTML = () => {
  const htmlPath = path.join(__dirname, '../index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  document.documentElement.innerHTML = htmlContent;
};

// Mock console methods for cleaner test output
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};