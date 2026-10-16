import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { analyticsGroupsQuery, analyticsMonth, analyticsMonthCount, analyticsMonths, analyticsSummary, analyticsSeries, type AnalyticsGroup } from '../lib/analytics';
import { householdDate, utcTimestamp } from '../lib/inventoryRules';
import { AuthFailure, type VerifiedIdentity } from './auth';
import { analyticsUsedQuery, withAnalyticsUsedRows, type AnalyticsUsedRow } from '../lib/analyticsUsed';
import type { AnalyticsSummary, AnalyticsSeries } from '../contracts/api';

export class AnalyticsFailure extends Error {
  constructor(readonly code: 'HOUSEHOLD_REQUIRED' | 'ANALYTICS_UNAVAILABLE') { super(code); }
}
export interface AnalyticsService {
  summary(identity: VerifiedIdentity, month?: string): Promise<AnalyticsSummary>;
  series(identity: VerifiedIdentity, month?: string, months?: number): Promise<AnalyticsSeries>;
}
export function createAnalyticsService(db: PrismaClient = prisma, now: () => Date = () => new Date()): AnalyticsService {
  const read = async <T>(identity: VerifiedIdentity, requestedMonth: string | undefined, count: number | undefined,
    present: (groups: AnalyticsGroup[], months: string[], timezone: string, asOf: string, currentMonth: string,
      context: { tx: Prisma.TransactionClient; householdId: string; instant: Date }) => T | Promise<T>): Promise<T> => {
    if (typeof identity?.id !== 'string' || !identity.id.trim() || identity.id.trim() !== identity.id || identity.id.length > 255
      || /[\u0000-\u001f\u007f]/.test(identity.id)) throw new AuthFailure();
    const validatedMonth = requestedMonth === undefined ? undefined : analyticsMonth(requestedMonth);
    if (count !== undefined) { analyticsMonthCount(count); if (validatedMonth) analyticsMonths(validatedMonth, count); }
    try {
      const instant = now(), asOf = utcTimestamp(instant);
      return await db.$transaction(async tx => {
        const membership = await tx.householdMember.findUnique({ where: { authSubject: identity.id },
          select: { householdId: true, household: { select: { timezone: true, currencyCode: true } } } });
        if (!membership) throw new AnalyticsFailure('HOUSEHOLD_REQUIRED');
        const { timezone, currencyCode } = membership.household;
        if (currencyCode !== 'INR') throw new AnalyticsFailure('ANALYTICS_UNAVAILABLE');
        const currentMonth = householdDate(instant, timezone).slice(0, 7), month = validatedMonth ?? currentMonth;
        const months = count === undefined ? [month] : analyticsMonths(month, count);
        const groups = await tx.$queryRaw<AnalyticsGroup[]>(Prisma.sql`WITH ${analyticsGroupsQuery(membership.householdId, identity.id, months, timezone, instant)}`);
        return await present(groups, months, timezone, asOf, currentMonth, { tx, householdId: membership.householdId, instant });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 5000, timeout: 10000 });
    } catch (error) {
      if (error instanceof AnalyticsFailure) throw error;
      throw new AnalyticsFailure('ANALYTICS_UNAVAILABLE');
    }
  };
  return {
    summary: (identity, month) => read(identity, month, undefined, (groups, months, timezone, asOf) => analyticsSummary(groups, months[0], timezone, asOf)),
    series: (identity, month, count = 6) => read(identity, month, count, async (groups, months, timezone, asOf, currentMonth, context) => {
      const data = analyticsSeries(groups, months, timezone, asOf, currentMonth);
      const rows = await context.tx.$queryRaw<AnalyticsUsedRow[]>(Prisma.sql`WITH ${analyticsUsedQuery(context.householdId, identity.id, data.month, timezone, context.instant)}`);
      return withAnalyticsUsedRows(data, rows);
    }),
  };
}
