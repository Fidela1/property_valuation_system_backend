// src/ml/countProperties.ts

import prisma from '../config/prisma';

async function main() {
  const total = await prisma.property.count();

  const withFieldData = await prisma.property.count({
    where: {
      fieldData: {
        isNot: null
      }
    }
  });

  console.log({
    total,
    withFieldData
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());