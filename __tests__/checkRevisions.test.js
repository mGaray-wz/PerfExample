// __tests__/checkRevisions.test.js

const { isRevisionMismatch } = require('../scripts/logic/checkRevisions');

describe('isRevisionMismatch', () => {
  test('returns true when revisions are different', () => {
    expect(isRevisionMismatch('rev-1', 'rev-2')).toBe(true);
  });

  test('returns false when revisions are the same', () => {
    expect(isRevisionMismatch('rev-1', 'rev-1')).toBe(false);
  });

  test('trims whitespace and compares', () => {
    expect(isRevisionMismatch(' rev-1 ', 'rev-1')).toBe(false);
  });

  test('returns false when either value is missing', () => {
    expect(isRevisionMismatch('', 'rev-1')).toBe(false);
    expect(isRevisionMismatch('rev-1', '')).toBe(false);
  });
});
