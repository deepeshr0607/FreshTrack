import { deletionSubjectHash, AccountDeletionFailure } from './accountDeletion';
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { HouseholdDto } from '../contracts/api';
import { utcTimestamp } from '../lib/inventoryRules';
import { AuthFailure, type VerifiedIdentity } from './auth';

export class HouseholdUnavailable extends Error {
  constructor() { super('Household services are temporarily unavailable.'); }
}

function subject(identity: VerifiedIdentity): string {
  if (typeof identity?.id !== 'string' || !identity.id.trim() || identity.id.length > 255 ||
      identity.id.trim() !== identity.id || /[\u0000-\u001f\u007f]/.test(identity.id)) throw new AuthFailure();
  return identity.id;
}

function selection(authSubject: string) {
  return {
    id: true, name: true, currencyCode: true, timezone: true, createdAt: true, updatedAt: true,
    members: { where: { authSubject }, select: { role: true, preference: { select: {
      notificationEnabled: true, preferredNotificationTime: true, dateFormat: true,
    } } } },
  } as const;
}

type SelectedHousehold = Prisma.HouseholdGetPayload<{ select: ReturnType<typeof selection> }>;
function view(row: SelectedHousehold | null): HouseholdDto | null {
  const member = row?.members[0];
  if (!row || !member) return null;
  return {
    id: row.id, name: row.name, currencyCode: row.currencyCode, timezone: row.timezone,
    createdAt: utcTimestamp(row.createdAt), updatedAt: utcTimestamp(row.updatedAt),
    membership: { role: member.role }, preferences: member.preference,
  };
}

export interface HouseholdService {
  bootstrap(identity: VerifiedIdentity): Promise<NonNullable<ReturnType<typeof view>>>;
  findForIdentity(identity: VerifiedIdentity, householdId?: string): Promise<ReturnType<typeof view>>;
}

export function createHouseholdService(db: PrismaClient = prisma): HouseholdService {
  return {
    async bootstrap(identity) {
      const authSubject = subject(identity);
      // Unique subject + rollback prevents duplicate/orphan households under concurrent startup.
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          return await db.$transaction(async tx => {
            // Recheck inside setup's transaction: a request authorized before deletion cannot recreate data.
            if (await tx.accountDeletion.findUnique({ where: { subjectHash: deletionSubjectHash(authSubject) } })) {
              throw new AccountDeletionFailure('ACCOUNT_DATA_DELETED');
            }
            const existing = await tx.householdMember.findUnique({ where: { authSubject }, select: { householdId: true } });
            let householdId = existing?.householdId;
            if (!householdId) {
              const household = await tx.household.create({ data: { name: 'My Kitchen', currencyCode: 'INR', timezone: 'Asia/Kolkata' } });
              householdId = household.id;
              await tx.householdMember.create({ data: { householdId, authSubject, role: 'MANAGER' } });
            }
            // Repair missing preferences without resetting an existing user's choices.
            await tx.userPreference.upsert({ where: { authSubject }, create: { authSubject }, update: {} });
            const row = await tx.household.findFirst({ where: { id: householdId, members: { some: { authSubject } } }, select: selection(authSubject) });
            const result = view(row);
            if (!result) throw new HouseholdUnavailable();
            return result;
          }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 2000, timeout: 5000 });
        } catch (error) {
          if (error instanceof AccountDeletionFailure) throw error;
          const code = (error as { code?: string })?.code;
          const target = (error as { meta?: { target?: unknown } })?.meta?.target;
          const subjectConflict = code === 'P2002' && Array.isArray(target) && target.includes('authSubject');
          if (attempt === 3 || (code !== 'P2034' && !subjectConflict)) throw new HouseholdUnavailable();
          await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
        }
      }
      throw new HouseholdUnavailable();
    },
    async findForIdentity(identity, householdId) {
      const authSubject = subject(identity);
      try {
        // Scope the query itself; never fetch by ID then decide ownership afterwards.
        const row = await db.household.findFirst({
          where: { ...(householdId ? { id: householdId } : {}), members: { some: { authSubject } } },
          select: selection(authSubject),
        });
        return view(row);
      } catch { throw new HouseholdUnavailable(); }
    },
  };
}
