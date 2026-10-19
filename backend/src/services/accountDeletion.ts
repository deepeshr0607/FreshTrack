import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthFailure, type VerifiedIdentity, type VerifyIdentity } from './auth';
import type { AccountDeletionReview } from '../contracts/api';

export class AccountDeletionFailure extends Error {
  constructor(readonly code: 'ACCOUNT_DELETION_UNAVAILABLE' | 'SHARED_HOUSEHOLD' | 'ACCOUNT_DATA_DELETED') {
    super('Account deletion could not be completed.');
  }
}
export function deletionSubjectHash(id: string): string {
  if (typeof id !== 'string' || !id.trim() || id.trim() !== id || id.length > 255 || /[\u0000-\u001f\u007f]/.test(id)) throw new AuthFailure();
  return createHash('sha256').update('freshtrack-account-deletion-v1\0').update(id).digest('hex');
}
export interface AccountDeletionService {
  review(identity: VerifiedIdentity): Promise<AccountDeletionReview>;
  removeData(identity: VerifiedIdentity): Promise<void>;
  assertActive(identity: VerifiedIdentity): Promise<void>;
}
export function createAccountDeletionService(db: PrismaClient = prisma): AccountDeletionService {
  const snapshot = async (tx: Prisma.TransactionClient, identity: VerifiedIdentity): Promise<AccountDeletionReview & { householdId?: string }> => {
    if (await tx.accountDeletion.findUnique({ where: { subjectHash: deletionSubjectHash(identity.id) } })) {
      return { state: 'DATA_DELETED', counts: { groceries: 0, events: 0, receipts: 0 } };
    }
    const member = await tx.householdMember.findUnique({ where: { authSubject: identity.id }, select: { householdId: true,
      household: { select: { _count: { select: { members: true, pantryItems: true, pantryEvents: true, receiptScans: true } } } } } });
    if (!member) return { state: 'READY', counts: { groceries: 0, events: 0, receipts: 0 } };
    const counts = member.household._count;
    return { householdId: member.householdId, state: counts.members === 1 ? 'READY' : 'SHARED_HOUSEHOLD',
      counts: { groceries: counts.pantryItems, events: counts.pantryEvents, receipts: counts.receiptScans } };
  };
  const transaction = <T>(run: (tx: Prisma.TransactionClient) => Promise<T>) =>
    db.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 2000, timeout: 10000 });
  return {
    async assertActive(identity) {
      try {
        if (await db.accountDeletion.findUnique({ where: { subjectHash: deletionSubjectHash(identity.id) } })) {
          throw new AccountDeletionFailure('ACCOUNT_DATA_DELETED');
        }
      } catch (error) {
        if (error instanceof AccountDeletionFailure || error instanceof AuthFailure) throw error;
        throw new AuthFailure(true); // No availability bypass for a missing migration/database outage.
      }
    },
    async review(identity) {
      try { const { householdId: _id, ...result } = await transaction(tx => snapshot(tx, identity)); return result; }
      catch (error) { if (error instanceof AuthFailure) throw error; throw new AccountDeletionFailure('ACCOUNT_DELETION_UNAVAILABLE'); }
    },
    async removeData(identity) {
      try {
        await transaction(async tx => {
          const review = await snapshot(tx, identity);
          if (review.state === 'SHARED_HOUSEHOLD') throw new AccountDeletionFailure('SHARED_HOUSEHOLD');
          if (review.state === 'DATA_DELETED') return; // Safe acknowledgement-loss replay, no new household.
          await tx.accountDeletion.create({ data: { subjectHash: deletionSubjectHash(identity.id) } });
          if (review.householdId) {
            const scope = { householdId: review.householdId };
            // Explicit order respects receipt/member RESTRICT constraints; everything rolls back together.
            await tx.pantryItemEvent.deleteMany({ where: scope });
            await tx.pantryItem.deleteMany({ where: scope });
            await tx.receiptScan.deleteMany({ where: scope });
            const deleted = await tx.household.deleteMany({ where: { id: review.householdId,
              members: { some: { authSubject: identity.id }, every: { authSubject: identity.id } } } });
            if (deleted.count !== 1) throw new AccountDeletionFailure('SHARED_HOUSEHOLD');
            // Household cascade removes the sole membership and its UserPreference.
          }
        });
      } catch (error) {
        if (error instanceof AccountDeletionFailure || error instanceof AuthFailure) throw error;
        throw new AccountDeletionFailure('ACCOUNT_DELETION_UNAVAILABLE');
      }
    },
  };
}
export function guardDeletedAccounts(verify: VerifyIdentity, service: AccountDeletionService): VerifyIdentity {
  return async token => { const identity = await verify(token); await service.assertActive(identity); return identity; };
}
