import { prisma } from './prisma';

export async function checkDatabaseReadiness(): Promise<boolean> {
  try {
    // Application-table reads establish both connectivity and migration readiness.
    await prisma.household.findFirst({ select: { id: true } });
    await prisma.householdMember.findFirst({ select: { id: true } });
    await prisma.pantryItem.findFirst({ select: { id: true } });
    await prisma.pantryItemEvent.findFirst({ select: { id: true } });
    await prisma.receiptScan.findFirst({ select: { id: true } });
    await prisma.userPreference.findFirst({ select: { id: true } });
    await prisma.accountDeletion.findFirst({ select: { subjectHash: true } });
    return true;
  } catch {
    // Driver exceptions may contain hosts/query details; do not log or serialize them.
    return false;
  }
}
