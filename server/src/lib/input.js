const { HttpError } = require('./errors');

/**
 * Tiny declarative validator for request bodies. Each rule returns the cleaned value or records
 * an error; strings are trimmed and length-limited so nothing unbounded reaches a prompt.
 */
const rules = {
  string: ({ max, min = 0, required = false } = {}) => (value, path, errors) => {
    if (value === undefined || value === null || value === '') {
      if (required) errors.push({ field: path, message: 'Required.' });
      return '';
    }
    if (typeof value !== 'string') {
      errors.push({ field: path, message: 'Must be a string.' });
      return '';
    }
    const trimmed = value.trim();
    if (trimmed.length < min || trimmed.length > max) errors.push({ field: path, message: `Must be ${min}–${max} characters.` });
    return trimmed;
  },
  integer: ({ min, max }) => (value, path, errors) => {
    if (!Number.isInteger(value) || value < min || value > max) {
      errors.push({ field: path, message: `Must be a whole number from ${min} to ${max}.` });
      return min;
    }
    return value;
  },
  oneOf: (values) => (value, path, errors) => {
    if (!values.includes(value)) errors.push({ field: path, message: `Must be one of: ${values.join(', ')}.` });
    return value;
  },
  array: (item, { max, min = 0 } = {}) => (value, path, errors) => {
    if (value === undefined || value === null) {
      if (min > 0) errors.push({ field: path, message: 'Required.' });
      return [];
    }
    if (!Array.isArray(value) || value.length < min || value.length > max) {
      errors.push({ field: path, message: `Must be a list of ${min}–${max} items.` });
      return [];
    }
    return value.map((entry, index) => item(entry, `${path}[${index}]`, errors));
  },
  object: (shape, { nullable = false } = {}) => (value, path, errors) => {
    if (value === null && nullable) return null;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push({ field: path || 'body', message: 'Must be an object.' });
      return {};
    }
    return Object.fromEntries(Object.entries(shape).map(([key, rule]) => [key, rule(value[key], path ? `${path}.${key}` : key, errors)]));
  },
};

function validate(rule, value) {
  const errors = [];
  const cleaned = rule(value, '', errors);
  if (errors.length > 0) throw new HttpError(400, 'invalid_request', 'The request is invalid.', errors);
  return cleaned;
}

module.exports = { rules, validate };
