import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Dispatch } from 'react';
import { api } from '@/api/client';
import type { AppAction, AppState } from '@/store/reducer';
import { filterObligations } from '@/store/reducer';
import { addRecurrence, computeMonthlyTotals } from '@/utils/dates';
import type { Obligation } from '@/types';

export function useUrlFilters(dispatch: Dispatch<AppAction>, state: AppState) {
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const category = params.get('category') ?? '';
    const query = params.get('q') ?? '';
    if (category !== state.category || query !== state.query) {
      dispatch({ type: 'SET_FILTERS', category, query });
    }
    // Sync URL → state on mount / external URL change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, dispatch]);

  const setFilters = useCallback(
    (category: string, query: string) => {
      dispatch({ type: 'SET_FILTERS', category, query });
      const next = new URLSearchParams();
      if (category) next.set('category', category);
      if (query) next.set('q', query);
      setParams(next, { replace: true });
    },
    [dispatch, setParams],
  );

  const resetFilters = useCallback(() => {
    setFilters('', '');
  }, [setFilters]);

  return { setFilters, resetFilters };
}

export function useFilteredView(state: AppState) {
  const filtered = useMemo(
    () => filterObligations(state.obligations, state.category, state.query),
    [state.obligations, state.category, state.query],
  );

  const totals = useMemo(() => {
    const hasFilters = Boolean(state.category || state.query.trim());
    return computeMonthlyTotals(hasFilters ? filtered : state.obligations);
  }, [state.category, state.query, state.obligations, filtered]);

  return { filtered, totals };
}

export function useLoadDashboard(dispatch: Dispatch<AppAction>) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      dispatch({ type: 'LOAD_START' });
      try {
        const [obligations, upcoming] = await Promise.all([
          api.getObligations(),
          api.getUpcoming(7),
        ]);
        if (cancelled) return;
        dispatch({
          type: 'LOAD_SUCCESS',
          obligations,
          renewalAlerts: upcoming.renewal_alerts,
        });
      } catch (e) {
        if (cancelled) return;
        dispatch({
          type: 'LOAD_ERROR',
          error: e instanceof Error ? e.message : 'Ошибка загрузки',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);
}

/** Optimistic next state after pay — mirrors backend recurrence rules */
export function buildOptimisticPay(o: Obligation): Obligation {
  const next = addRecurrence(o.next_payment_date, o.recurrence);
  if (!next) {
    return { ...o, status: 'cancelled' };
  }
  return { ...o, next_payment_date: next, status: 'active' };
}
