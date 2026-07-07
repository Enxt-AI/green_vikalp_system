import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import { verifyToken, getCookieName, type JWTPayload } from "../lib/jwt";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication Middleware
 * 
 * Verifies JWT token from HTTP-only cookie and attaches user data to request
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // Check for distinct cookies based on origin
  const origin = req.headers.origin || req.headers.referer;
  const cookieName = getCookieName(origin);
  const token = req.cookies?.[cookieName] || req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Role-Based Access Control (RBAC) Middleware Factory
 * 
 * Creates middleware to restrict route access based on user roles
 * 
 * Role Hierarchy:
 * - ADMIN: Full system access (user management, all campaigns, pipelines)
 * - MANAGER: Campaign and pipeline management, assigned campaigns
 * - EMPLOYEE: Limited to assigned campaigns and own leads
 * 
 * @param allowedRoles - Variable number of Role values that can access the route
 * @returns Express middleware function
 * 
 * Important:
 * - MUST be used AFTER authenticate middleware
 * - Returns 403 Forbidden if user role not in allowed list
 * - Returns 401 if user not authenticated
 * 
 * Usage Examples:
 * // Only admins
 * router.delete('/users/:id', authenticate, requireRole('ADMIN'), handler);
 * 
 * // Admins and managers
 * router.post('/campaigns', authenticate, requireRole('ADMIN', 'MANAGER'), handler);
 * 
 * // All authenticated users
 * router.get('/campaigns', authenticate, handler);
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}

/**
 * Shorthand middleware for admin-only routes
 */
export const requireAdmin = requireRole("ADMIN");

/**
 * Shorthand middleware for admin and manager routes
 */
export const requireManager = requireRole("ADMIN", "MANAGER");

