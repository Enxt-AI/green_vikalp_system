import prisma from "@db/client";

interface UserLeadCount {
  userId: string;
  leadCount: number;
}

export async function getAutoAssignmentOrder(
  campaignId: string,
  importingUserId: string
): Promise<string[]> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { assignedToIds: true },
  });

  if (!campaign) {
    return [importingUserId];
  }

  const assignedUserIds = campaign.assignedToIds;

  if (assignedUserIds.length === 0) {
    return [importingUserId];
  }

  const activeUsers = await prisma.user.findMany({
    where: {
      id: { in: assignedUserIds },
      isActive: true,
    },
    select: { id: true },
  });

  const activeUserIds = activeUsers.map((u) => u.id);

  if (activeUserIds.length === 0) {
    return [importingUserId];
  }

  if (activeUserIds.length === 1) {
    return activeUserIds;
  }

  const leadCounts = await prisma.lead.groupBy({
    by: ["assignedToId"],
    where: {
      campaignId,
      assignedToId: { in: activeUserIds },
      isArchived: false,
    },
    _count: {
      id: true,
    },
  });

  const userLeadCountMap: Map<string, number> = new Map();
  activeUserIds.forEach((userId) => {
    userLeadCountMap.set(userId, 0);
  });

  leadCounts.forEach((item) => {
    userLeadCountMap.set(item.assignedToId, item._count.id);
  });

  const sortedUsers: UserLeadCount[] = activeUserIds
    .map((userId) => ({
      userId,
      leadCount: userLeadCountMap.get(userId) || 0,
    }))
    .sort((a, b) => a.leadCount - b.leadCount);

  return sortedUsers.map((u) => u.userId);
}

export function assignLeadsRoundRobin(
  leadCount: number,
  assignmentOrder: string[]
): string[] {
  if (assignmentOrder.length === 0) {
    return [];
  }

  const assignments: string[] = [];
  const userLeadCounts: Map<string, number> = new Map();

  assignmentOrder.forEach((userId) => {
    userLeadCounts.set(userId, 0);
  });

  for (let i = 0; i < leadCount; i++) {
    const userId = assignmentOrder[i % assignmentOrder.length];
    if (userId) {
      assignments.push(userId);
      userLeadCounts.set(userId, (userLeadCounts.get(userId) || 0) + 1);
    }
  }

  return assignments;
}
