/**
 * Wrap an async route handler so a rejected promise reaches the error
 * middleware instead of hanging the request.
 *
 * Express 4 does not catch rejections from async handlers, so without this an
 * `await` that throws would leave the client waiting until timeout.
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
export default function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
