/** Shared mobile/server receipt bounds. Pantry outcome batches have a separate limit. */
export const RECEIPT_MAX_ITEMS = 50;
/** 400-code-point chunks remain below SecureStore's conservative per-value budget. */
export const RECEIPT_RETRY_MAX_CHUNKS = 160;
