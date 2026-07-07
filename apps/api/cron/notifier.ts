import cron from "node-cron";
import prisma from "@db/client";
import webpush from "web-push";

// Ensure VAPID details are set
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:test@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("Web Push VAPID keys are missing. Push notifications will not work.");
}

export function startNotifierCron() {
  console.log("Starting Web Push Notifier Cron Job...");

  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      // Look for tasks due within the next 15 minutes that haven't been notified yet
      const upcomingTasks = await prisma.task.findMany({
        where: {
          type: "FOLLOW_UP",
          isCompleted: false,
          notificationSent: false,
          dueDate: {
            lte: new Date(now.getTime() + 15 * 60 * 1000), // Next 15 mins
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Not older than 24 hours (don't spam old tasks)
          },
        },
        include: {
          lead: true,
          assignedTo: {
            include: {
              pushSubscriptions: true,
            },
          },
        },
      });

      for (const task of upcomingTasks) {
        // If employee has push subscriptions
        if (task.assignedTo?.pushSubscriptions?.length > 0) {
          const payload = JSON.stringify({
            title: "Upcoming Follow-Up",
            body: `You have a follow-up with ${task.lead?.firstName || 'a lead'} scheduled at ${task.dueDate.toLocaleTimeString()}`,
            data: {
              url: `/leads/${task.leadId}`,
            },
          });

          // Send to all registered devices for this user
          const sendPromises = task.assignedTo.pushSubscriptions.map(async (sub) => {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            };

            try {
              await webpush.sendNotification(pushSubscription, payload);
            } catch (err: any) {
              console.error(`Failed to send push to subscription ${sub.id}:`, err);
              // If subscription is invalid/expired (status 410 or 404), remove it
              if (err.statusCode === 410 || err.statusCode === 404) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } });
              }
            }
          });

          await Promise.all(sendPromises);
        }

        // Mark as notified so we don't send it again
        await prisma.task.update({
          where: { id: task.id },
          data: { notificationSent: true },
        });
      }
    } catch (error) {
      console.error("Error running push notifier cron job:", error);
    }
  });
}
