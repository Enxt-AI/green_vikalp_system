import { Router } from "express";
import prisma from "@db/client";
import { authenticate } from "../middleware/auth";
import webpush from "web-push";

const router = Router();

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:test@example.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

// Get the public VAPID key
router.get("/public-key", authenticate, (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe a user to push notifications
router.post("/subscribe", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }

    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findFirst({
      where: { endpoint },
    });

    if (existing) {
      // Update userId if it changed (e.g. different user logged in on same browser)
      if (existing.userId !== userId) {
        await prisma.pushSubscription.update({
          where: { id: existing.id },
          data: { userId },
        });
      }
      return res.status(200).json({ message: "Subscription updated" });
    }

    // Create new subscription
    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    res.status(201).json({ message: "Subscription added" });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// Unsubscribe
router.post("/unsubscribe", authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint required" });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    res.status(200).json({ message: "Unsubscribed successfully" });
  } catch (error) {
    console.error("Error removing push subscription:", error);
    res.status(500).json({ error: "Failed to remove subscription" });
  }
});

export default router;
