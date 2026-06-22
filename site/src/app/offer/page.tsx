import type { Metadata } from "next";
import { company } from "@/content/site";

export const metadata: Metadata = {
  title: "Оферта",
  description: "Черновик юридической страницы оферты для нового сайта Gastroprime.",
};

export default function OfferPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Оферта</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-600">
          <p>Это чистый драфт юридической страницы без Tilda-URL и без лишнего шума. Финальную версию можно перенести из текущих материалов и дополнительно вычитать.</p>
          <p><span className="font-semibold text-slate-950">Продавец:</span> {company.legalName}</p>
          <p><span className="font-semibold text-slate-950">ИНН:</span> {company.inn}</p>
          <p><span className="font-semibold text-slate-950">ОГРНИП:</span> {company.ogrnip}</p>
          <p><span className="font-semibold text-slate-950">Контакты:</span> {company.phone}, {company.email}</p>
          <p>На следующем этапе сюда переносится полная редакция оферты, а также отдельная страница политики конфиденциальности.</p>
        </div>
      </div>
    </main>
  );
}
