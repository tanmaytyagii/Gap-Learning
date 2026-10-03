class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function notFound(req, res) {
  res.status(404).json({ error: { code: 'not_found', message: `No API route for ${req.method} ${req.path}.` } });
}

// Express recognizes error middleware by its four-argument signature.
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'invalid_json', message: 'The request body is not valid JSON.' } });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'payload_too_large', message: 'The request body is too large.' } });
  }
  if (error instanceof HttpError) {
    const body = { code: error.code, message: error.message };
    if (error.details) body.details = error.details;
    return res.status(error.status).json({ error: body });
  }
  console.error('Unhandled error:', error);
  return res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong on the server.' } });
}

module.exports = { HttpError, notFound, errorHandler };
