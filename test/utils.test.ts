import { describe, it, expect } from 'vitest';
import { currentTimestamp } from '../lib/utils.js';

describe('currentTimestamp', () => {
  it('should return an ISO 8601 UTC timestamp with millisecond precision', () => {
    expect(currentTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should return the current time', () => {
    const timestamp = currentTimestamp();

    expect(Math.abs(Date.now() - new Date(timestamp).getTime())).toBeLessThan(60_000);
  });
});
