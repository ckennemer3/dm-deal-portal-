import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  parseCurrencyInput,
  calculateLTV,
  getLTVColor,
  formatDuration,
  getTimerUrgency,
  generateDealNumber,
  getVehicleConditionOptions,
  isVehicleConditionAutoSelected,
  showMSRPFields,
  showJDPowerFields,
  showNetCapCost,
  showTotalAmountFinanced,
  isRequiredFieldEmpty,
  isValidEmail,
  getInitials,
  getFullName,
  truncate,
} from '../utils';

// === formatCurrency ===

describe('formatCurrency', () => {
  it('returns em dash for null', () => {
    expect(formatCurrency(null)).toBe('\u2014');
  });

  it('returns em dash for undefined', () => {
    expect(formatCurrency(undefined)).toBe('\u2014');
  });

  it('returns $0 for 0', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats 55000 as $55,000', () => {
    expect(formatCurrency(55000)).toBe('$55,000');
  });

  it('formats 1234567 as $1,234,567', () => {
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('formats negative numbers with minus sign', () => {
    expect(formatCurrency(-5000)).toBe('-$5,000');
  });

  it('formats small numbers', () => {
    expect(formatCurrency(99)).toBe('$99');
  });
});

// === parseCurrencyInput ===

describe('parseCurrencyInput', () => {
  it('parses $1,234.56 to 1234.56', () => {
    expect(parseCurrencyInput('$1,234.56')).toBe(1234.56);
  });

  it('parses plain number string', () => {
    expect(parseCurrencyInput('5000')).toBe(5000);
  });

  it('returns null for empty string', () => {
    expect(parseCurrencyInput('')).toBe(null);
  });

  it('returns null for non-numeric string', () => {
    expect(parseCurrencyInput('abc')).toBe(null);
  });

  it('parses string with commas', () => {
    expect(parseCurrencyInput('1,000,000')).toBe(1000000);
  });

  it('handles string with only dollar sign', () => {
    expect(parseCurrencyInput('$')).toBe(null);
  });

  it('parses decimal without leading zero', () => {
    expect(parseCurrencyInput('.99')).toBe(0.99);
  });
});

// === calculateLTV ===

describe('calculateLTV', () => {
  it('calculates 55000/65000 correctly (~84.6%)', () => {
    const result = calculateLTV(55000, 65000);
    expect(result).toBeCloseTo(84.6, 0);
  });

  it('returns null when numerator is null', () => {
    expect(calculateLTV(null, 65000)).toBe(null);
  });

  it('returns null when denominator is null', () => {
    expect(calculateLTV(55000, null)).toBe(null);
  });

  it('returns null when both are null', () => {
    expect(calculateLTV(null, null)).toBe(null);
  });

  it('returns null when denominator is 0', () => {
    expect(calculateLTV(55000, 0)).toBe(null);
  });

  it('calculates 100% when numerator equals denominator', () => {
    expect(calculateLTV(50000, 50000)).toBe(100);
  });

  it('calculates over 100% when numerator exceeds denominator', () => {
    const result = calculateLTV(70000, 60000);
    expect(result).toBeCloseTo(116.7, 0);
  });
});

// === getLTVColor ===

describe('getLTVColor', () => {
  it('returns green for LTV <= 100', () => {
    expect(getLTVColor(85)).toBe('text-status-success');
    expect(getLTVColor(100)).toBe('text-status-success');
  });

  it('returns yellow for LTV between 101 and 115', () => {
    expect(getLTVColor(101)).toBe('text-status-warning');
    expect(getLTVColor(115)).toBe('text-status-warning');
  });

  it('returns red for LTV > 115', () => {
    expect(getLTVColor(116)).toBe('text-status-danger');
    expect(getLTVColor(150)).toBe('text-status-danger');
  });

  it('returns gray for null', () => {
    expect(getLTVColor(null)).toBe('text-surface-500');
  });

  it('returns green for 0', () => {
    expect(getLTVColor(0)).toBe('text-status-success');
  });
});

// === formatDuration ===

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(5 * 60 * 1000)).toBe('5m');
  });

  it('formats 0 milliseconds as 0m', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('formats hours and minutes', () => {
    const ms = (2 * 3600 + 30 * 60) * 1000;
    expect(formatDuration(ms)).toBe('2h 30m');
  });

  it('formats days and hours', () => {
    const ms = (3 * 86400 + 5 * 3600) * 1000;
    expect(formatDuration(ms)).toBe('3d 5h');
  });

  it('formats exactly 1 hour', () => {
    expect(formatDuration(3600 * 1000)).toBe('1h 0m');
  });

  it('formats exactly 1 day', () => {
    expect(formatDuration(86400 * 1000)).toBe('1d 0h');
  });
});

// === getTimerUrgency ===

describe('getTimerUrgency', () => {
  it('returns green when elapsed is within greenMaxHours', () => {
    const oneHourMs = 3600000;
    expect(getTimerUrgency(oneHourMs, 2, 4)).toBe('green');
  });

  it('returns green when exactly at greenMaxHours', () => {
    const twoHoursMs = 2 * 3600000;
    expect(getTimerUrgency(twoHoursMs, 2, 4)).toBe('green');
  });

  it('returns yellow when between green and yellow thresholds', () => {
    const threeHoursMs = 3 * 3600000;
    expect(getTimerUrgency(threeHoursMs, 2, 4)).toBe('yellow');
  });

  it('returns yellow when exactly at yellowMaxHours', () => {
    const fourHoursMs = 4 * 3600000;
    expect(getTimerUrgency(fourHoursMs, 2, 4)).toBe('yellow');
  });

  it('returns red when beyond yellowMaxHours', () => {
    const fiveHoursMs = 5 * 3600000;
    expect(getTimerUrgency(fiveHoursMs, 2, 4)).toBe('red');
  });

  it('returns green for 0 elapsed time', () => {
    expect(getTimerUrgency(0, 2, 4)).toBe('green');
  });
});

// === generateDealNumber ===

describe('generateDealNumber', () => {
  it('generates correct format with sequence 1', () => {
    const result = generateDealNumber(1);
    const year = new Date().getFullYear();
    expect(result).toBe(`DM-${year}-00001`);
  });

  it('generates correct format with sequence 123', () => {
    const result = generateDealNumber(123);
    const year = new Date().getFullYear();
    expect(result).toBe(`DM-${year}-00123`);
  });

  it('generates correct format with 5-digit sequence', () => {
    const result = generateDealNumber(99999);
    const year = new Date().getFullYear();
    expect(result).toBe(`DM-${year}-99999`);
  });

  it('pads short numbers to 5 digits', () => {
    const result = generateDealNumber(7);
    expect(result).toMatch(/^DM-\d{4}-00007$/);
  });
});

// === getVehicleConditionOptions ===

describe('getVehicleConditionOptions', () => {
  it('lease returns all 3 conditions', () => {
    expect(getVehicleConditionOptions('lease')).toEqual(['new', 'used', 'untitled_demo']);
  });

  it('re_lease returns only used', () => {
    expect(getVehicleConditionOptions('re_lease')).toEqual(['used']);
  });

  it('retail_purchase returns only used', () => {
    expect(getVehicleConditionOptions('retail_purchase')).toEqual(['used']);
  });

  it('lease_buyout returns only used', () => {
    expect(getVehicleConditionOptions('lease_buyout')).toEqual(['used']);
  });
});

// === isVehicleConditionAutoSelected ===

describe('isVehicleConditionAutoSelected', () => {
  it('lease is NOT auto-selected', () => {
    expect(isVehicleConditionAutoSelected('lease')).toBe(false);
  });

  it('re_lease IS auto-selected', () => {
    expect(isVehicleConditionAutoSelected('re_lease')).toBe(true);
  });

  it('retail_purchase IS auto-selected', () => {
    expect(isVehicleConditionAutoSelected('retail_purchase')).toBe(true);
  });

  it('lease_buyout IS auto-selected', () => {
    expect(isVehicleConditionAutoSelected('lease_buyout')).toBe(true);
  });
});

// === showMSRPFields ===

describe('showMSRPFields', () => {
  it('returns true for new', () => {
    expect(showMSRPFields('new')).toBe(true);
  });

  it('returns true for untitled_demo', () => {
    expect(showMSRPFields('untitled_demo')).toBe(true);
  });

  it('returns false for used', () => {
    expect(showMSRPFields('used')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(showMSRPFields('')).toBe(false);
  });
});

// === showJDPowerFields ===

describe('showJDPowerFields', () => {
  it('returns true for used', () => {
    expect(showJDPowerFields('used')).toBe(true);
  });

  it('returns false for new', () => {
    expect(showJDPowerFields('new')).toBe(false);
  });

  it('returns false for untitled_demo', () => {
    expect(showJDPowerFields('untitled_demo')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(showJDPowerFields('')).toBe(false);
  });
});

// === showNetCapCost ===

describe('showNetCapCost', () => {
  it('returns true for lease', () => {
    expect(showNetCapCost('lease')).toBe(true);
  });

  it('returns true for re_lease', () => {
    expect(showNetCapCost('re_lease')).toBe(true);
  });

  it('returns false for retail_purchase', () => {
    expect(showNetCapCost('retail_purchase')).toBe(false);
  });

  it('returns false for lease_buyout', () => {
    expect(showNetCapCost('lease_buyout')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(showNetCapCost('')).toBe(false);
  });
});

// === showTotalAmountFinanced ===

describe('showTotalAmountFinanced', () => {
  it('returns true for retail_purchase', () => {
    expect(showTotalAmountFinanced('retail_purchase')).toBe(true);
  });

  it('returns true for lease_buyout', () => {
    expect(showTotalAmountFinanced('lease_buyout')).toBe(true);
  });

  it('returns false for lease', () => {
    expect(showTotalAmountFinanced('lease')).toBe(false);
  });

  it('returns false for re_lease', () => {
    expect(showTotalAmountFinanced('re_lease')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(showTotalAmountFinanced('')).toBe(false);
  });
});

// === isRequiredFieldEmpty ===

describe('isRequiredFieldEmpty', () => {
  it('returns true for null', () => {
    expect(isRequiredFieldEmpty(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isRequiredFieldEmpty(undefined)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isRequiredFieldEmpty('')).toBe(true);
  });

  it('returns true for whitespace-only string', () => {
    expect(isRequiredFieldEmpty('   ')).toBe(true);
  });

  it('returns false for non-empty string', () => {
    expect(isRequiredFieldEmpty('abc')).toBe(false);
  });

  it('returns false for number 0', () => {
    expect(isRequiredFieldEmpty(0)).toBe(false);
  });

  it('returns false for number 123', () => {
    expect(isRequiredFieldEmpty(123)).toBe(false);
  });

  it('returns false for boolean false', () => {
    expect(isRequiredFieldEmpty(false)).toBe(false);
  });

  it('returns false for boolean true', () => {
    expect(isRequiredFieldEmpty(true)).toBe(false);
  });
});

// === isValidEmail ===

describe('isValidEmail', () => {
  it('returns true for valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('returns true for email with subdomain', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true);
  });

  it('returns true for email with plus', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('returns false for string without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('returns false for string without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('returns false for string without TLD', () => {
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('returns false for string with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });
});

// === getInitials ===

describe('getInitials', () => {
  it('returns initials for John Smith', () => {
    expect(getInitials('John', 'Smith')).toBe('JS');
  });

  it('handles lowercase names', () => {
    expect(getInitials('john', 'smith')).toBe('JS');
  });

  it('handles empty first name', () => {
    expect(getInitials('', 'Smith')).toBe('S');
  });

  it('handles empty last name', () => {
    expect(getInitials('John', '')).toBe('J');
  });

  it('handles both empty', () => {
    expect(getInitials('', '')).toBe('');
  });
});

// === getFullName ===

describe('getFullName', () => {
  it('returns full name for John Smith', () => {
    expect(getFullName('John', 'Smith')).toBe('John Smith');
  });

  it('handles empty last name with trim', () => {
    expect(getFullName('John', '')).toBe('John');
  });

  it('handles empty first name with trim', () => {
    expect(getFullName('', 'Smith')).toBe('Smith');
  });

  it('handles both empty', () => {
    expect(getFullName('', '')).toBe('');
  });
});

// === truncate ===

describe('truncate', () => {
  it('returns original string if within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns original string if exactly at limit', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and adds ellipsis if over limit', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('truncates long string', () => {
    expect(truncate('This is a very long string that should be truncated', 10)).toBe('This is a ...');
  });
});
