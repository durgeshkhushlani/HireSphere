// Lets services signal an HTTP outcome without knowing about req/res.
// The error middleware in app.js turns these into JSON responses.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }

  static badRequest(message) {
    return new ApiError(400, message);
  }

  static unauthorized(message) {
    return new ApiError(401, message);
  }

  static forbidden(message) {
    return new ApiError(403, message);
  }

  static notFound(message) {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  static badGateway(message) {
    return new ApiError(502, message);
  }

  static tooManyRequests(message) {
    return new ApiError(429, message);
  }
}

module.exports = ApiError;
