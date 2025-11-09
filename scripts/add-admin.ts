import { PrismaClient } from "@prisma/client";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function addAdminUser() {
  console.log("📝 Add Admin User\n");
  console.log("This will create an admin user in the database.");
  console.log("The user must first sign up through Supabase Auth.\n");

  const email = await question("Enter admin email: ");

  if (!email || !email.includes("@")) {
    console.log("❌ Invalid email");
    rl.close();
    process.exit(1);
  }

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log(`\n⚠️  User already exists with role: ${existing.role}`);

      if (existing.role === "admin") {
        console.log("✅ User is already an admin");
        rl.close();
        process.exit(0);
      }

      const update = await question("\nUpdate to admin? (y/n): ");
      if (update.toLowerCase() !== "y") {
        console.log("Cancelled");
        rl.close();
        process.exit(0);
      }

      await prisma.user.update({
        where: { email },
        data: { role: "admin" },
      });

      console.log(`\n✅ Updated ${email} to admin`);
    } else {
      // Create new admin user
      await prisma.user.create({
        data: {
          email,
          role: "admin",
        },
      });

      console.log(`\n✅ Created admin user: ${email}`);
    }

    console.log("\n📋 Next steps:");
    console.log(`1. Make sure ${email} has signed up in Supabase`);
    console.log("2. Go to: https://your-project.supabase.co/project/_/auth/users");
    console.log("3. Invite the user or have them sign up");
    console.log("4. They can now log in at /login");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

addAdminUser();
