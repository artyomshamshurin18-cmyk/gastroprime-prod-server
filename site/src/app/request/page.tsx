import type { Metadata } from "next";
import { LeadForm } from "@/components/lead-form";

export const metadata: Metadata = {
  title: "Заказать корпоративное питание | GastroPrime",
  description: "Заявка на бесплатную дегустацию, расчёт меню и коммерческое предложение. GastroPrime — корпоративное питание в Москве и МО.",
};

const perks = [
  { icon: "🍽", title: "Бесплатная дегустация", desc: "Пробуете — платите только если нравится" },
  { icon: "⚡", title: "Расчёт за 1 час", desc: "Смета и меню под ваш бюджет и график" },
  { icon: "📋", title: "Работаем по договору", desc: "Все официально, счета, акты, НДС" },
  { icon: "🚚", title: "Своя логистика", desc: "Рефрижераторы, термоконтейнеры — доставляем горячим" },
  { icon: "🔬", title: "HACCP + Меркурий", desc: "Сертифицированное производство, полная прослеживаемость" },
  { icon: "🎯", title: "Любой формат", desc: "Шведский стол, боксы, порционная раздача" },
];

export default function RequestPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-black via-slate-900 to-black">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute -right-40 bottom-20 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-32">
          <div className="mb-6 inline-block rounded-full bg-amber-500/20 px-4 py-1.5 text-xs font-semibold text-amber-300 tracking-widest uppercase">
            GastroPrime
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
            Накормим команду вкусно
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            Питание для ваших сотрудников — с дегустацией, без посредников, по договору. 
            Заполните форму — мы предложим оптимальный формат.
          </p>
        </div>
      </section>

      {/* Form + Perks */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Perks */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Почему выбирают нас
              </h2>
              <div className="mt-8 grid gap-6">
                {perks.map((p) => (
                  <div key={p.title} className="flex gap-4">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">
                      {p.icon}
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{p.title}</h3>
                      <p className="mt-0.5 text-sm text-slate-500">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Form */}
            <div className="lg:col-span-3">
              <LeadForm
                title="Запросить дегустацию, меню или расчёт"
                description="Оставьте контакты и пару слов про ваш объект — перезвоним в течение 2 часов."
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ mini */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            Частые вопросы
          </h2>
          <div className="mt-10 grid gap-4">
            {[
              { q: "Сколько человек минимум?", a: "От 10 человек. Для небольших команд — формат доставки 2 раза в неделю." },
              { q: "Нужно ли оборудование?", a: "Нет. Предоставляем термоконтейнеры, одноразовую посуду, салфетки, приборы." },
              { q: "Как часто обновляется меню?", a: "Каждую неделю новое меню. Можно составить индивидуальное под ваши предпочтения." },
              { q: "Какие документы получаю?", a: "Договор, счёт, акт, УПД — полный пакет для бухгалтерии." },
            ].map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-slate-200 bg-white p-5">
                <summary className="flex cursor-pointer items-center justify-between font-medium text-slate-900">
                  {faq.q}
                  <span className="text-slate-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
