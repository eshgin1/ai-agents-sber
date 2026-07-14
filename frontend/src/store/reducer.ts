import type {
  Obligation,
  Payment,
  RenewalAlert,
  SseConnectionStatus,
} from '@/types';
import { computeMonthlyTotals, daysUntil } from '@/utils/dates';

export interface AppState {
  obligations: Obligation[];
  renewalAlerts: RenewalAlert[];
  selectedId: string | null;
  payments: Payment[];
  paymentsLoading: boolean;
  category: string;
  query: string;
  sseStatus: SseConnectionStatus;
  loading: boolean;
  error: string | null;
  exitingIds: string[];
  payingSuccessId: string | null;
  optimisticBackup: Obligation | null;
}

export type AppAction =
  | { type: 'LOAD_START' }
  | {
      type: 'LOAD_SUCCESS';
      obligations: Obligation[];
      renewalAlerts: RenewalAlert[];
    }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'SET_FILTERS'; category: string; query: string }
  | { type: 'SELECT'; id: string | null }
  | { type: 'PAYMENTS_START' }
  | { type: 'PAYMENTS_SUCCESS'; payments: Payment[] }
  | { type: 'PAYMENTS_ERROR' }
  | { type: 'SSE_STATUS'; status: SseConnectionStatus }
  | { type: 'OBLIGATION_CREATED'; obligation: Obligation }
  | { type: 'OBLIGATION_UPDATED'; obligation: Obligation }
  | { type: 'OBLIGATION_DELETE_START'; id: string }
  | { type: 'OBLIGATION_DELETE_ABORT'; id: string }
  | { type: 'OBLIGATION_DELETED'; id: string }
  | { type: 'PAYMENT_RECORDED'; payment: Payment }
  | { type: 'OPTIMISTIC_PAY'; obligation: Obligation; backup: Obligation }
  | { type: 'PAY_SUCCESS'; obligation: Obligation }
  | { type: 'PAY_ROLLBACK' }
  | { type: 'CLEAR_PAY_SUCCESS' }
  | { type: 'CANCEL_SUCCESS'; obligation: Obligation };

export const initialState: AppState = {
  obligations: [],
  renewalAlerts: [],
  selectedId: null,
  payments: [],
  paymentsLoading: false,
  category: '',
  query: '',
  sseStatus: 'reconnecting',
  loading: true,
  error: null,
  exitingIds: [],
  payingSuccessId: null,
  optimisticBackup: null,
};

/** Mirrors GET /obligations/upcoming renewal_alerts rules */
export function buildRenewalAlerts(obligations: Obligation[]): RenewalAlert[] {
  return obligations
    .filter((o) => {
      if (o.status !== 'active') return false;
      if (o.category !== 'subscription' || o.recurrence == null) return false;
      const days = daysUntil(o.next_payment_date);
      return days >= 0 && days <= 7;
    })
    .map((o) => ({
      id: o.id,
      title: o.title,
      next_payment_date: o.next_payment_date,
      amount: o.amount,
      currency: o.currency,
    }))
    .sort((a, b) => a.next_payment_date.localeCompare(b.next_payment_date));
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        loading: false,
        obligations: action.obligations,
        renewalAlerts:
          action.renewalAlerts.length > 0
            ? action.renewalAlerts
            : buildRenewalAlerts(action.obligations),
      };

    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.error };

    case 'SET_FILTERS':
      return { ...state, category: action.category, query: action.query };

    case 'SELECT':
      return {
        ...state,
        selectedId: action.id,
        payments: action.id === state.selectedId ? state.payments : [],
      };

    case 'PAYMENTS_START':
      return { ...state, paymentsLoading: true };

    case 'PAYMENTS_SUCCESS':
      return { ...state, paymentsLoading: false, payments: action.payments };

    case 'PAYMENTS_ERROR':
      return { ...state, paymentsLoading: false };

    case 'SSE_STATUS':
      return { ...state, sseStatus: action.status };

    case 'OBLIGATION_CREATED': {
      if (state.obligations.some((o) => o.id === action.obligation.id)) {
        return state;
      }
      const obligations = [...state.obligations, action.obligation].sort(
        (a, b) => a.next_payment_date.localeCompare(b.next_payment_date),
      );
      return {
        ...state,
        obligations,
        renewalAlerts: buildRenewalAlerts(obligations),
      };
    }

    case 'OBLIGATION_UPDATED': {
      const obligations = state.obligations
        .map((o) => (o.id === action.obligation.id ? action.obligation : o))
        .sort((a, b) => a.next_payment_date.localeCompare(b.next_payment_date));
      return {
        ...state,
        obligations,
        renewalAlerts: buildRenewalAlerts(obligations),
        payingSuccessId: null,
        optimisticBackup: null,
      };
    }

    case 'OBLIGATION_DELETE_START':
      return {
        ...state,
        exitingIds: state.exitingIds.includes(action.id)
          ? state.exitingIds
          : [...state.exitingIds, action.id],
      };

    case 'OBLIGATION_DELETE_ABORT':
      return {
        ...state,
        exitingIds: state.exitingIds.filter((id) => id !== action.id),
      };

    case 'OBLIGATION_DELETED': {
      const obligations = state.obligations.filter((o) => o.id !== action.id);
      return {
        ...state,
        obligations,
        renewalAlerts: buildRenewalAlerts(obligations),
        exitingIds: state.exitingIds.filter((id) => id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    }

    case 'PAYMENT_RECORDED': {
      if (state.selectedId !== action.payment.obligation_id) return state;
      if (state.payments.some((p) => p.id === action.payment.id)) return state;
      const payments = [action.payment, ...state.payments].sort((a, b) =>
        b.paid_at.localeCompare(a.paid_at),
      );
      return { ...state, payments };
    }

    case 'OPTIMISTIC_PAY': {
      const obligations = state.obligations.map((o) =>
        o.id === action.obligation.id ? action.obligation : o,
      );
      return {
        ...state,
        obligations,
        renewalAlerts: buildRenewalAlerts(obligations),
        optimisticBackup: action.backup,
        payingSuccessId: action.obligation.id,
      };
    }

    case 'PAY_SUCCESS': {
      const obligations = state.obligations
        .map((o) => (o.id === action.obligation.id ? action.obligation : o))
        .sort((a, b) => a.next_payment_date.localeCompare(b.next_payment_date));
      return {
        ...state,
        obligations,
        renewalAlerts: buildRenewalAlerts(obligations),
        optimisticBackup: null,
      };
    }

    case 'PAY_ROLLBACK': {
      if (!state.optimisticBackup) return state;
      const backup = state.optimisticBackup;
      const obligations = state.obligations.map((o) =>
        o.id === backup.id ? backup : o,
      );
      return {
        ...state,
        obligations,
        renewalAlerts: buildRenewalAlerts(obligations),
        optimisticBackup: null,
        payingSuccessId: null,
      };
    }

    case 'CLEAR_PAY_SUCCESS':
      return { ...state, payingSuccessId: null };

    case 'CANCEL_SUCCESS': {
      const obligations = state.obligations.map((o) =>
        o.id === action.obligation.id ? action.obligation : o,
      );
      return {
        ...state,
        obligations,
        renewalAlerts: buildRenewalAlerts(obligations),
      };
    }

    default:
      return state;
  }
}

export function filterObligations(
  obligations: Obligation[],
  category: string,
  query: string,
): Obligation[] {
  const q = query.trim().toLowerCase();
  return obligations
    .filter((o) => {
      if (category && o.category !== category) return false;
      if (q && !o.title.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => a.next_payment_date.localeCompare(b.next_payment_date));
}

export { computeMonthlyTotals };
