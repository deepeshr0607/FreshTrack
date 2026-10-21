import { createHash, randomUUID } from 'node:crypto';
import { resolveExpiry } from '../contracts/expiry';
import { packageBarcode } from '../contracts/barcode';
import { RECEIPT_MAX_ITEMS } from '../contracts/receiptLimits';
import { Prisma, type PrismaClient, type PantryItem } from '@prisma/client';
import type { PantryCreateInput, PantryEditInput, PantryOutcomeInput, PantryBatchInput, PantryItemDto, Pagination, PantryListFilters, ReceiptReviewInput, ReceiptImportInput, ReceiptDuplicateRow } from '../contracts/api';
import { InvalidApiInput, pageInfo, paginationOffset } from '../lib/api';
import { calendarDate, expiryState, planStatusTransition, serializeCalendarDate, utcTimestamp } from '../lib/inventoryRules';
import { pantryListWhere, pantryListOrder, categoryPageWindows } from '../lib/pantryQuery';
import { minorAmount, quantityString } from '../lib/serialization';
import { prisma } from '../lib/prisma';
import type { VerifiedIdentity } from './auth';

export class PantryFailure extends Error {
  constructor(readonly code: 'HOUSEHOLD_REQUIRED' | 'PANTRY_UNAVAILABLE' | 'IDEMPOTENCY_CONFLICT' | 'ITEM_NOT_FOUND' | 'ITEM_CHANGED' | 'ITEM_RESOLVED' | 'PANTRY_DUPLICATE') { super(code); }
}
function expectedVersion(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new InvalidApiInput('Invalid item version.');
  return value;
}
export function pantryEditInput(value: unknown): PantryEditInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidApiInput('Invalid edit.');
  const { expectedUpdatedAt, ...fields } = value as Record<string, unknown>;
  if ('duplicateConfirmation' in fields || 'barcode' in fields) throw new InvalidApiInput('Purchase identity is only set when adding.');
  return { ...pantryInput(fields), expectedUpdatedAt: expectedVersion(expectedUpdatedAt) };
}
export function pantryOutcomeInput(value: unknown): PantryOutcomeInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidApiInput('Confirm the outcome.');
  const body = value as Record<string, unknown>;
  if (body['confirmed'] !== true || Object.keys(body).some(key => !['confirmed', 'expectedUpdatedAt'].includes(key))) throw new InvalidApiInput('Confirm the outcome without extra fields.');
  return { confirmed: true, expectedUpdatedAt: expectedVersion(body['expectedUpdatedAt']) };
}
export function pantryBatchInput(value: unknown, outcome = true): PantryBatchInput & { action?: 'consume' | 'waste' } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidApiInput('Invalid batch.');
  const body = value as Record<string, unknown>;
  if (body['confirmed'] !== true || Object.keys(body).some(key => !(outcome ? ['confirmed', 'items', 'action'] : ['confirmed', 'items']).includes(key)) ||
      (outcome && !['consume', 'waste'].includes(body['action'] as string)) || !Array.isArray(body['items']) || body['items'].length < 1 || body['items'].length > 20) throw new InvalidApiInput('Confirm between 1 and 20 items.');
  const items = body['items'].map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['id', 'expectedUpdatedAt'].includes(key)) ||
        typeof value.id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.id)) throw new InvalidApiInput('Invalid batch item.');
    return { id: value.id.toLowerCase(), expectedUpdatedAt: expectedVersion(value.expectedUpdatedAt) };
  }).sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(items.map(item => item.id)).size !== items.length) throw new InvalidApiInput('Duplicate batch item.');
  return { confirmed: true, items, ...(outcome ? { action: body['action'] as 'consume' | 'waste' } : {}) };
}
const categories = ['PRODUCE', 'DAIRY', 'BAKERY', 'SNACKS', 'MEAT', 'FROZEN', 'OTHER'];
export function pantryInput(value: unknown): PantryCreateInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidApiInput('Invalid pantry entry.');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => !['name', 'category', 'quantity', 'unit', 'expiresOn', 'totalCostMinor', 'expirySelection', 'duplicateConfirmation', 'barcode'].includes(key))) throw new InvalidApiInput('Unexpected request field.');
  let barcode: string | undefined;
  if ('barcode' in body) {
    if (typeof body['barcode'] !== 'string' || body['barcode'] !== body['barcode'].trim() || !packageBarcode(body['barcode'])) throw new InvalidApiInput('Invalid retail barcode.');
    barcode = body['barcode'].padStart(14, '0');
  }
  const text = (key: string, max: number) => {
    const value = body[key];
    if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) throw new InvalidApiInput('Invalid text field.');
    const result = value.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!result || result.length > max) throw new InvalidApiInput('Invalid text length.');
    return result;
  };
  if (typeof body['category'] !== 'string' || !categories.includes(body['category'])) throw new InvalidApiInput('Invalid category.');
  let duplicateConfirmation;
  if (body['duplicateConfirmation'] !== undefined) {
    const decision = body['duplicateConfirmation'];
    if (!decision || typeof decision !== 'object' || Array.isArray(decision) ||
        Object.keys(decision).some(key => !['confirmed', 'action'].includes(key)) ||
        (decision as Record<string, unknown>)['confirmed'] !== true || (decision as Record<string, unknown>)['action'] !== 'add_separately') throw new InvalidApiInput('Confirm adding a separate purchase.');
    duplicateConfirmation = { confirmed: true as const, action: 'add_separately' as const };
  }
  let expiry;
  if (body['expirySelection'] !== undefined) {
    try { expiry = resolveExpiry(body['expirySelection']); } catch { throw new InvalidApiInput('Invalid expiry choice.'); }
    if (calendarDate(body['expiresOn'] as string) !== expiry.expiresOn) throw new InvalidApiInput('Expiry does not match its source.');
  }
  return { ...(barcode ? { barcode } : {}), ...(duplicateConfirmation ? { duplicateConfirmation } : {}), ...(expiry ? { expirySelection: expiry.selection } : {}), name: text('name', 120), category: body['category'] as PantryCreateInput['category'],
    quantity: quantityString(body['quantity'] as string), unit: text('unit', 32),
    expiresOn: calendarDate(body['expiresOn'] as string), totalCostMinor: minorAmount(body['totalCostMinor']) };
}
/** Validate and canonicalize a bounded haul before any inventory writes. */
export function receiptInput(value: unknown, importing: true): ReceiptImportInput;
export function receiptInput(value: unknown, importing?: false): ReceiptReviewInput;
export function receiptInput(value: unknown, importing = false): ReceiptReviewInput | ReceiptImportInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidApiInput('Invalid receipt review.');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => !(importing ? ['confirmed', 'items'] : ['items']).includes(key)) ||
      (importing && body['confirmed'] !== true) || !Array.isArray(body['items']) || body['items'].length < 1 || body['items'].length > RECEIPT_MAX_ITEMS) throw new InvalidApiInput(`Review between 1 and ${RECEIPT_MAX_ITEMS} groceries.`);
  const items = body['items'].map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['rowId', 'item'].includes(key)) ||
        typeof value.rowId !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(value.rowId)) throw new InvalidApiInput('Invalid receipt row.');
    const item = pantryInput(value.item);
    if (item.barcode) throw new InvalidApiInput('Receipt rows do not accept barcode identity.');
    if (!importing && item.duplicateConfirmation) throw new InvalidApiInput('Review before confirming separate purchases.');
    return { rowId: value.rowId, item };
  }).sort((a, b) => a.rowId.localeCompare(b.rowId, 'en'));
  if (new Set(items.map(row => row.rowId)).size !== items.length) throw new InvalidApiInput('Repeated receipt row ID.');
  return importing ? { confirmed: true, items } : { items };
}
function view(item: PantryItem, timezone: string, now = new Date()): PantryItemDto {
  const expiresOn = serializeCalendarDate(item.expiresOn);
  return { id: item.id, name: item.name, category: item.category, quantity: quantityString(item.quantity.toString()),
    unit: item.unit, expiresOn, totalCostMinor: item.totalCostMinor, currencyCode: 'INR', status: item.status,
    source: item.source, ...(item.barcode ? { barcode: item.barcode } : {}), expirySource: item.expirySource,
    purchaseDate: item.purchaseDate ? serializeCalendarDate(item.purchaseDate) : null, freshnessPresetDays: item.freshnessPresetDays, ...expiryState(expiresOn, timezone, now),
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
  const mutate = (identity: VerifiedIdentity, id: string, key: string,
    mutation: { action: 'edit'; input: PantryEditInput } | { action: 'consume' | 'waste' | 'restore'; input: PantryOutcomeInput }) => run(async tx => {
    const membership = await member(tx, identity);
    const item = await tx.pantryItem.findFirst({ where: { id, householdId: membership.householdId, archivedAt: null,
      household: { members: { some: { authSubject: identity.id } } } } });
    if (!item) throw new PantryFailure('ITEM_NOT_FOUND');
    const idempotencyKey = `mutation:${key}`;
    const requestHash = createHash('sha256').update(JSON.stringify({ id, ...mutation })).digest('hex');
    const prior = await tx.pantryItemEvent.findUnique({ where: { householdId_idempotencyKey: { householdId: membership.householdId, idempotencyKey } } });
    if (prior) {
      if (prior.pantryItemId !== id || (prior.metadata as { requestHash?: string } | null)?.requestHash !== requestHash) throw new PantryFailure('IDEMPOTENCY_CONFLICT');
      return view(item, membership.household.timezone);
    }
    // Repeating the same confirmed outcome is a no-op even if the first response was lost.
    const target = mutation.action === 'restore' ? 'ACTIVE' : mutation.action === 'consume' ? 'CONSUMED' : 'WASTED';
    if (mutation.action !== 'edit' && item.status === target) return view(item, membership.household.timezone);
    if (mutation.action === 'restore' ? !['CONSUMED', 'WASTED'].includes(item.status) : item.status !== 'ACTIVE') throw new PantryFailure('ITEM_RESOLVED');
    if (utcTimestamp(item.updatedAt) !== mutation.input.expectedUpdatedAt) throw new PantryFailure('ITEM_CHANGED');
    const now = new Date(Math.max(Date.now(), item.updatedAt.getTime() + 1));
    let data: Prisma.PantryItemUpdateInput;
    if (mutation.action === 'edit') {
      const { expectedUpdatedAt: _version, expirySelection, ...fields } = mutation.input;
      const expiry = expirySelection ? resolveExpiry(expirySelection) : null;
      data = { ...fields, normalizedName: fields.name.toLowerCase(), expiresOn: new Date(`${expiry?.expiresOn ?? fields.expiresOn}T00:00:00Z`),
        costSource: fields.totalCostMinor === item.totalCostMinor ? item.costSource : fields.totalCostMinor === null ? 'UNKNOWN' : 'PURCHASE',
        ...(fields.totalCostMinor !== item.totalCostMinor || fields.quantity !== item.quantity.toString() ? { unitCostMinor: null } : {}),
        ...(expiry ? { expirySource: expiry.expirySource, freshnessPresetDays: expiry.freshnessPresetDays,
          purchaseDate: expiry.purchaseDate ? new Date(`${expiry.purchaseDate}T00:00:00Z`) : item.purchaseDate }
          : fields.expiresOn !== serializeCalendarDate(item.expiresOn) ? { expirySource: 'USER_ENTERED', freshnessPresetDays: null } : {}), updatedAt: now };
    } else {
      const transition = planStatusTransition(item.status, mutation.action);
      data = { status: transition.newStatus, statusChangedAt: now, updatedAt: now,
        consumedAt: mutation.action === 'consume' ? now : null, wastedAt: mutation.action === 'waste' ? now : null, assumedConsumedAt: null };
    }
    const changed = await tx.pantryItem.update({ where: { id: item.id, householdId: membership.householdId }, data });
    await tx.pantryItemEvent.create({ data: { householdId: item.householdId, pantryItemId: item.id,
      eventType: mutation.action === 'edit' ? 'EDITED' : 'STATUS_CHANGED', previousStatus: item.status, newStatus: changed.status,
      quantity: changed.quantity, totalCostMinor: changed.totalCostMinor, costSource: changed.costSource, currencyCode: changed.currencyCode,
      category: changed.category, expiresOn: changed.expiresOn, timezone: membership.household.timezone,
      occurredAt: now, source: 'APP', idempotencyKey, metadata: { requestHash, expirySource: changed.expirySource,
        freshnessPresetDays: changed.freshnessPresetDays, purchaseDate: changed.purchaseDate ? serializeCalendarDate(changed.purchaseDate) : null } } });
    return view(changed, membership.household.timezone);
  }, true);
  const batch = (identity: VerifiedIdentity, input: PantryBatchInput, action: 'consume' | 'waste' | 'restore', key: string) => run(async tx => {
    const membership = await member(tx, identity);
    // Canonical order makes a reordered retry identical and reduces concurrent lock-order conflicts.
    const selected = [...input.items].sort((a, b) => a.id.localeCompare(b.id));
    const rows = await tx.pantryItem.findMany({ where: { id: { in: selected.map(item => item.id) }, householdId: membership.householdId,
      archivedAt: null, household: { members: { some: { authSubject: identity.id } } } }, orderBy: { id: 'asc' } });
    if (rows.length !== selected.length) throw new PantryFailure('ITEM_NOT_FOUND');
    const requestHash = createHash('sha256').update(JSON.stringify({ action, items: selected, confirmed: true })).digest('hex');
    const keys = selected.map((_item, index) => `batch:${key}:${index}`);
    const prior = await tx.pantryItemEvent.findMany({ where: { householdId: membership.householdId, idempotencyKey: { in: keys } } });
    if (prior.length) {
      if (prior.length !== selected.length || selected.some((item, index) => !prior.some(event => event.idempotencyKey === keys[index] &&
          event.pantryItemId === item.id && (event.metadata as { requestHash?: string } | null)?.requestHash === requestHash))) throw new PantryFailure('IDEMPOTENCY_CONFLICT');
      return rows.map(row => view(row, membership.household.timezone));
    }
    for (const item of rows) {
      if (action === 'restore' ? !['CONSUMED', 'WASTED'].includes(item.status) : item.status !== 'ACTIVE') throw new PantryFailure('ITEM_RESOLVED');
      if (utcTimestamp(item.updatedAt) !== selected.find(entry => entry.id === item.id)!.expectedUpdatedAt) throw new PantryFailure('ITEM_CHANGED');
    }
    const result: PantryItemDto[] = [];
    for (const [index, item] of rows.entries()) {
      const transition = planStatusTransition(item.status, action);
      const now = new Date(Math.max(Date.now(), item.updatedAt.getTime() + 1));
      const changed = await tx.pantryItem.update({ where: { id: item.id, householdId: membership.householdId }, data: {
        status: transition.newStatus, statusChangedAt: now, updatedAt: now, consumedAt: action === 'consume' ? now : null,
        wastedAt: action === 'waste' ? now : null, assumedConsumedAt: null,
      } });
      await tx.pantryItemEvent.create({ data: { householdId: item.householdId, pantryItemId: item.id,
        eventType: 'STATUS_CHANGED', previousStatus: item.status, newStatus: changed.status, quantity: changed.quantity,
        totalCostMinor: changed.totalCostMinor, costSource: changed.costSource, currencyCode: changed.currencyCode,
        category: changed.category, expiresOn: changed.expiresOn, timezone: membership.household.timezone,
        occurredAt: now, source: 'APP', idempotencyKey: keys[index], metadata: { requestHash } } });
      result.push(view(changed, membership.household.timezone));
    }
    return result;
  }, true);
  const duplicateWhere = (identity: VerifiedIdentity, householdId: string, input: PantryCreateInput): Prisma.PantryItemWhereInput => ({
    householdId, household: { members: { some: { authSubject: identity.id } } }, status: 'ACTIVE', archivedAt: null,
    ...(input.barcode ? { OR: [{ barcode: input.barcode }, { normalizedName: input.name.toLowerCase(), category: input.category,
      expiresOn: new Date(`${input.expiresOn}T00:00:00Z`) }] } : { normalizedName: input.name.toLowerCase(), category: input.category,
      expiresOn: new Date(`${input.expiresOn}T00:00:00Z`) }),
  });
  const receiptMatches = async (tx: Prisma.TransactionClient, identity: VerifiedIdentity, householdId: string, timezone: string, input: ReceiptReviewInput, includeMatches = true): Promise<ReceiptDuplicateRow[]> => {
    const rows: ReceiptDuplicateRow[] = [];
    // Count all requested identities in one scoped read. New hauls should not require
    // two database round trips per grocery before their transactional writes begin.
    const grouped = await tx.pantryItem.groupBy({ by: ['normalizedName', 'category', 'expiresOn'],
      where: { householdId, household: { members: { some: { authSubject: identity.id } } }, status: 'ACTIVE', archivedAt: null,
        OR: input.items.map(row => ({ normalizedName: row.item.name.toLowerCase(), category: row.item.category,
          expiresOn: new Date(`${row.item.expiresOn}T00:00:00Z`) })) }, _count: { _all: true } });
    const matchKey = (name: string, category: string, expiresOn: string) => JSON.stringify([name, category, expiresOn]);
    const totals = new Map(grouped.map(row => [matchKey(row.normalizedName, row.category, serializeCalendarDate(row.expiresOn)), row._count._all]));
    for (const row of input.items) {
      const where = duplicateWhere(identity, householdId, row.item);
      const total = totals.get(matchKey(row.item.name.toLowerCase(), row.item.category, row.item.expiresOn)) ?? 0;
      const matches = total && includeMatches ? await tx.pantryItem.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 5 }) : [];
      rows.push({ rowId: row.rowId, total, matches: matches.map(item => view(item, timezone)),
        withinHaul: input.items.filter(other => other.rowId !== row.rowId && other.item.name.toLowerCase() === row.item.name.toLowerCase() &&
          other.item.category === row.item.category && other.item.expiresOn === row.item.expiresOn).map(other => other.rowId) });
    }
    return rows;
  };
  const receiptReview = (identity: VerifiedIdentity, value: ReceiptReviewInput) => {
    const input = receiptInput(value);
    return run(async tx => {
      const membership = await member(tx, identity);
      return { rows: await receiptMatches(tx, identity, membership.householdId, membership.household.timezone, input) };
    });
  };
  const receiptImport = (identity: VerifiedIdentity, value: ReceiptImportInput, key: string) => {
    const input = receiptInput(value, true);
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw new InvalidApiInput('Invalid receipt retry key.');
    return run(async tx => {
      const membership = await member(tx, identity);
      const prefix = `receipt:${key}:`;
      const requestHash = createHash('sha256').update(JSON.stringify({ subject: identity.id, input })).digest('hex');
      // Cardinality and hashes protect changed-payload retries, including removed/added rows.
      const prior = await tx.pantryItemEvent.findMany({ where: { householdId: membership.householdId, idempotencyKey: { in: Array.from({ length: RECEIPT_MAX_ITEMS }, (_unused, index) => `${prefix}${index}`) } }, include: { pantryItem: true } });
      if (prior.length) {
        const receiptScanId = prior[0]!.pantryItem.receiptScanId;
        if (!receiptScanId || prior.length !== input.items.length || input.items.some((row, index) => !prior.some(event =>
          event.idempotencyKey === `${prefix}${index}` && event.pantryItem.receiptScanId === receiptScanId &&
          (event.metadata as { requestHash?: string; rowId?: string } | null)?.requestHash === requestHash &&
          (event.metadata as { rowId?: string } | null)?.rowId === row.rowId))) throw new PantryFailure('IDEMPOTENCY_CONFLICT');
        return { receiptScanId, replayed: true, items: input.items.map((_row, index) => view(prior.find(event => event.idempotencyKey === `${prefix}${index}`)!.pantryItem, membership.household.timezone)) };
      }
      const duplicates = await receiptMatches(tx, identity, membership.householdId, membership.household.timezone, input, false);
      if (duplicates.some(row => (row.total > 0 || row.withinHaul.length > 0) && !input.items.find(item => item.rowId === row.rowId)!.item.duplicateConfirmation)) throw new PantryFailure('PANTRY_DUPLICATE');
      const receipt = await tx.receiptScan.create({ data: { householdId: membership.householdId, createdByAuthSubject: identity.id, status: 'IMPORTED', importedAt: new Date() } });
      // Preassigned IDs keep canonical row/event associations independent of database
      // return order. Bulk writes avoid two network round trips per receipt grocery.
      const entries = input.items.map((row, index) => ({ row, index, id: randomUUID() }));
      const created = await tx.pantryItem.createManyAndReturn({ data: entries.map(({ row, id }) => {
        const { expirySelection, duplicateConfirmation: _confirmation, ...fields } = row.item;
        const expiry = expirySelection ? resolveExpiry(expirySelection) : null;
        return { ...fields, id, householdId: membership.householdId, normalizedName: fields.name.toLowerCase(),
          expiresOn: new Date(`${fields.expiresOn}T00:00:00Z`), expirySource: expiry?.expirySource ?? 'USER_ENTERED',
          purchaseDate: expiry?.purchaseDate ? new Date(`${expiry.purchaseDate}T00:00:00Z`) : null, freshnessPresetDays: expiry?.freshnessPresetDays ?? null,
          costSource: fields.totalCostMinor === null ? 'UNKNOWN' : 'PURCHASE', currencyCode: 'INR', source: 'RECEIPT', receiptScanId: receipt.id };
      }) });
      const byId = new Map(created.map(item => [item.id, item]));
      const ordered = entries.map(entry => {
        const item = byId.get(entry.id);
        if (!item) throw new PantryFailure('PANTRY_UNAVAILABLE');
        return { ...entry, item };
      });
      await tx.pantryItemEvent.createMany({ data: ordered.map(({ row, index, item }) => ({
        householdId: membership.householdId, pantryItemId: item.id,
        eventType: 'CREATED', previousStatus: null, newStatus: 'ACTIVE', quantity: item.quantity, totalCostMinor: item.totalCostMinor,
        costSource: item.costSource, currencyCode: item.currencyCode, category: item.category, expiresOn: item.expiresOn, timezone: membership.household.timezone,
        source: 'APP', idempotencyKey: `${prefix}${index}`, metadata: { requestHash, rowId: row.rowId, duplicateConfirmed: !!row.item.duplicateConfirmation,
          expirySource: item.expirySource, receiptScanId: receipt.id },
      })) });
      return { receiptScanId: receipt.id, items: ordered.map(({ item }) => view(item, membership.household.timezone)), replayed: false };
    }, true);
  };
  return {
    receiptReview, receiptImport,
    duplicates: (identity: VerifiedIdentity, input: PantryCreateInput) => run(async tx => {
      const membership = await member(tx, identity);
      const where = duplicateWhere(identity, membership.householdId, input);
      const total = await tx.pantryItem.count({ where });
      const matches = await tx.pantryItem.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 5 });
      return { total, matches: matches.map(item => view(item, membership.household.timezone)) };
    }),
    undo: (identity: VerifiedIdentity, id: string, input: PantryOutcomeInput, key: string) => mutate(identity, id, key, { action: 'restore', input }),
    batch,
    edit: (identity: VerifiedIdentity, id: string, input: PantryEditInput, key: string) => mutate(identity, id, key, { action: 'edit', input }),
    outcome: (identity: VerifiedIdentity, id: string, action: 'consume' | 'waste', input: PantryOutcomeInput, key: string) => mutate(identity, id, key, { action, input }),
    list: (identity: VerifiedIdentity, pagination: Pagination, filters: PantryListFilters = {}) => run(async tx => {
      const membership = await member(tx, identity);
      const scope = { householdId: membership.householdId, status: 'ACTIVE' as const, archivedAt: null,
        household: { members: { some: { authSubject: identity.id } } } };
      const now = new Date();
      const where = { ...scope, ...pantryListWhere(filters, membership.household.timezone, now) };
      const total = await tx.pantryItem.count({ where });
      const counts = await tx.pantryItem.groupBy({ by: ['category'], where: scope, _count: { _all: true } });
      const inventory = { active: counts.reduce((sum, row) => sum + row._count._all, 0),
        categories: Object.fromEntries(counts.map(row => [row.category, row._count._all])) };
      const skip = paginationOffset(pagination);
      let rows: PantryItem[];
      if (filters.sort === 'category') {
        const matching = filters.q || filters.category || filters.freshness
          ? await tx.pantryItem.groupBy({ by: ['category'], where, _count: { _all: true } }) : counts;
        const windows = categoryPageWindows(matching.map(row => ({ category: row.category, count: row._count._all })), skip, pagination.pageSize);
        rows = [];
        for (const window of windows) rows.push(...await tx.pantryItem.findMany({
          where: { ...where, category: window.category }, orderBy: pantryListOrder('name'), skip: window.skip, take: window.take }));
      } else rows = await tx.pantryItem.findMany({ where, orderBy: pantryListOrder(filters.sort), skip, take: pagination.pageSize });
      return { items: rows.map(row => view(row, membership.household.timezone, now)), pagination: pageInfo(pagination, total), inventory };
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
      const existing = await tx.pantryItem.findFirst({ where: duplicateWhere(identity, membership.householdId, input), select: { id: true } });
      if (existing && !input.duplicateConfirmation) throw new PantryFailure('PANTRY_DUPLICATE');
      const { expirySelection, duplicateConfirmation, ...fields } = input;
      const expiry = expirySelection ? resolveExpiry(expirySelection) : null;
      const item = await tx.pantryItem.create({ data: { ...fields,
        freshnessPresetDays: expiry?.freshnessPresetDays ?? null, purchaseDate: expiry?.purchaseDate ? new Date(`${expiry.purchaseDate}T00:00:00Z`) : null, expiresOn: new Date(`${expiry?.expiresOn ?? input.expiresOn}T00:00:00Z`),
        householdId: membership.householdId, normalizedName: input.name.toLowerCase(), expirySource: expiry?.expirySource ?? 'USER_ENTERED',
        costSource: input.totalCostMinor === null ? 'UNKNOWN' : 'PURCHASE', currencyCode: 'INR', source: input.barcode ? 'BARCODE' : 'MANUAL' } });
      await tx.pantryItemEvent.create({ data: { householdId: membership.householdId, pantryItemId: item.id,
        eventType: 'CREATED', previousStatus: null, newStatus: 'ACTIVE', quantity: item.quantity,
        totalCostMinor: item.totalCostMinor, costSource: item.costSource, currencyCode: item.currencyCode,
        category: item.category, expiresOn: item.expiresOn, timezone: membership.household.timezone,
        source: 'APP', idempotencyKey, metadata: { requestHash: fingerprint, ...(input.barcode ? { barcode: input.barcode, entrySource: 'BARCODE' } : {}), duplicateConfirmed: !!duplicateConfirmation, duplicateMatched: !!existing, expirySource: item.expirySource,
          freshnessPresetDays: item.freshnessPresetDays, purchaseDate: item.purchaseDate ? serializeCalendarDate(item.purchaseDate) : null } } });
      return view(item, membership.household.timezone);
    }, true),
  };
}
export type PantryService = ReturnType<typeof createPantryService>;
