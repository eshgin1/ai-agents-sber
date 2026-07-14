import type { Obligation } from '@/types';
import { ObligationCard } from '@/components/ObligationCard';

interface Props {
  obligations: Obligation[];
  exitingIds: string[];
  payingSuccessId: string | null;
  onOpen: (id: string) => void;
}

export function ObligationList({
  obligations,
  exitingIds,
  payingSuccessId,
  onOpen,
}: Props) {
  if (obligations.length === 0) {
    return (
      <section>
        <h2 className="mb-4 font-display text-2xl text-ink">Все обязательства</h2>
        <div className="rounded-2xl border border-dashed border-border bg-surface-elevated/60 px-6 py-16 text-center text-ink-muted">
          Ничего не найдено. Попробуйте сбросить фильтры.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 font-display text-2xl text-ink">Все обязательства</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {obligations.map((o) => (
          <ObligationCard
            key={o.id}
            obligation={o}
            exiting={exitingIds.includes(o.id)}
            paySuccess={payingSuccessId === o.id}
            onOpen={() => onOpen(o.id)}
          />
        ))}
      </div>
    </section>
  );
}
