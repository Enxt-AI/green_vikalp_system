import { Router } from "express";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import prisma from "@db/client";
import { hashPassword, verifyPassword, generateRandomPassword } from "../lib/password";
import { signToken, cookieOptions, getCookieName } from "../lib/jwt";
import { authenticate, requireAdmin } from "../middleware/auth";
import {
  setupSchema,
  signinSchema,
  changePasswordSchema,
  createUserSchema,
} from "../lib/validation";
import {
  getAuthUrl,
  getTokensFromCode,
  getGoogleUserEmail,
  isCalendarConnected,
  syncAcceptedMeetingsToCalendar,
} from "../lib/google-calendar";

const router = Router();

// Rate limiter for signin endpoint - prevents brute force attacks
const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per window
  message: "Too many login attempts, please try again after 15 minutes",
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

// POST /auth/setup - One-time admin creation
router.post("/setup", async (req: Request, res: Response) => {
  try {
    // Check if any admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      res.status(400).json({ error: "Setup already completed" });
      return;
    }

    // Validate input
    const validation = setupSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { username, password, fullName } = validation.data;

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      res.status(400).json({ error: "Username already taken" });
      return;
    }

    // Create admin user
    const passwordHash = await hashPassword(password);
    const admin = await prisma.user.create({
      data: {
        username,
        passwordHash,
        fullName,
        role: "ADMIN",
        needsPasswordChange: false, // Admin created their own password
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
      },
    });

    // Sign JWT and set cookie
    const token = signToken({
      userId: admin.id,
      username: admin.username,
      role: admin.role,
    });

    const cookieName = getCookieName(req.headers.origin);
    res.cookie(cookieName, token, cookieOptions(req.headers.origin));

    res.status(201).json({
      message: "Admin account created successfully",
      user: admin,
    });
  } catch (error) {
    console.error("Setup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/check-setup - Check if setup needed
router.get("/check-setup", async (_req: Request, res: Response) => {
  try {
    const adminExists = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    res.json({ setupRequired: !adminExists });
  } catch (error) {
    console.error("Check setup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/signin - User login (with rate limiting)
router.post("/signin", signinLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = signinSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { username, password } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({ error: "Account is deactivated" });
      return;
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Sign JWT and set cookie
    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    const cookieName = getCookieName(req.headers.origin);
    res.cookie(cookieName, token, cookieOptions(req.headers.origin));

    res.json({
      message: "Signed in successfully",
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        needsPasswordChange: user.needsPasswordChange,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/signout - User logout
router.post("/signout", authenticate, (req: Request, res: Response) => {
  // Browsers require exact matching options to clear a cookie.
  // Instead of relying on potentially stripped origin headers, 
  // forcefully clear all variations.
  const isSecureEnv = process.env.NODE_ENV === "production" || process.env.HTTPS_ENABLED === "true";

  const mobileOptions = {
    httpOnly: true,
    secure: isSecureEnv,
    sameSite: "none" as const,
    path: "/",
  };

  const webOptions = {
    httpOnly: true,
    secure: isSecureEnv,
    sameSite: "lax" as const,
    path: "/",
  };

  // Clear specific mobile token
  res.clearCookie("token_mobile", mobileOptions);
  res.clearCookie("token_mobile", webOptions); // Fallback if it was set weirdly locally

  // Clear specific web token
  res.clearCookie("token_web", webOptions);

  // Clear legacy tokens
  res.clearCookie("token", mobileOptions);
  res.clearCookie("token", webOptions);

  res.json({ message: "Signed out successfully" });
});

// GET /auth/me - Get current user
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        needsPasswordChange: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/change-password - Change own password
router.post("/change-password", authenticate, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { currentPassword, newPassword } = validation.data;

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    // Hash new password and update
    const newPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        needsPasswordChange: false,
      },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/dismiss-password-change - Dismiss the password change prompt
router.post("/dismiss-password-change", authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { needsPasswordChange: false },
    });

    res.json({ message: "Password change dismissed" });
  } catch (error) {
    console.error("Dismiss password change error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/users - Create new user (Admin only)
router.post("/users", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = createUserSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { username, fullName, role, password, email, contactNumber, employeeId } = validation.data;

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      res.status(400).json({ error: "Username already taken" });
      return;
    }

    // Use provided password or generate random one
    const plainPassword = password || generateRandomPassword();
    const passwordHash = await hashPassword(plainPassword);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        fullName,
        role,
        passwordHash,
        email,
        contactNumber,
        employeeId,
        needsPasswordChange: true, // Force password change on first login
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        needsPasswordChange: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "User created successfully",
      user: newUser,
      temporaryPassword: plainPassword, // Return password so admin can share it
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/users - List all users (Admin only)
router.get("/users", authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        needsPasswordChange: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ users });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// PATCH /auth/users/:id/toggle-active - Toggle user active status (Admin only)
// ============================================
router.patch("/users/:id/toggle-active", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent self-deactivation
    if (id === req.user!.userId) {
      res.status(400).json({ error: "Cannot deactivate your own account" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    res.json({
      message: `User ${updatedUser.isActive ? "activated" : "deactivated"} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Toggle active error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==== GOOGLE CALENDAR INTEGRATION ====

// GET /auth/google/status - Check if user has Google Calendar connected
router.get("/google/status", authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.user!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleCalendarSynced: true,
        email: true,
      },
    });

    res.json({
      connected: user?.googleCalendarSynced || false,
      email: user?.email || null,
    });
  } catch (error) {
    console.error("Google status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/google/connect - Initiate Google OAuth flow
router.get("/google/connect", authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.user!;
    const returnTo = req.query.returnTo as string | undefined;

    // Create state parameter with user ID and returnTo for security
    const state = Buffer.from(JSON.stringify({ userId, returnTo })).toString("base64");

    const authUrl = getAuthUrl(state);

    res.json({ authUrl });
  } catch (error) {
    console.error("Google connect error:", error);
    res.status(500).json({ error: "Failed to initiate Google connection" });
  }
});

// GET /auth/google/callback - Handle OAuth callback
router.get("/google/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Frontend URL for redirecting after OAuth
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (oauthError) {
      console.error("OAuth error:", oauthError);
      res.redirect(`${frontendUrl}/dashboard/meetings?google_error=access_denied`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${frontendUrl}/dashboard/meetings?google_error=missing_params`);
      return;
    }

    // Decode state to get user ID and returnTo
    let userId: string;
    let returnTo: string | undefined;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, "base64").toString());
      userId = stateData.userId;
      returnTo = stateData.returnTo;
    } catch {
      res.redirect(`${frontendUrl}/dashboard/meetings?google_error=invalid_state`);
      return;
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code as string);

    if (!tokens.refresh_token) {
      res.redirect(`${frontendUrl}/dashboard/meetings?google_error=no_refresh_token`);
      return;
    }

    // Get user's Google email
    const googleEmail = await getGoogleUserEmail(tokens.access_token!);

    // Save refresh token to user
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleRefreshToken: tokens.refresh_token,
        googleCalendarSynced: true,
        googleSheetsSynced: true,
        email: googleEmail || undefined,
      },
    });

    // Sync all accepted upcoming meetings to user's calendar
    try {
      const syncedCount = await syncAcceptedMeetingsToCalendar(userId);
      console.log(`Synced ${syncedCount} accepted meetings to user's calendar`);
    } catch (syncError) {
      console.error("Failed to sync accepted meetings:", syncError);
      // Don't fail the OAuth flow if sync fails
    }

    // Redirect back to the requested page or meetings page
    if (returnTo) {
      res.redirect(`${frontendUrl}${returnTo}?google_connected=true`);
    } else {
      res.redirect(`${frontendUrl}/dashboard/meetings?google_connected=true`);
    }
  } catch (error) {
    console.error("Google callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/dashboard/meetings?google_error=callback_failed`);
  }
});

// POST /auth/google/disconnect - Disconnect Google Calendar
router.post("/google/disconnect", authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.user!;

    await prisma.user.update({
      where: { id: userId },
      data: {
        googleRefreshToken: null,
        googleCalendarSynced: false,
      },
    });

    res.json({ message: "Google Calendar disconnected successfully" });
  } catch (error) {
    console.error("Google disconnect error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
