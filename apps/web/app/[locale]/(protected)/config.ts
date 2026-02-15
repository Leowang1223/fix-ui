// Feature flags for (protected) app area
// Set NEXT_PUBLIC_SHOW_SCORES=true to display numeric scores; default hides scores and shows suggestions only.
export const SHOW_SCORES = process.env.NEXT_PUBLIC_SHOW_SCORES === 'true'

// Backend API base URL. Set NEXT_PUBLIC_API_BASE to override.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8082'
