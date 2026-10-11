import type { Request, Response } from 'express';
import type { ApiSuccess, ApiFailure, Pagination, PageInfo } from '../contracts/api';

export function success<T>(data: T): ApiSuccess<T> { return { data }; }

/** Only safe server-owned messages belong here; never pass raw provider/driver errors. */
export function sendFailure(req: Request, res: Response, status: number, code: string, message: string): void {
  const response: ApiFailure = { error: { code, message, requestId: String(req.headers['x-request-id']) } };
  res.status(status).json(response);
}

export class InvalidApiInput extends Error {
  constructor(message: string) { super(message); this.name = 'InvalidApiInput'; }
}

function positiveInteger(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d{0,6}$/.test(value)) throw new InvalidApiInput('Invalid pagination.');
  const parsed = Number(value);
  if (parsed > max) throw new InvalidApiInput('Invalid pagination.');
  return parsed;
}

/** Raw query parsing rejects duplicates/nested fields before Express can normalize them away. */
export function parsePagination(query: URLSearchParams): Pagination {
  for (const key of query.keys()) {
    if (!['page', 'pageSize'].includes(key) || query.getAll(key).length !== 1) throw new InvalidApiInput('Invalid pagination.');
  }
  return { page: positiveInteger(query.get('page') ?? undefined, 1, 100_000),
    pageSize: positiveInteger(query.get('pageSize') ?? undefined, 20, 100) };
}

export function paginationOffset({ page, pageSize }: Pagination): number {
  // Also validate internal callers, rather than trusting a cast to Pagination.
  if (!Number.isInteger(page) || page < 1 || page > 100_000 ||
      !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new InvalidApiInput('Invalid pagination.');
  return (page - 1) * pageSize;
}

export function pageInfo(pagination: Pagination, total: number): PageInfo {
  paginationOffset(pagination);
  if (!Number.isSafeInteger(total) || total < 0) throw new InvalidApiInput('Invalid total count.');
  const totalPages = Math.ceil(total / pagination.pageSize);
  return { ...pagination, total, totalPages, hasNextPage: pagination.page < totalPages };
}
