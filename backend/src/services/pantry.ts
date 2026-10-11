import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient, type PantryItem } from '@prisma/client';
import type { PantryCreateInput, PantryItemDto, Pagination } from '../contracts/api';
import { InvalidApiInput, pageInfo, paginationOffset } from '../lib/api';
import { calendarDate, expiryState, serializeCalendarDate, utcTimestamp } from '../lib/inventoryRules';
import { minorAmount, quantityString } from '../lib/serialization';
import { prisma } from '../lib/prisma';
import type { VerifiedIdentity } from './auth';

export class PantryFailure extends Error {
  constructor(readonly code: 'HOUSEHOLD_REQUIRED' | 'PANTRY_UNAVAILABLE' | 'IDEMPOTENCY_CONFLICT' | 'ITEM_NOT_FOUND') { super(code); }
}
const categories = ['PRODUCE', 'DAIRY', 'BAKERY', 'SNACKS', 'MEAT', 'FROZEN', 'OTHER'];
export function pantryInput(value: unknown): PantryCreateInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidApiInput('Invalid pantry entry.');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => !['name', 'category', 'quantity', 'unit', 'expiresOn', 'totalCostMinor'].includes(key))) throw new InvalidApiInput('Unexpected request field.');
  const text = (key: string, max: number) => {
    const value = body[key];
    if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) throw new InvalidApiInput('Invalid text field.');
    const result = value.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!result || result.length > max) throw new InvalidApiInput('Invalid text length.');
    return result;
  };
  if (typeof body['category'] !== 'string' || !categories.includes(body['category'])) throw new InvalidApiInput('Invalid category.');
  return { name: text('name', 120), category: body['category'] as PantryCreateInput['category'],
    quantity: quantityString(body['quantity'] as string), unit: text('unit', 32),
    expiresOn: calendarDate(body['expiresOn'] as string), totalCostMinor: minorAmount(body['totalCostMinor']) };
}
function view(item: PantryItem, timezone: string): PantryItemDto {
  const expiresOn = serializeCalendarDate(item.expiresOn);
  return { id: item.id, name: item.name, category: item.category, quantity: quantityString(item.quantity.toString()),
    unit: item.unit, expiresOn, totalCostMinor: item.totalCostMinor, currencyCode: 'INR', status: item.status,
    source: item.source, expirySource: item.expirySource, ...expiryState(expiresOn, timezone, new Date()),
    createdAt: utcTimestamp(item.createdAt), updatedAt: utcTimestamp(item.updatedAt) };
}
export function createPantryService(db: PrismaClient = prisma) {
  const member = async (tx: Prisma.TransactionClient, identity: VerifiedIdentity) => {
    const row = await tx.householdMember.findUnique({ where: { authSubject: identity.id }, include: { household: true } });
    if (!row) throw new PantryFailure('HOUSEHOLD_REQUIRED');
    return row;
  };
  const run = async <T>(operation: (tx: Prisma.TransactionClient) => Promise<T>, retry = false): Promise<T> => {
    for (let attempt = 0; attempt < 4; attempt++) {
      try { return await db.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 }); }
      catch (error) {
        if (error instanceof PantryFailure || error instanceof InvalidApiInput) throw error;
        const code = (error as { code?: string }).code;
        if (!retry || !['P2034', 'P2002'].includes(code || '') || attempt === 3) throw new PantryFailure('PANTRY_UNAVAILABLE');
        await new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1)));
      }
    }
    throw new PantryFailure('PANTRY_UNAVAILABLE');
  };
  return {
    list: (identity: VerifiedIdentity, pagination: Pagination) => run(async tx => {
      const membership = await member(tx, identity);
      const where = { householdId: membership.householdId, status: 'ACTIVE' as const, archivedAt: null,
        household: { members: { some: { authSubject: identity.id } } } };
      const total = await tx.pantryItem.count({ where });
      const rows = await tx.pantryItem.findMany({ where, orderBy: [{ expiresOn: 'asc' }, { id: 'asc' }],
        skip: paginationOffset(pagination), take: pagination.pageSize });
      return { items: rows.map(row => view(row, membership.household.timezone)), pagination: pageInfo(pagination, total) };
    }),
    find: (identity: VerifiedIdentity, id: string) => run(async tx => {
      const membership = await member(tx, identity);
      const row = await tx.pantryItem.findFirst({ where: { id, householdId: membership.householdId, archivedAt: null,
        household: { members: { some: { authSubject: identity.id } } } } });
      if (!row) throw new PantryFailure('ITEM_NOT_FOUND');
      return view(row, membership.household.timezone);
    }),
    create: (identity: VerifiedIdentity, input: PantryCreateInput, key: string) => run(async tx => {
      const membership = await member(tx, identity);
      const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
      const idempotencyKey = `manual:${key}`;
      const prior = await tx.pantryItemEvent.findUnique({ where: { householdId_idempotencyKey: { householdId: membership.householdId, idempotencyKey } }, include: { pantryItem: true } });
      if (prior) {
        if ((prior.metadata as { requestHash?: string } | null)?.requestHash !== fingerprint) throw new PantryFailure('IDEMPOTENCY_CONFLICT');
        return view(prior.pantryItem, membership.household.timezone);
      }
      const item = await tx.pantryItem.create({ data: { ...input, expiresOn: new Date(`${input.expiresOn}T00:00:00Z`),
        householdId: membership.householdId, normalizedName: input.name.toLowerCase(), expirySource: 'USER_ENTERED',
        costSource: input.totalCostMinor === null ? 'UNKNOWN' : 'PURCHASE', currencyCode: 'INR', source: 'MANUAL' } });
      await tx.pantryItemEvent.create({ data: { householdId: membership.householdId, pantryItemId: item.id,
        eventType: 'CREATED', previousStatus: null, newStatus: 'ACTIVE', quantity: item.quantity,
        totalCostMinor: item.totalCostMinor, costSource: item.costSource, currencyCode: item.currencyCode,
        category: item.category, expiresOn: item.expiresOn, timezone: membership.household.timezone,
        source: 'APP', idempotencyKey, metadata: { requestHash: fingerprint } } });
      return view(item, membership.household.timezone);
    }, true),
  };
}
export type PantryService = ReturnType<typeof createPantryService>;
