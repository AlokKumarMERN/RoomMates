/**
 * Validate part of the request against a Zod schema before it reaches the
 * controller.
 *
 * On success the parsed (and coerced/trimmed) result replaces the raw input, so
 * controllers only ever see data of a known shape. On failure the ZodError is
 * passed to the error handler, which turns it into a 422 with field-level
 * messages the form can display next to each input.
 *
 *   router.post('/login', validate(loginSchema), controller.login);
 */
export default function validate(schema, source = 'body') {
  return function validateRequest(req, res, next) {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(result.error);
    }

    req[source] = result.data;
    return next();
  };
}
