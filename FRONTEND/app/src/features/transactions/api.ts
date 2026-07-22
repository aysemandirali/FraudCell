import { api, fetchData, fetchPage } from '@/shared/api/client';
import type {
  CreateTransactionBody,
  CreateTransactionResponse,
  CursorPage,
  ListTransactionsQuery,
  TransactionDetailResponse,
  TransactionListItemResponse,
} from '@/shared/api/contract';
import { endpoints } from '@/shared/api/endpoints';

export function listTransactions(
  query: ListTransactionsQuery = {},
): Promise<CursorPage<TransactionListItemResponse>> {
  return fetchPage(endpoints.transactions.root, { query: { ...query } });
}

export function getTransaction(transactionId: string): Promise<TransactionDetailResponse> {
  return fetchData(endpoints.transactions.byId(transactionId));
}

export async function createTransaction(
  body: CreateTransactionBody,
  idempotencyKey: string,
): Promise<CreateTransactionResponse> {
  const result = await api.post<CreateTransactionResponse>(endpoints.transactions.root, {
    body,
    idempotencyKey,
  });
  return result.data;
}
