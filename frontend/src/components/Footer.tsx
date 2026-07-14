export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface-elevated/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>Поддержка по обязательствам</p>
        <div className="flex flex-wrap gap-4">
          <a
            href="#"
            className="text-accent transition hover:underline"
          >
            support@support.app
          </a>
          <a
            href="#"
            rel="noreferrer"
            className="text-accent transition hover:underline"
          >
            Telegram
          </a>
        </div>
      </div>
    </footer>
  );
}
