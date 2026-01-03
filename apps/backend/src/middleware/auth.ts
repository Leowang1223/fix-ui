import { Request, Response, NextFunction } from 'express'
import { verifySupabaseToken } from '../lib/supabase'

// Extend Express Request to add custom user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
      }
    }
  }
}

export type AuthRequest = Request

export async function authenticateUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'No token provided'
      })
    }

    const token = authHeader.substring(7)
    const user = await verifySupabaseToken(token)

    req.user = {
      id: user.id,
      email: user.email!
    }

    next()
  } catch (error) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Invalid token'
    })
  }
}
