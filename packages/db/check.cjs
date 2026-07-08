const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany();
  console.log('Total Leads:', leads.length);
  const campaigns = await prisma.campaign.findMany({ include: { leads: true }});
  console.log('Total Campaigns:', campaigns.length);
  campaigns.forEach(c => console.log('Campaign:', c.name, 'Leads:', c.leads.length));
}

main().catch(console.error).finally(() => prisma.$disconnect());
