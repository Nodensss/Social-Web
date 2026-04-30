export default function NewToyPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Добавить игрушку</h1>
      <div className="rounded-2xl border border-toy-ink/10 bg-white p-6 text-sm text-toy-ink/70">
        Загрузка фото → пайплайн обработки → карточка героя.
        Реализация — этап 2 ТЗ (POST /api/toys, ProcessingJob, AI-адаптеры).
      </div>
    </section>
  );
}
