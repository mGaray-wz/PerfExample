// scripts/logic/checkRevisions.js

function isRevisionMismatch(expected, actual) {
  if (!expected || !actual) return false;
  return expected.trim() !== actual.trim();
}

module.exports = { isRevisionMismatch };
