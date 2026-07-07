import { prisma } from "@db";
import { hashPassword } from "../lib/password";

async function createAdmin() {
  const username = "admin";
  const password = "Admin@2026!";
  const fullName = "System Administrator";
  const email = "admin@crm.com";

  try {
    const passwordHash = await hashPassword(password);

    const admin = await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash,
        fullName,
        email,
      },
      create: {
        username,
        passwordHash,
        fullName,
        email,
        role: "ADMIN",
      },
    });

    console.log("Admin user created/updated successfully!");
    console.log(`Username: ${admin.username}`);
    console.log(`Password: ${password}`);
    console.log(`Email: ${admin.email}`);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
