import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Creates the very first admin account, from ADMIN_USERNAME/ADMIN_PASSWORD
// in .env, so there's a way to log in before any user exists to create
// one through /users. Safe to re-run - it only acts when the users table
// is empty.
async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log(`Skipping seed: ${existing} user(s) already exist.`);
    return;
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "No users exist yet, but ADMIN_USERNAME / ADMIN_PASSWORD are not set in .env - set them and re-run `npx prisma db seed`.",
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { username, passwordHash, role: "ADMIN" },
  });
  console.log(`Created admin user "${username}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
