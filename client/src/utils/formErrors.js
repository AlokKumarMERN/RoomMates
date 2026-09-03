/**
 * Turn the API's `details` array into a { fieldName: message } map so a form can
 * show each problem next to the input that caused it, instead of dumping one
 * generic message at the top.
 *
 *   [{ field: 'email', message: 'Enter a valid email address.' }]
 *   → { email: 'Enter a valid email address.' }
 *
 * Keeps the first message per field — that is the one worth fixing first.
 */
export function fieldErrorsFrom(error) {
  if (!Array.isArray(error?.details)) return {};

  return error.details.reduce((accumulated, detail) => {
    if (detail?.field && !accumulated[detail.field]) {
      accumulated[detail.field] = detail.message;
    }
    return accumulated;
  }, {});
}
