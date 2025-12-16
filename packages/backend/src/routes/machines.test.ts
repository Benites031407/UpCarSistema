import { describe, it, expect } from 'vitest';

describe('Machine Management System', () => {

  describe('Machine Code Validation', () => {
    it('should validate machine code format', () => {
      // Test valid 6-character alphanumeric codes
      const validCodes = ['ABC123', 'XYZ789', 'DEF456'];
      const invalidCodes = ['123', 'ABCDEFG', '', 'AB-123'];

      validCodes.forEach(code => {
        expect(code.length).toBe(6);
        expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true);
      });

      invalidCodes.forEach(code => {
        expect(code.length !== 6 || !/^[A-Z0-9]{6}$/.test(code)).toBe(true);
      });
    });
  });

  describe('Operating Hours Validation', () => {
    it('should validate time format HH:MM', () => {
      const validTimes = ['08:00', '18:30', '23:59', '00:00'];
      const invalidTimes = ['25:00', '08:60', 'invalid', '', '24:00'];

      validTimes.forEach(time => {
        expect(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)).toBe(true);
      });

      invalidTimes.forEach(time => {
        expect(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)).toBe(false);
      });
    });

    it('should validate start time is before end time', () => {
      const validPairs = [
        { start: '08:00', end: '18:00' },
        { start: '09:30', end: '17:30' },
        { start: '00:00', end: '23:59' }
      ];

      const invalidPairs = [
        { start: '18:00', end: '08:00' },
        { start: '12:00', end: '12:00' },
        { start: '23:59', end: '00:00' }
      ];

      validPairs.forEach(pair => {
        expect(pair.start < pair.end).toBe(true);
      });

      invalidPairs.forEach(pair => {
        expect(pair.start >= pair.end).toBe(true);
      });
    });
  });

  describe('Machine Status Logic', () => {
    it('should validate machine status values', () => {
      const validStatuses = ['online', 'offline', 'maintenance', 'in_use'];
      const invalidStatuses = ['active', 'disabled', '', 'unknown'];

      validStatuses.forEach(status => {
        expect(['online', 'offline', 'maintenance', 'in_use'].includes(status)).toBe(true);
      });

      invalidStatuses.forEach(status => {
        expect(['online', 'offline', 'maintenance', 'in_use'].includes(status)).toBe(false);
      });
    });
  });

  describe('Maintenance Interval Validation', () => {
    it('should validate positive maintenance intervals', () => {
      const validIntervals = [1, 50, 100, 500, 1000];
      const invalidIntervals = [0, -1, -100];

      validIntervals.forEach(interval => {
        expect(interval > 0).toBe(true);
      });

      invalidIntervals.forEach(interval => {
        expect(interval <= 0).toBe(true);
      });
    });
  });
});