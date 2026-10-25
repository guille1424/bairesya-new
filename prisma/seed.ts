import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("Definí ADMIN_INITIAL_PASSWORD (mínimo 8 caracteres) para crear el admin.");
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`El usuario "${username}" ya existe; no se modifica.`);
    return;
  }

  await prisma.user.create({
    data: { username, passwordHash: await bcrypt.hash(password, 10), role: "ADMIN" },
  });
  console.log(`Usuario admin "${username}" creado.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
