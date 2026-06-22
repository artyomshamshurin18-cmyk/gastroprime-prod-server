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
  title: "Питание для складов и логистических центров | GastroPrime",
  description: "Организация горячего питания для складских комплексов: доставка обедов, термосы, полевые кухни для складов и распределительных центров.",
  openGraph: {
    title: "Питание для складов и логистических центров",
    description: "Организация горячего питания для складских комплексов: доставка обедов, термосы, полевые кухни для складов и распределительных центров.",
    siteName: "GastroPrime",
    locale: "ru_RU",
    type: "website",
  },
};

export default function WarehousesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        <div className="absolute inset-0">
          <img src="/file_182.jpg" alt="Склад" className="h-full w-full object-cover opacity-70"/>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black"></div>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="grid gap-16 lg:grid-cols-[1.3fr,0.9fr] lg:items-center">
            <FadeIn className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Для складов и логистических центров
              </div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Обеды для склада<br />
                <span className="text-amber-400">без отрыва от работы</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Питание для складских комплексов и распределительных центров. Термосы, горячие обеды, питание под любые смены и графики.
              </p>
              <div className="flex flex-wrap gap-4">
                <PulseButton href="https://app.gastroprime.ru/register" className="bg-amber-500 shadow-lg shadow-amber-500/25 hover:bg-amber-400">
                  Обсудить питание
                </PulseButton>
                <Link href={BASE} className="rounded-full border border-slate-600 px-7 py-3.5 text-base font-medium text-slate-300 transition hover:border-amber-500 hover:text-white">← На главную</Link>
              </div>
            </FadeIn>
            <FadeIn delay={200} className="grid gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">от 30</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">человек на складе</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">24/7</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">питание под смены</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">3000+</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">порций в день</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">20+</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">складских комплексов</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-900/50 bg-amber-900/20 p-5 backdrop-blur-sm">
                <p className="text-sm font-medium text-amber-300">Гибкий график, термосы, постоплата — организуем питание под ваш склад.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Проблемы */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Проблемы</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">С чем сталкиваются склады</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { icon: "📦", title: "Нет столовой на складе", desc: "Удалённые складские комплексы без инфраструктуры питания." },
              { icon: "🔄", title: "Посменная работа", desc: "Сотрудники работают в разное время — питание нужно гибкое." },
              { icon: "⏳", title: "Короткие перерывы", desc: "Обеды должны быть быстрыми — кладовщики не могут долго отвлекаться." },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Меню */}
      <FadeIn>
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Меню</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Форматы питания для склада</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Три формата — под любой складской комплекс.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { price: "от 350 ₽", name: "Термосная доставка", desc: "Горячие обеды в термосах на склад. Суп, второе, салат, хлеб — готово к раздаче.", image: "/file_179.jpg" },
                { price: "от 450 ₽", name: "Развозка по зонам", desc: "Доставка по разным зонам склада — питание прямо на рабочем месте.", image: "/file_180.jpg" },
                { price: "от 700 ₽", name: "Трёхразовое питание", desc: "Завтрак, обед и ужин для круглосуточных складских смен.", image: "/file_181.jpg" },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="relative aspect-[4/3] overflow-hidden">
                        <img src={item.image || "/file_179.jpg"} alt={item.name} className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-110"/>
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div className="min-h-20">
                        <div className="inline-block rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-amber-400">{item.price}</div>
                        <h3 className="mt-2 text-lg font-bold text-slate-950">{item.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Почему мы */}
      <FadeIn delay={100}>
        <section className="bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Почему мы</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Почему склады выбирают GastroPrime</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Доставка на склад", desc: "Собственный автопарк — привозим горячие обеды в любую точку." },
                { title: "Термосы", desc: "Еда остаётся горячей 4-6 часов. Не нужна кухня на складе." },
                { title: "Гибкие смены", desc: "Утренние, дневные и ночные смены — питание под любой график." },
                { title: "Любые объёмы", desc: "От 30 до 1000+ порций. Подстраиваемся под численность." },
                { title: "Развозка по зонам", desc: "Доставляем в разные части склада — минимум отвлечения." },
                { title: "Дегустация", desc: "Привозим пробные обеды перед стартом — без риска." },
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
                { q: "Как организовать питание на складе без столовой?", a: "Термосы и одноразовая посуда — не нужна инфраструктура. Развозим по зонам." },
                { q: "Какой минимальный объём?", a: "От 30 комплексов. Работаем по Москве и Московской области." },
                { q: "Как быстро запускаете?", a: "В среднем 2-3 рабочих дня. Дегустация, согласование, старт." },
                { q: "Работаете ли с ночными сменами?", a: "Да, доставляем питание под любой график, включая ночные смены." },
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
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Обсудить питание для вашего склада</h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-amber-100">Оставьте заявку — менеджер свяжется в течение часа и предложит формат под ваш склад.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href="https://app.gastroprime.ru/register" className="rounded-full bg-white px-8 py-3.5 text-base font-bold text-amber-700 shadow-lg transition-all duration-300 hover:bg-amber-50 hover:scale-105 active:scale-95">Оставить заявку</a>
              <a href="tel:+79166847288" className="rounded-full border border-white/30 px-8 py-3.5 text-base font-medium text-white transition hover:border-white hover:scale-105 active:scale-95">+7 916 684-72-88</a>
            </div>
          </FadeIn>
        </div>
      </section>

      
      </>
  );
}
