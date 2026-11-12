import { describe, expect, it } from 'vitest';
import { formatCost, formatDateTime, formatDoneRate, formatTokens } from '../../src/utils/format';

describe('formatDateTime', () => {
  // 用本地时区构造时间，断言显示与本地一致。
  it('renders ISO timestamps as local YYYY-MM-DD HH:mm', () => {
    const iso = new Date(2026, 2, 5, 9, 7).toISOString();
    expect(formatDateTime(iso)).toBe('2026-03-05 09:07');
  });

  it('falls back to the raw string for invalid input', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDoneRate', () => {
  it('formats to one decimal when fractional', () => {
    expect(formatDoneRate(33.33)).toBe('33.3%');
    expect(formatDoneRate(12.25)).toBe('12.3%');
  });

  it('omits decimals for integers', () => {
    expect(formatDoneRate(100)).toBe('100%');
    expect(formatDoneRate(0)).toBe('0%');
    expect(formatDoneRate(50.0)).toBe('50%');
  });

  it('guards non-finite numbers', () => {
    expect(formatDoneRate(Number.NaN)).toBe('0%');
  });
});

describe('formatTokens', () => {
  it('renders 0 as a real value, not an empty placeholder', () => {
    expect(formatTokens(0)).toBe('0');
  });

  it('keeps small values as integers', () => {
    expect(formatTokens(7)).toBe('7');
    expect(formatTokens(999)).toBe('999');
  });

  it('uses one-decimal k for values >= 1000（统计/卡片/详情同一规则）', () => {
    expect(formatTokens(1000)).toBe('1k');
    expect(formatTokens(3200)).toBe('3.2k');
    expect(formatTokens(8640)).toBe('8.6k');
    expect(formatTokens(12480)).toBe('12.5k');
    expect(formatTokens(24320)).toBe('24.3k');
  });

  it('renders an em dash for empty/invalid values', () => {
    expect(formatTokens(null)).toBe('—');
    expect(formatTokens(undefined)).toBe('—');
    expect(formatTokens(Number.NaN)).toBe('—');
    expect(formatTokens(-1)).toBe('—');
  });
});

describe('formatCost', () => {
  it('always keeps two decimals', () => {
    expect(formatCost(2.42)).toBe('¥2.42');
    expect(formatCost(0)).toBe('¥0.00');
    expect(formatCost(null)).toBe('¥0.00');
  });
});
