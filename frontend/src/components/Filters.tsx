import { CATEGORY_LABELS, type ObligationCategory } from '@/types';

interface Props {
  category: string;
  query: string;
  onChange: (category: string, query: string) => void;
  onReset: () => void;
}

const categories = Object.entries(CATEGORY_LABELS) as [ObligationCategory, string][];

export function Filters({ category, query, onChange, onReset }: Props) {
  const hasFilters = Boolean(category || query.trim());

  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Поиск
        </span>
        <input
          type="search"
          value={query}
          placeholder="Например, Яндекс"
          onChange={(e) => onChange(category, e.target.value)}
          className="rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-sm outline-none ring-accent/30 transition focus:ring-2"
        />
      </label>

      <label className="flex w-full flex-col gap-1.5 sm:w-52">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Категория
        </span>
        <select
          value={category}
          onChange={(e) => onChange(e.target.value, query)}
          className="rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-sm outline-none ring-accent/30 transition focus:ring-2"
        >
          <option value="">Все</option>
          {categories.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-border/60 hover:text-ink"
        >
          Сбросить
        </button>
      )}
    </div>
  );
}
