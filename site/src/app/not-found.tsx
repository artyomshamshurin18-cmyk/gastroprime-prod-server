import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-start justify-center px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">404</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Страница не найдена</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
        В новой версии сайта это будет аккуратная, полезная страница с навигацией и редиректами, а не технический тупик.
      </p>
      <Link href="/" className="mt-8 rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
        Вернуться на главную
      </Link>
    </main>
  );
}
