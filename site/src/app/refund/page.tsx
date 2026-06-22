import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Возврат",
  description: "Черновик страницы возврата для нового сайта Gastroprime.",
};

export default function RefundPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Возврат</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-600">
          <p>Эта страница нужна, чтобы юридические и сервисные материалы жили на чистых адресах, а не на технических Tilda-страницах.</p>
          <p>Следующим шагом можно аккуратно перенести действующий текст и привести формулировки к актуальному процессу возврата и поддержки.</p>
        </div>
      </div>
    </main>
  );
}
