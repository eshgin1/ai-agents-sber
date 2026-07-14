import type { Obligation, PayResponse, Payment, UpcomingResponse } from '@/types';
import { apiUrl } from '@/config';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getObligations: (params?: { category?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString();
    return request<Obligation[]>(`/obligations${qs ? `?${qs}` : ''}`);
  },

  getUpcoming: (days = 7) =>
    request<UpcomingResponse>(`/obligations/upcoming?days=${days}`),

  getPayments: (id: string) =>
    request<Payment[]>(`/obligations/${id}/payments`),

  pay: (id: string) =>
    request<PayResponse>(`/obligations/${id}/pay`, { method: 'POST' }),

  cancel: (id: string) =>
    request<Obligation>(`/obligations/${id}/cancel`, { method: 'PATCH' }),

  remove: (id: string) =>
    request<void>(`/obligations/${id}`, { method: 'DELETE' }),
};
