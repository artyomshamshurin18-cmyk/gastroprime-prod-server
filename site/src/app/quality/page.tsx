import type { Metadata } from "next";
import Link from "next/link";
import { BASE } from "@/lib/base";
import { FadeIn, PulseButton } from "@/components/animations";

const faqItems = [
  { q: "Какой минимальный объём заказа?", a: "От 30 комплексных обедов. Работаем по Москве и Московской области." },
  { q: "Как быстро запускаете?", a: "В среднем 2-3 рабочих дня. Дегустация, согласование, старт." },
  { q: "Работаете ли с ночными сменами?", a: "Да, доставляем питание под любой график." },
  { q: "Есть ли доставка в МО?", a: "Да, доставляем по Москве и Московской области." },
];

export const metadata: Metadata = {
  title: "Система контроля качества | GastroPrime",
  description: "Контроль качества питания на всех этапах: от закупки до доставки. Собственная лаборатория, сертификация, стандарты ХАССП.",
  openGraph: {
    title: "Система контроля качества",
    description: "Контроль качества питания на всех этапах: от закупки до доставки. Собственная лаборатория, сертификация, стандарты ХАССП.",
    siteName: "GastroPrime",
    locale: "ru_RU",
    type: "website",
  },
};

export default function QualityPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        <div className="absolute inset-0">
          <img src="/file_191.jpg" alt="Контроль качества" className="h-full w-full object-cover opacity-60"/>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black"></div>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="grid gap-16 lg:grid-cols-[1.3fr,0.9fr] lg:items-center">
            <FadeIn className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Контроль качества
              </div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Качество питания<br />
                <span className="text-amber-400">под жёстким контролем</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Полный цикл контроля качества на всех этапах: от входного контроля сырья до финальной проверки перед доставкой клиенту.
              </p>
              <div className="flex flex-wrap gap-4">
                <PulseButton href="https://app.gastroprime.ru/register" className="bg-amber-500 shadow-lg shadow-amber-500/25 hover:bg-amber-400">
                  Узнать подробнее
                </PulseButton>
                <Link href={BASE} className="rounded-full border border-slate-600 px-7 py-3.5 text-base font-medium text-slate-300 transition hover:border-amber-500 hover:text-white">← На главную</Link>
              </div>
            </FadeIn>
            <FadeIn delay={200} className="grid gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">ХАССП</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">система менеджмента безопасности</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">4</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">этапа контроля</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">600 м²</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">собственное производство</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">0%</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">просрочек с 2023</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-900/50 bg-amber-900/20 p-5 backdrop-blur-sm">
                <p className="text-sm font-medium text-amber-300">Стандарты безопасности, собственный бракераж, ежедневный контроль.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Этапы контроля */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Процесс</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">4 этапа контроля качества</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Входной контроль", desc: "Проверка сырья при поступлении: сертификаты, сроки годности, органолептика." },
              { step: "02", title: "Контроль производства", desc: "Температурные режимы, рецептуры, время тепловой обработки на каждом этапе." },
              { step: "03", title: "Бракераж готовой продукции", desc: "Каждое блюдо проверяется: внешний вид, вкус, запах, вес, температура." },
              { step: "04", title: "Контроль логистики", desc: "Температура в термосах и рефрижераторах, герметичность упаковки." },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="text-lg font-bold text-amber-400">{item.step}</div>
                  <h3 className="mt-3 text-lg font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Почему важно */}
      <FadeIn>
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Почему это важно</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Контроль — залог безопасности</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Собственная лаборатория", desc: "Проводим микробиологические и физико-химические анализы продукции." },
                { title: "ХАССП на производстве", desc: "Система управления безопасностью — международный стандарт пищевой безопасности." },
                { title: "Закупка от проверенных поставщиков", desc: "Работаем только с сертифицированными фермами и производителями." },
                { title: "Фотофиксация", desc: "Каждое блюдо фотографируется перед отправкой — сохраняем историю качества." },
                { title: "Ежедневный бракераж", desc: "Комиссия проверяет каждую партию перед отгрузкой клиенту." },
                { title: "Температурный трекинг", desc: "Датчики температуры на всём пути: от цеха до стола." },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-amber-200">
                  <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Сертификаты */}
      <FadeIn delay={100}>
        <section className="bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Документы</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Сертификаты и декларации</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Вся продукция сертифицирована, декларации соответствия — открыты для клиентов.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <a href="/deklaracii.pdf" target="_blank" className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-amber-300">
                <div className="text-2xl mb-3">📄</div>
                <h3 className="text-lg font-bold text-slate-950">Декларации ТР ТС</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">На всю выпускаемую продукцию оформлены декларации соответствия. Скачать (PDF, 3.2 МБ).</p>
              </a>
              <a href="/protokoly_ses.pdf" target="_blank" className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-amber-300">
                <div className="text-2xl mb-3">🔬</div>
                <h3 className="text-lg font-bold text-slate-950">Протоколы СЭС</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Протокол лабораторных испытаний. Скачать (PDF, 6.4 МБ).</p>
              </a>
              <a href="/protokoly_ses_2.pdf" target="_blank" className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-amber-300">
                <div className="text-2xl mb-3">🧪</div>
                <h3 className="text-lg font-bold text-slate-950">Протоколы СЭС (2)</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Протокол лабораторных испытаний. Скачать (PDF, 3.8 МБ).</p>
              </a>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="rounded-2xl border border-slate-200 mb-4 overflow-hidden">
                  <img src="/file_haccp.jpg" alt="Сертификат ХАССП" className="w-full object-cover"/>
                </div>
                <h3 className="text-lg font-bold text-slate-950">ХАССП</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Сертификат ISO 22000 (ХАССП) — международный стандарт пищевой безопасности.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="rounded-2xl border border-slate-200 mb-4 overflow-hidden">
                  <img src="/file_haccp2.jpg" alt="Сертификат ХАССП второй" className="w-full object-cover"/>
                </div>
                <h3 className="text-lg font-bold text-slate-950">Сертификат ХАССП</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Сертификат системы менеджмента безопасности пищевой продукции.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="rounded-2xl border border-slate-200 mb-4 overflow-hidden">
                  <img src="/file_haccp3.jpg" alt="Сертификат" className="w-full object-cover"/>
                </div>
                <h3 className="text-lg font-bold text-slate-950">Сертификат соответствия</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Сертификат соответствия требованиям пищевой безопасности.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="rounded-2xl border border-slate-200 mb-4 overflow-hidden">
                  <img src="/file_haccp185.jpg" alt="Сертификат" className="w-full object-cover"/>
                </div>
                <h3 className="text-lg font-bold text-slate-950">Сертификат</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Сертификат соответствия требованиям пищевой безопасности.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="rounded-2xl border border-slate-200 mb-4 overflow-hidden">
                  <img src="/file_haccp186.jpg" alt="Сертификат" className="w-full object-cover"/>
                </div>
                <h3 className="text-lg font-bold text-slate-950">Сертификат</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Сертификат соответствия требованиям пищевой безопасности.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="rounded-2xl border border-slate-200 mb-4 overflow-hidden">
                  <img src="/file_haccp187.jpg" alt="Сертификат" className="w-full object-cover"/>
                </div>
                <h3 className="text-lg font-bold text-slate-950">Сертификат</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Сертификат соответствия требованиям пищевой безопасности.</p>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* FAQ */}
      <FadeIn>
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">FAQ</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Частые вопросы</h2>
            </div>
            <div className="mx-auto mt-12 max-w-3xl space-y-4">
              {[
                { q: "Как вы контролируете качество продуктов?", a: "Входной контроль: проверяем сертификаты, проводим органолептический анализ. Работаем только с проверенными поставщиками." },
                { q: "Есть ли у вас сертификаты?", a: "Да. Декларации ТР ТС на всю продукцию, протоколы лабораторных испытаний — предоставляем по запросу." },
                { q: "Как часто проверяете готовую продукцию?", a: "Ежедневный бракераж перед каждой отгрузкой. Комиссия проверяет запах, вкус, внешний вид, температуру, вес." },
                { q: "Что делать, если клиенту не понравилась еда?", a: "Мы оперативно заменяем блюдо. По каждой жалобе проводим внутреннее расследование." },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:border-amber-200">
                  <h3 className="text-lg font-bold text-slate-950">{item.q}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* CTA */}
      <section className="bg-amber-600 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Узнать больше о контроле качества</h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-amber-100">Оставьте заявку — мы пришлём документы и расскажем подробнее о нашей системе качества.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href="https://app.gastroprime.ru/register" className="rounded-full bg-white px-8 py-3.5 text-base font-bold text-amber-700 shadow-lg transition-all duration-300 hover:bg-amber-50 hover:scale-105 active:scale-95">Узнать подробнее</a>
              <a href="tel:+79166847288" className="rounded-full border border-white/30 px-8 py-3.5 text-base font-medium text-white transition hover:border-white hover:scale-105 active:scale-95">+7 916 684-72-88</a>
            </div>
          </FadeIn>
        </div>
      </section>

      
      </>
  );
}
