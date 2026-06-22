import type { Metadata } from "next";
import Link from "next/link";
import { BASE } from "@/lib/base";
import { FadeIn, AnimatedNumber, PulseButton } from "@/components/animations";
import { LeadForm } from "@/components/lead-form";

const faqItems = [
  { q: "Как быстро вы запускаете питание на новом объекте?", a: "В среднем 3-5 рабочих дней. Дегустация, согласование меню, запуск." },
  { q: "Какой минимальный объём заказа?", a: "От 30 комплексных обедов для производства." },
  { q: "Работаете ли с ночными сменами?", a: "Да, доставляем питание под любые смены, включая ночные." },
  { q: "Есть ли доставка в МО?", a: "Да, доставляем по Москве и Московской области." },
];

export const metadata: Metadata = {
  title: "Питание для производств и заводов | Gastroprime",
  description: "Корпоративные обеды для производств: питание под поток, смены, нагрузку и требования по дисциплине на предприятии.",
  openGraph: {
    title: "Питание для производств и заводов",
    description: "Корпоративные обеды для производств: питание под поток, смены, нагрузку и требования по дисциплине на предприятии.",
    siteName: "Gastroprime",
    locale: "ru_RU",
    type: "website",
  },
};

export default function ProductionPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-black"></div>
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="grid gap-16 lg:grid-cols-[1.3fr,0.9fr] lg:items-center">
            <FadeIn className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Для производств и заводов
              </div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Питание для производств, где важны<br />
                <span className="text-amber-400">ритм, безопасность и предсказуемость</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Для цехов, линий и производственных площадок, где обеденный сценарий должен работать как часть процесса, а не как стихийный компромисс.
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
                    <p className="mt-1 text-xs leading-5 text-slate-400">человек на производстве</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">24/7</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">питание под любые смены</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">3000+</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">порций в день</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">100</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">довольных клиентов</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-900/50 bg-amber-900/20 p-5 backdrop-blur-sm">
                <p className="text-sm font-medium text-amber-300">Полный пансион: завтрак, обед, ужин. Специальные условия для заводов от 200 человек.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Проблемы и решения */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Проблемы</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">С чем сталкиваются производства</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <FadeIn>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="text-2xl mb-3">⏱️</div>
                <h3 className="text-lg font-bold text-slate-950">Сбои в графике</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Сбои в графике питания ломают ритм смен. Работники вынуждены искать еду сами.</p>
              </div>
            </FadeIn>
            <FadeIn delay={100}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="text-2xl mb-3">😮‍💨</div>
                <h3 className="text-lg font-bold text-slate-950">Несистемное питание</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Работники получают несистемное питание, перекусывают фастфудом и быстрее устают.</p>
              </div>
            </FadeIn>
            <FadeIn delay={200}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="text-2xl mb-3">📋</div>
                <h3 className="text-lg font-bold text-slate-950">Разнобой в качестве</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Сложно держать единый стандарт качества и сервиса на большом предприятии.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Что мы предлагаем */}
      <FadeIn>
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Что мы предлагаем</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Питание, встроенное в производственный график</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Гибкие форматы — от базовых комплексных обедов до полного пансиона на 200+ человек.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { price: "от 350 ₽", name: "Базовый комплекс", image: "/file_171.jpg", desc: "Суп 350 мл, второе 300 г (гарнир 180 + котлета 120), салат 100 г, 2 куска хлеба." },
                { price: "от 390 ₽", name: "Сытный вариант", image: "/file_172.jpg", desc: "Суп 350 мл, второе 300 г (гарнир 180 + 2 котлеты по 80 г), салат 150 г, 2 куска хлеба." },
                { price: "от 780 ₽", name: "Питание на весь день", image: "/file_173.jpg", desc: "Два вторых по 300 г, два супа по 350 мл, два салата по 100 г, каша 200 г, оладушки 120 г, 6 кусков хлеба." },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="relative aspect-[4/3] overflow-hidden">
                        <img src={item.image || "/file_171.jpg"} alt={item.name} className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-110"/>
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
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Почему производства выбирают Gastroprime</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Ритм и дисциплина", desc: "Питание, встроенное в производственный график. Доставка точно к началу смены, без сбоев." },
                { title: "Своя логистика", desc: "Автофургоны с рефрижераторами. Доставка на площадку — минута в минуту." },
                { title: "Полный цикл", desc: "600 м² производства, контроль качества, декларации соответствия, HACCP, Меркурий." },
                { title: "Любые объёмы", desc: "От 30 до 3000+ порций в день. Подстраиваемся под численность смен." },
                { title: "Прозрачность", desc: "Персональный менеджер, постоплата, цифровой кабинет для заказов и отчётов." },
                { title: "Дегустация", desc: "Перед стартом привозим пробные обеды — проверяете качество без риска." },
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

      {/* Вопросы */}
      <FadeIn>
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">FAQ</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Частые вопросы</h2>
            </div>
            <div className="mx-auto mt-12 max-w-3xl space-y-4">
              {[
                { q: "Можно ли работать с разными производственными графиками?", a: "Да. Мы подстраиваемся под любой график: утренние, дневные, ночные смены. Доставка в нужное окно — стандартная опция." },
                { q: "Какой минимальный объём заказа?", a: "От 30 комплексов. Для заводов от 200 человек — специальные условия и цены." },
                { q: "Есть ли доставка в область?", a: "Да, работаем по Москве и Московской области. Собственный автопарк с рефрижераторами." },
                { q: "Как быстро вы запускаете питание на новом объекте?", a: "В среднем от первой заявки до старта поставок — 3-5 рабочих дней. Дегустация, согласование меню, логистика — всё входит в этот срок." },
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
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Обсудить питание для вашего производства</h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-amber-100">Оставьте заявку — менеджер свяжется в течение часа. Для заводов от 200 человек специальные условия.</p>
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
