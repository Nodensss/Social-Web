import { requirePageSession } from "@/lib/session";
import { NewToyForm } from "./NewToyForm";

export default async function NewToyPage() {
  await requirePageSession();

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Добавить игрушку</h1>
        <p className="text-sm leading-6 text-toy-ink/70">
          Фото попадёт в приватное хранилище, а карточка героя соберётся через очередь обработки.
        </p>
      </div>
      <NewToyForm />
    </section>
  );
}
