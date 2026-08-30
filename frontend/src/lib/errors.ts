/**
 * Extracts a human-readable error message from API errors.
 * Handles Zod validation errors (object with `issues`), string errors, and generic errors.
 */
export function getApiErrorMessage(err: unknown, fallback = 'Ocurrió un error inesperado'): string {
  if (!err) return fallback

  // Axios error response
  const response = (err as { response?: { data?: unknown } })?.response
  if (response?.data) {
    const data = response.data as Record<string, unknown>

    // String error message
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message

    // Zod validation error object: { issues: [...], name: 'ZodError' }
    if (data.error && typeof data.error === 'object') {
      const zodErr = data.error as { issues?: Array<{ message: string; path?: string[] }>; name?: string }
      if (zodErr.issues?.length) {
        return zodErr.issues
          .map((i) => (i.path?.length ? `${i.path.join('.')}: ${i.message}` : i.message))
          .join(', ')
      }
    }

    // Fallback: stringify if we got something unexpected
    if (typeof data === 'string') return data
  }

  // Network / generic JS error
  if (err instanceof Error) return err.message

  return fallback
}
