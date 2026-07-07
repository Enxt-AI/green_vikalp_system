import prisma from "@db/client";
import webpush from "web-push";

// Ensure VAPID details are set for web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:test@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function processInteractionEvent(interactionId: string) {
  try {
    const interaction = await prisma.interaction.findUnique({
      where: { id: interactionId },
      include: {
        lead: {
          include: {
            assignedTo: {
              include: {
                pushSubscriptions: true
              }
            }
          }
        }
      }
    });

    if (!interaction || !interaction.lead) return;

    let triggerType = "";
    if (interaction.type === "CALL") {
      if (interaction.subject?.toLowerCase().includes("unconnected")) {
        triggerType = "call_disconnected";
      } else if (interaction.subject?.toLowerCase().includes("connected")) {
        triggerType = "call_connected";
      }
    }

    if (!triggerType) {
      console.log("No valid triggerType determined from interaction.");
      return;
    }

    console.log(`Trigger type determined: ${triggerType}`);

    // Find active workflows matching trigger
    const workflows = await prisma.workflow.findMany({
      where: {
        status: "Active",
        trigger: triggerType,
      }
    });

    console.log(`Found ${workflows.length} active workflows for trigger ${triggerType}`);

    for (const workflow of workflows) {
      console.log(`Evaluating workflow: ${workflow.name} (id: ${workflow.id})`);
      
      // Check constraints
      if (workflow.sourceCampaignId && workflow.sourceCampaignId !== interaction.lead.campaignId) {
        console.log(`- Skipped: Campaign mismatch. Workflow requires ${workflow.sourceCampaignId}, lead has ${interaction.lead.campaignId}`);
        continue;
      }
      if (workflow.stageId && workflow.stageId !== interaction.lead.currentStageId) {
        console.log(`- Skipped: Stage mismatch. Workflow requires ${workflow.stageId}, lead has ${interaction.lead.currentStageId}`);
        continue;
      }

      console.log(`- Constraints passed. Executing action: ${workflow.action}`);

      // Check tags (if lead has tags and workflow has tag filter, implement logic here if schema supports it)
      // For now, bypassing tag check as we don't have tags in standard schema, or it's optional

      // Execute Action
      if (workflow.action === "move_lead" && workflow.destinationCampaignId) {
        const updateData: any = { campaignId: workflow.destinationCampaignId };
        if ((workflow as any).destinationStageId) {
          updateData.currentStageId = (workflow as any).destinationStageId;
        }
        console.log(`- Updating lead with data:`, updateData);
        await prisma.lead.update({
          where: { id: interaction.lead.id },
          data: updateData
        });
      } else if (workflow.action === "change_stage" && (workflow as any).destinationStageId) {
        console.log(`- Updating lead stage to:`, (workflow as any).destinationStageId);
        await prisma.lead.update({
          where: { id: interaction.lead.id },
          data: { currentStageId: (workflow as any).destinationStageId }
        });
      } else if (workflow.action === "schedule_follow_up") {
        const nextFollowUp = new Date(); // Current date and time
        await prisma.lead.update({
          where: { id: interaction.lead.id },
          data: { nextFollowUpAt: nextFollowUp }
        });
        
        await prisma.task.create({
          data: {
            title: `Follow-up with ${interaction.lead.firstName || 'Lead'}`,
            description: `Automated follow-up triggered by workflow: ${workflow.name}`,
            type: "FOLLOW_UP",
            priority: "HIGH",
            dueDate: nextFollowUp,
            leadId: interaction.lead.id,
            assignedToId: interaction.lead.assignedToId
          }
        });
      } else if (workflow.action === "send_whatsapp" || workflow.action === "send_sms") {
        // Send Push Notification to assignedTo user
        const assignedUser = interaction.lead.assignedTo;
        if (assignedUser && assignedUser.pushSubscriptions?.length > 0) {
          const actionText = workflow.action === "send_whatsapp" ? "WhatsApp" : "SMS";
          const payload = JSON.stringify({
            title: `Action Required: Send ${actionText}`,
            body: `Workflow '${workflow.name}' triggered. Please send a ${actionText} to ${interaction.lead.firstName || 'the lead'}.`,
            data: {
              url: `/leads/${interaction.lead.id}`
            }
          });

          const sendPromises = assignedUser.pushSubscriptions.map(async (sub: any) => {
            try {
              await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth
                }
              }, payload);
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } });
              }
            }
          });

          await Promise.allSettled(sendPromises);
        }
        
        // Also log a system interaction for audit trail
        await prisma.interaction.create({
          data: {
            type: "SYSTEM",
            direction: "OUTBOUND",
            subject: `Automated Workflow Action: ${workflow.action}`,
            content: `Workflow '${workflow.name}' requested a ${workflow.action === 'send_whatsapp' ? 'WhatsApp' : 'SMS'} to be sent. User was notified.`,
            leadId: interaction.lead.id,
            createdById: interaction.lead.assignedToId,
          }
        });
      }
    }
  } catch (error) {
    console.error("Error in processInteractionEvent:", error);
  }
}
