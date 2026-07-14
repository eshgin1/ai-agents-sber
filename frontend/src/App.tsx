import type { Dispatch } from 'react';
import type { AppAction, AppState } from '@/store/reducer';
import {
  buildOptimisticPay,
  useFilteredView,
  useLoadDashboard,
  useUrlFilters,
} from '@/hooks/useDashboard';
import { useSSE } from '@/hooks/useSSE';
import { Header } from '@/components/Header';
import { Filters } from '@/components/Filters';
import { UpcomingSection } from '@/components/UpcomingSection';
import { ObligationList } from '@/components/ObligationList';
import { DetailPanel } from '@/components/DetailPanel';
import { Footer } from '@/components/Footer';
import { api } from '@/api/client';
import { daysUntil, formatMonthlyTotals } from '@/utils/dates';

interface Props {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

export default function App({ state, dispatch }: Props) {
  useLoadDashboard(dispatch);
  useSSE(dispatch);
  const { setFilters, resetFilters } = useUrlFilters(dispatch, state);
  const { filtered, totals } = useFilteredView(state);

  const selected = state.obligations.find((o) => o.id === state.selectedId) ?? null;

  const visibleAlerts = state.renewalAlerts.filter((a) => {
    const ob = state.obligations.find((o) => o.id === a.id);
    if (!ob || ob.status !== 'active') return false;
    if (state.category && state.category !== 'subscription') return false;
    if (
      state.query.trim() &&
      !a.title.toLowerCase().includes(state.query.trim().toLowerCase())
    ) {
      return false;
    }
    const days = daysUntil(a.next_payment_date);
    return days >= 0 && days <= 7;
  });

  const handleCancel = async (id: string) => {
    const current = state.obligations.find((o) => o.id === id);
    if (!current || current.status !== 'active') return;

    const optimistic = { ...current, status: 'cancelled' as const };
    dispatch({ type: 'CANCEL_SUCCESS', obligation: optimistic });

    try {
      const updated = await api.cancel(id);
      dispatch({ type: 'CANCEL_SUCCESS', obligation: updated });
    } catch (e) {
      dispatch({ type: 'CANCEL_SUCCESS', obligation: current });
      const msg = e instanceof Error ? e.message : 'Не удалось отменить обязательство';
      if (/status ['"]cancelled['"]/i.test(msg)) return;
      alert(msg);
    }
  };

  const handlePay = async (id: string) => {
    const current = state.obligations.find((o) => o.id === id);
    if (!current) return;
    const optimistic = buildOptimisticPay(current);
    dispatch({ type: 'OPTIMISTIC_PAY', obligation: optimistic, backup: current });
    try {
      const { obligation, payment } = await api.pay(id);
      dispatch({ type: 'PAY_SUCCESS', obligation });
      dispatch({ type: 'PAYMENT_RECORDED', payment });
      setTimeout(() => dispatch({ type: 'CLEAR_PAY_SUCCESS' }), 900);
    } catch (e) {
      dispatch({ type: 'PAY_ROLLBACK' });
      alert(e instanceof Error ? e.message : 'Оплата не прошла — изменения откатены');
    }
  };

  const handleDelete = async (id: string) => {
    dispatch({ type: 'OBLIGATION_DELETE_START', id });
    try {
      await api.remove(id);
      setTimeout(() => {
        dispatch({ type: 'OBLIGATION_DELETED', id });
      }, 280);
    } catch (e) {
      dispatch({ type: 'OBLIGATION_DELETE_ABORT', id });
      alert(e instanceof Error ? e.message : 'Не удалось удалить');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Header
          totalsLabel={formatMonthlyTotals(totals)}
          sseStatus={state.sseStatus}
        />

        <Filters
          category={state.category}
          query={state.query}
          onChange={setFilters}
          onReset={resetFilters}
        />

        {state.loading && (
          <p className="mt-10 text-center text-ink-muted">Загрузка обязательств…</p>
        )}

        {state.error && (
          <p className="mt-10 rounded-lg border border-urgent/30 bg-urgent-soft px-4 py-3 text-urgent">
            {state.error}
          </p>
        )}

        {!state.loading && !state.error && (
          <>
            <UpcomingSection
              alerts={visibleAlerts}
              onCancel={handleCancel}
              onOpen={(id) => dispatch({ type: 'SELECT', id })}
            />

            <ObligationList
              obligations={filtered}
              exitingIds={state.exitingIds}
              payingSuccessId={state.payingSuccessId}
              onOpen={(id) => dispatch({ type: 'SELECT', id })}
            />
          </>
        )}
      </main>

      <Footer />

      {selected && (
        <DetailPanel
          obligation={selected}
          payments={state.payments}
          paymentsLoading={state.paymentsLoading}
          payingSuccess={state.payingSuccessId === selected.id}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'SELECT', id: null })}
          onPay={handlePay}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
