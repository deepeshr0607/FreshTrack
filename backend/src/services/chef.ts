import { Prisma, type PrismaClient } from '@prisma/client';
import type { ChefExpiringData } from '../contracts/api';
import { householdDate, calendarDate, serializeCalendarDate } from '../lib/inventoryRules';
import { quantityString } from '../lib/serialization';
import { prisma } from '../lib/prisma';
import { AuthFailure, type VerifiedIdentity } from './auth';

export class ChefFailure extends Error {
  constructor(readonly code: 'HOUSEHOLD_REQUIRED' | 'CHEF_UNAVAILABLE' | 'CHEF_INGREDIENT_LIMIT') { super(code); }
}
export interface ChefService { expiring(identity: VerifiedIdentity): Promise<ChefExpiringData> }
/** Pantry stores dates, not use-by instants. Match the existing critical tier without claiming exact hours. */
export function chefWindow(now: Date, timezone: string) {
  const today = householdDate(now, timezone);
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return { householdDate: today, throughDate: calendarDate(tomorrow.toISOString().slice(0, 10)), timezone,
    window: 'HOUSEHOLD_TODAY_AND_TOMORROW' as const };
}
export function createChefService(db: PrismaClient = prisma, now: () => Date = () => new Date()): ChefService {
  return { async expiring(identity) {
    if (typeof identity?.id !== 'string' || !identity.id.trim() || identity.id.trim() !== identity.id ||
        identity.id.length > 255 || /[\u0000-\u001f\u007f]/.test(identity.id)) throw new AuthFailure();
    const instant = now();
    try {
      return await db.$transaction(async tx => {
        const membership = await tx.householdMember.findUnique({ where: { authSubject: identity.id },
          select: { householdId: true, household: { select: { timezone: true } } } });
        if (!membership) throw new ChefFailure('HOUSEHOLD_REQUIRED');
        const window = chefWindow(instant, membership.household.timezone);
        const rows = await tx.pantryItem.findMany({ where: { householdId: membership.householdId,
          household: { members: { some: { authSubject: identity.id } } }, status: 'ACTIVE', archivedAt: null,
          expiresOn: { gte: new Date(`${window.householdDate}T00:00:00Z`), lte: new Date(`${window.throughDate}T00:00:00Z`) } },
          select: { id: true, name: true, quantity: true, unit: true, expiresOn: true },
          orderBy: [{ expiresOn: 'asc' }, { id: 'asc' }], take: 201 });
        if (rows.length > 200) throw new ChefFailure('CHEF_INGREDIENT_LIMIT');
        return { ...window, ingredients: rows.map(row => ({ pantryItemId: row.id,
          name: row.name.normalize('NFC').trim().replace(/\s+/g, ' '), quantity: quantityString(row.quantity.toString()),
          unit: row.unit, expiresOn: serializeCalendarDate(row.expiresOn) })) };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 5000, timeout: 10000 });
    } catch (error) { if (error instanceof ChefFailure) throw error; throw new ChefFailure('CHEF_UNAVAILABLE'); }
  } };
}
