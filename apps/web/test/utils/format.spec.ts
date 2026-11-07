import { describe, expect, it } from 'vitest';
import { formatDateTime, formatDoneRate } from '../../src/utils/format';

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
