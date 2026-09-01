import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const managerPassword = await bcrypt.hash('manager123', 10);
  const techPassword = await bcrypt.hash('tech123', 10);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      passwordHash: managerPassword,
      role: 'MANAGER',
    },
  });

  const tech1 = await prisma.user.upsert({
    where: { email: 'tech1@example.com' },
    update: {},
    create: {
      email: 'tech1@example.com',
      passwordHash: techPassword,
      role: 'TECHNICIAN',
    },
  });

  const tech2 = await prisma.user.upsert({
    where: { email: 'tech2@example.com' },
    update: {},
    create: {
      email: 'tech2@example.com',
      passwordHash: techPassword,
      role: 'TECHNICIAN',
    },
  });

  console.log({ manager, tech1, tech2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
