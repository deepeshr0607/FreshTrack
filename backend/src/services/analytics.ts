import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { analyticsGroupsQuery, analyticsMonth, analyticsSummary, type AnalyticsGroup } from '../lib/analytics';
import { householdDate, utcTimestamp } from '../lib/inventoryRules';
import { AuthFailure, type VerifiedIdentity } from './auth';
import type { AnalyticsSummary } from '../contracts/api';

export class AnalyticsFailure extends Error {
  constructor(readonly code: 'HOUSEHOLD_REQUIRED' | 'ANALYTICS_UNAVAILABLE') { super(code); }
}
export interface AnalyticsService { summary(identity: VerifiedIdentity, month?: string): Promise<AnalyticsSummary> }
export function createAnalyticsService(db: PrismaClient = prisma, now: () => Date = () => new Date()): AnalyticsService {
  return { async summary(identity, requestedMonth) {
    if (typeof identity?.id !== 'string' || !identity.id.trim() || identity.id.trim() !== identity.id || identity.id.length > 255
      || /[\u0000-\u001f\u007f]/.test(identity.id)) throw new AuthFailure();
    const validatedMonth = requestedMonth === undefined ? undefined : analyticsMonth(requestedMonth);
    try {
      const instant = now(), asOf = utcTimestamp(instant);
      return await db.$transaction(async tx => {
        const membership = await tx.householdMember.findUnique({ where: { authSubject: identity.id },
          select: { householdId: true, household: { select: { timezone: true, currencyCode: true } } } });
        if (!membership) throw new AnalyticsFailure('HOUSEHOLD_REQUIRED');
        const { timezone, currencyCode } = membership.household;
        if (currencyCode !== 'INR') throw new AnalyticsFailure('ANALYTICS_UNAVAILABLE');
        const month = validatedMonth ?? householdDate(instant, timezone).slice(0, 7);
        // Validate the zone even when an explicit month was supplied.
        householdDate(instant, timezone);
        const groups = await tx.$queryRaw<AnalyticsGroup[]>(Prisma.sql`WITH ${analyticsGroupsQuery(membership.householdId, identity.id, month, timezone, instant)}`);
        return analyticsSummary(groups, month, timezone, asOf);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 5000, timeout: 10000 });
    } catch (error) {
      if (error instanceof AnalyticsFailure) throw error;
      throw new AnalyticsFailure('ANALYTICS_UNAVAILABLE');
    }
  } };
}
