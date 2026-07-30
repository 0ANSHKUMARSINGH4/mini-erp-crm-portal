import { prisma } from '../config/db.js';

export async function generateChallanNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CH-${currentYear}-`;

  // Find latest challan number matching prefix
  const latestChallan = await prisma.salesChallan.findFirst({
    where: {
      challanNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      challanNumber: 'desc'
    }
  });

  if (!latestChallan) {
    return `${prefix}0001`;
  }

  const parts = latestChallan.challanNumber.split('-');
  const seqStr = parts[parts.length - 1];
  const nextSeq = parseInt(seqStr, 10) + 1;

  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}
