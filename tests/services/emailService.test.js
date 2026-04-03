const EmailService = require('../../src/services/emailService');
const nodemailer = require('nodemailer');
const emailConfig = require('../../src/config/email');
const { EmailError } = require('../../src/utils/errorTypes');
const { EMAIL_TYPES } = require('../../src/templates/email');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('../../src/config/email');
jest.mock('../../src/utils/logger', () => ({