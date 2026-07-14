import { useEffect, useState, type Dispatch } from 'react';
import type { Obligation, Payment } from '@/types';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/types';
import type { AppAction } from '@/store/reducer';
import { api } from '@/api/client';
import {
  addRecurrence,
  formatDate,
  formatMoney,
  formatShortDate,
  recurrenceLabel,
} from '@/utils/dates';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Props {
  obligation: Obligation;
  payments: Payment[];
  paymentsLoading: boolean;
  payingSuccess: boolean;
  dispatch: Dispatch<AppAction>;
  onClose: () => void;
  onPay: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type Tab = 'details' | 'history';
type Dialog = 'pay' | 'delete' | null;

export function DetailPanel({
  obligation: o,
  payments,
  paymentsLoading,
  payingSuccess,
  dispatch,
  onClose,
  onPay,
  onCancel,
  onDelete,
}: Props) {
  const [tab, setTab] = useState<Tab>('details');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTab('details');
    setDialog(null);
  }, [o.id]);

  useEffect(() => {
    if (tab !== 'history') return;
    let cancelled = false;
    (async () => {
      dispatch({ type: 'PAYMENTS_START' });
      try {
        const list = await api.getPayments(o.id);
        if (!cancelled) dispatch({ type: 'PAYMENTS_SUCCESS', payments: list });
      } catch {
        if (!cancelled) dispatch({ type: 'PAYMENTS_ERROR' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, o.id, dispatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dialog) setDialog(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, onClose]);

  const nextAfterPay = addRecurrence(o.next_payment_date, o.recurrence);
  const payConfirmText = nextAfterPay
    ? `Следующее списание: ${formatDate(nextAfterPay)} · ${formatMoney(o.amount, o.currency)}`
    : 'После оплаты обязательство будет закрыто';

  const runPay = async () => {
    setBusy(true);
    try {
      await onPay(o.id);
      setDialog(null);
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    setBusy(true);
    try {
      await onDelete(o.id);
      setDialog(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        className="overlay-enter absolute inset-0 bg-ink/40"
        aria-label="Закрыть"
        onClick={onClose}
      />

      <aside className="panel-enter relative z-10 flex h-full w-full max-w-md flex-col bg-surface-elevated shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              {CATEGORY_LABELS[o.category] ?? o.category}
            </p>
            <h2 className="mt-1 font-display text-2xl text-ink">{o.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-ink-muted transition hover:bg-border/50 hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b border-border px-5 pt-3">
          {(
            [
              ['details', 'Детали'],
              ['history', 'История платежей'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 pb-2.5 text-sm font-medium transition ${
                tab === id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={`flex-1 overflow-y-auto px-5 py-5 ${payingSuccess ? 'pay-success' : ''}`}>
          {tab === 'details' ? (
            <div className="space-y-5">
              <dl className="space-y-3 text-sm">
                <Row label="Сумма" value={formatMoney(o.amount, o.currency)} />
                <Row label="Следующий платёж" value={formatDate(o.next_payment_date)} />
                <Row label="Статус" value={STATUS_LABELS[o.status] ?? o.status} />
                <Row label="Повторение" value={recurrenceLabel(o.recurrence)} />
              </dl>

              <div className="flex flex-col gap-2 pt-2">
                {o.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => setDialog('pay')}
                    className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
                  >
                    Оплатить
                  </button>
                )}
                {o.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => onCancel(o.id)}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-border/40"
                  >
                    Отменить
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDialog('delete')}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-urgent transition hover:bg-urgent-soft"
                >
                  Удалить
                </button>
              </div>

              {payingSuccess && (
                <p className="text-center text-sm font-medium text-sse-ok">
                  ✓ Оплата прошла успешно
                </p>
              )}
            </div>
          ) : (
            <PaymentHistory payments={payments} loading={paymentsLoading} />
          )}
        </div>
      </aside>

      {dialog === 'pay' && (
        <ConfirmDialog
          title="Подтвердить оплату?"
          description={payConfirmText}
          confirmLabel="Оплатить"
          busy={busy}
          onConfirm={runPay}
          onCancel={() => setDialog(null)}
        />
      )}

      {dialog === 'delete' && (
        <ConfirmDialog
          title="Удалить безвозвратно?"
          description={`«${o.title}» будет удалено без возможности восстановления.`}
          confirmLabel="Удалить"
          danger
          busy={busy}
          onConfirm={runDelete}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function PaymentHistory({
  payments,
  loading,
}: {
  payments: Payment[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-ink-muted">Загрузка истории…</p>;
  }
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted">
        Платежей пока нет
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {payments.map((p) => (
        <li key={p.id} className="flex items-center justify-between py-3 text-sm">
          <span className="text-ink-muted">{formatShortDate(p.paid_at)}</span>
          <span className="font-medium tabular-nums text-ink">
            {formatMoney(p.amount, p.currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}
