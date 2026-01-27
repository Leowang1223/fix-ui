import { clsx, type ClassValue } from 'clsx'

/**
 * Utility function to merge CSS classes
 * Uses clsx for conditional class handling
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
