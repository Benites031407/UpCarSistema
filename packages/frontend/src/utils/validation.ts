/**
 * Frontend validation utilities for user input
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: any;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const sanitized = email.trim().toLowerCase();
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  if (sanitized.length > 255) {
    return { isValid: false, error: 'Email must be less than 255 characters' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one letter' };
  }

  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }

  return { isValid: true, sanitized: password };
}

/**
 * Validates user name
 */
export function validateName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }

  const sanitized = name.trim();
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Name is required' };
  }

  if (sanitized.length > 100) {
    return { isValid: false, error: 'Name must be less than 100 characters' };
  }

  if (!/^[a-zA-Z\s\-'\.]+$/.test(sanitized)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods' };
  }

  return { isValid: true, sanitized };
}

/**
 * Enhanced machine code validation with detailed error messages
 */
export function validateMachineCode(code: string): ValidationResult {
  if (!code || typeof code !== 'string') {
    return { 
      isValid: false, 
      error: 'Machine code is required. Please scan the QR code or enter the 6-character code.' 
    };
  }

  const sanitized = code.trim().toUpperCase();
  
  if (sanitized.length === 0) {
    return { 
      isValid: false, 
      error: 'Machine code cannot be empty. Please scan the QR code or enter the 6-character code.' 
    };
  }

  if (sanitized.length < 6) {
    return { 
      isValid: false, 
      error: `Machine code is too short. Please enter all 6 characters (you entered ${sanitized.length}).` 
    };
  }

  if (sanitized.length > 6) {
    return { 
      isValid: false, 
      error: `Machine code is too long. Please enter exactly 6 characters (you entered ${sanitized.length}).` 
    };
  }

  // Check for invalid characters
  const invalidChars = sanitized.match(/[^A-Z0-9]/g);
  if (invalidChars) {
    return { 
      isValid: false, 
      error: `Machine code contains invalid characters: ${invalidChars.join(', ')}. Only letters and numbers are allowed.` 
    };
  }

  // Additional validation for common mistakes
  if (sanitized.includes('O') || sanitized.includes('I')) {
    return { 
      isValid: false, 
      error: 'Machine codes do not contain the letters O or I to avoid confusion with 0 and 1.' 
    };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates duration selection (1-30 minutes)
 */
export function validateDuration(duration: number | string): ValidationResult {
  const num = typeof duration === 'string' ? parseInt(duration, 10) : duration;
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Duration must be a valid number' };
  }

  if (num < 1) {
    return { isValid: false, error: 'Duration must be at least 1 minute' };
  }

  if (num > 30) {
    return { isValid: false, error: 'Duration cannot exceed 30 minutes' };
  }

  return { isValid: true, sanitized: num };
}

/**
 * Validates Brazilian Real amount
 */
export function validateBRLAmount(amount: number | string): ValidationResult {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }

  if (num <= 0) {
    return { isValid: false, error: 'Amount must be positive' };
  }

  if (num > 10000) {
    return { isValid: false, error: 'Amount cannot exceed R$ 10,000' };
  }

  // Check for more than 2 decimal places
  if (Math.round(num * 100) !== num * 100) {
    return { isValid: false, error: 'Amount must have at most 2 decimal places' };
  }

  return { isValid: true, sanitized: Math.round(num * 100) / 100 };
}

/**
 * Validates phone number (Brazilian format)
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters
  const sanitized = phone.replace(/\D/g, '');
  
  if (sanitized.length < 10 || sanitized.length > 11) {
    return { isValid: false, error: 'Phone number must have 10 or 11 digits' };
  }

  // Brazilian phone number validation
  if (sanitized.length === 11 && !['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'].includes(sanitized.substring(0, 2))) {
    return { isValid: false, error: 'Invalid area code' };
  }

  return { isValid: true, sanitized };
}

/**
 * Sanitizes string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .substring(0, 1000); // Limit length
}

/**
 * Validates form data with multiple fields
 */
export function validateForm(data: Record<string, any>, rules: Record<string, (value: any) => ValidationResult>): {
  isValid: boolean;
  errors: Record<string, string>;
  sanitized: Record<string, any>;
} {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, any> = {};
  let isValid = true;

  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(data[field]);
    
    if (!result.isValid) {
      errors[field] = result.error!;
      isValid = false;
    } else if (result.sanitized !== undefined) {
      sanitized[field] = result.sanitized;
    } else {
      sanitized[field] = data[field];
    }
  }

  return { isValid, errors, sanitized };
}

/**
 * Real-time validation hook for React components
 */
export function useFieldValidation(validator: (value: any) => ValidationResult) {
  return (value: any) => {
    const result = validator(value);
    return {
      isValid: result.isValid,
      error: result.error,
      value: result.sanitized !== undefined ? result.sanitized : value
    };
  };
}

/**
 * Debounced validation for real-time feedback
 */
export function createDebouncedValidator(
  validator: (value: any) => ValidationResult,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;
  
  return (value: any, callback: (result: ValidationResult) => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validator(value);
      callback(result);
    }, delay);
  };
}

/**
 * Common validation rules for forms
 */
export const validationRules = {
  email: validateEmail,
  password: validatePassword,
  name: validateName,
  machineCode: validateMachineCode,
  duration: validateDuration,
  amount: validateBRLAmount,
  phone: validatePhoneNumber,
  
  required: (value: any): ValidationResult => {
    if (value === null || value === undefined || value === '') {
      return { isValid: false, error: 'This field is required' };
    }
    return { isValid: true, sanitized: value };
  },
  
  minLength: (min: number) => (value: string): ValidationResult => {
    if (!value || value.length < min) {
      return { isValid: false, error: `Must be at least ${min} characters long` };
    }
    return { isValid: true, sanitized: value };
  },
  
  maxLength: (max: number) => (value: string): ValidationResult => {
    if (value && value.length > max) {
      return { isValid: false, error: `Must be less than ${max} characters` };
    }
    return { isValid: true, sanitized: value };
  }
};

/**
 * Error message formatter for user-friendly display
 */
export function formatValidationError(error: string): string {
  // Capitalize first letter and ensure proper punctuation
  const formatted = error.charAt(0).toUpperCase() + error.slice(1);
  return formatted.endsWith('.') ? formatted : formatted + '.';
}

/**
 * Validation state manager for complex forms
 */
export class FormValidator {
  private fields: Record<string, ValidationResult> = {};
  private rules: Record<string, (value: any) => ValidationResult> = {};

  constructor(rules: Record<string, (value: any) => ValidationResult>) {
    this.rules = rules;
  }

  validateField(name: string, value: any): ValidationResult {
    const validator = this.rules[name];
    if (!validator) {
      return { isValid: true, sanitized: value };
    }

    const result = validator(value);
    this.fields[name] = result;
    return result;
  }

  validateAll(data: Record<string, any>): {
    isValid: boolean;
    errors: Record<string, string>;
    sanitized: Record<string, any>;
  } {
    const errors: Record<string, string> = {};
    const sanitized: Record<string, any> = {};
    let isValid = true;

    for (const [name] of Object.entries(this.rules)) {
      const result = this.validateField(name, data[name]);
      
      if (!result.isValid) {
        errors[name] = result.error!;
        isValid = false;
      } else {
        sanitized[name] = result.sanitized !== undefined ? result.sanitized : data[name];
      }
    }

    return { isValid, errors, sanitized };
  }

  isFormValid(): boolean {
    return Object.values(this.fields).every(field => field.isValid);
  }

  getErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const [name, field] of Object.entries(this.fields)) {
      if (!field.isValid && field.error) {
        errors[name] = field.error;
      }
    }
    return errors;
  }

  reset(): void {
    this.fields = {};
  }
}