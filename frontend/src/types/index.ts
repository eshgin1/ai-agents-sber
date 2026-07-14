export type ObligationCategory =
  | 'subscription'
  | 'insurance'
  | 'warranty'
  | 'bill';

export type ObligationStatus = 'active' | 'cancelled' | 'expired';

export type Recurrence = 'monthly' | 'quarterly' | 'yearly' | null;

export interface Obligation {
  id: string;
  title: string;
  category: ObligationCategory;
  amount: number;
  currency: string;
  next_payment_date: string;
  status: ObligationStatus;
  recurrence: Recurrence;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  obligation_id: string;
  amount: number;
  currency: string;
  paid_at: string;
}

/** Shape returned by GET /obligations/upcoming */
export interface RenewalAlert {
  id: string;
  title: string;
  next_payment_date: string;
  amount: number;
  currency: string;
}

export interface UpcomingResponse {
  obligations: Obligation[];
  totals: Record<string, number>;
  renewal_alerts: RenewalAlert[];
}

export interface PayResponse {
  obligation: Obligation;
  payment: Payment;
}

export type SseConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export type SseEvent =
  | { type: 'obligation_created'; obligation: Obligation }
  | { type: 'obligation_updated'; obligation: Obligation }
  | { type: 'obligation_deleted'; id: string }
  | { type: 'payment_recorded'; obligation_id: string; payment: Payment };

export const CATEGORY_LABELS: Record<ObligationCategory, string> = {
  subscription: 'Подписка',
  insurance: 'Страховка',
  warranty: 'Гарантия',
  bill: 'Счёт',
};

export const STATUS_LABELS: Record<ObligationStatus, string> = {
  active: 'Активно',
  cancelled: 'Отменено',
  expired: 'Истекло',
};
