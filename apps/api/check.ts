import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const leads = await prisma.lead.findMany({ include: { currentStage: true } });
  console.log("Total leads:", leads.length);
  console.log("Stages:", [...new Set(leads.map(l => l.currentStage.name))]);
  
  const interactions = await prisma.interaction.findMany({
    select: { leadId: true, type: true }
  });
  
  const connectedCalls = await prisma.interaction.findMany({
    where: { type: "CALL", duration: { gt: 0 } },
    select: { leadId: true }
  });
  
  console.log("Interactions count:", interactions.length);
}
main().finally(() => prisma.$disconnect());
