import type { SseConnectionStatus } from '@/types';

interface Props {
  totalsLabel: string;
  sseStatus: SseConnectionStatus;
}

export function Header({ totalsLabel, sseStatus }: Props) {
  const connected = sseStatus === 'connected';

  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">
              Умный реестр подписок
            </h1>
            <span
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-muted"
              title={connected ? 'SSE подключён' : 'SSE переподключение…'}
            >
              <span
                className={`h-2 w-2 rounded-full ${connected ? 'bg-sse-ok' : 'bg-sse-wait'}`}
                aria-hidden
              />
              <span className="sr-only sm:not-sr-only">
                {connected ? 'в сети' : 'переподключение'}
              </span>
            </span>
          </div>
          <p className="text-ink-muted">
            Предстоящие платежи в этом месяце
          </p>
        </div>
        <div className="rounded-2xl bg-surface-elevated px-5 py-3 shadow-sm ring-1 ring-border">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Сумма за месяц
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
            {totalsLabel}
          </p>
        </div>
      </div>
    </header>
  );
}
