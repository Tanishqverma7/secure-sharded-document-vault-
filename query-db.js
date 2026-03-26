const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const files = await prisma.file.findMany();
  console.log(JSON.stringify(files, null, 2));
}
check().finally(() => prisma.$disconnect());
