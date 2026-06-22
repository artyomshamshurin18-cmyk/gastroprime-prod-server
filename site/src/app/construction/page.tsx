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
  title: "Питание для строек и строительных объектов | Gastroprime",
  description: "Горячие обеды на стройки: полевые кухни, развозка по объектам, питание для бригад на стройплощадках.",
  openGraph: {
    title: "Питание для строек и строительных объектов",
    description: "Горячие обеды на стройки: полевые кухни, развозка по объектам, питание для бригад на стройплощадках.",
    siteName: "Gastroprime",
    locale: "ru_RU",
    type: "website",
  },
};

export default function ConstructionPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        <div className="absolute inset-0">
          <img src="/file_178.jpg" alt="Строительный объект" className="h-full w-full object-cover opacity-70"/>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black"></div>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="grid gap-16 lg:grid-cols-[1.3fr,0.9fr] lg:items-center">
            <FadeIn className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Для строек и строительных объектов
              </div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Горячее питание на стройке<br />
                <span className="text-amber-400">без простоев и лишних перерывов</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Организация питания для строительных бригад: полевые кухни, доставка обедов на объекты, горячее питание на стройплощадке в любую смену.
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
                    <p className="mt-1 text-xs leading-5 text-slate-400">человек на объекте</p>
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
                    <div className="text-3xl font-bold text-amber-400">15+</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">строительных объектов</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-900/50 bg-amber-900/20 p-5 backdrop-blur-sm">
                <p className="text-sm font-medium text-amber-300">Полевые кухни, доставка термосов, питание под плотный график работ.</p>
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
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">С чем сталкиваются стройки</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { icon: "🚧", title: "Удалённость объектов", desc: "Стройплощадки за городом — рабочим негде поесть горячего." },
              { icon: "⏰", title: "Плотный график", desc: "Жёсткие сроки — перерывы на еду должны быть быстрыми и системными." },
              { icon: "🧊", title: "Условия хранения", desc: "Нет холодильников и столовых — еда должна быть готова к употреблению сразу." },
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

      {/* Форматы */}
      <FadeIn>
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Форматы</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Как организуем питание</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Три формата — под любой строительный объект и бюджет.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { price: "от 350 ₽", name: "Доставка термосов", desc: "Горячие обеды в термосах на объект. Суп, второе, салат, хлеб — готово к раздаче.", image: "/file_175.jpg" },
                { price: "от 450 ₽", name: "Полевая кухня", desc: "Повар и оборудование на стройплощадке. Горячее питание с нуля на объекте.", image: "/file_176.jpg" },
                { price: "от 700 ₽", name: "Трёхразовое питание", desc: "Завтрак, обед и ужин для вахт и круглосуточных строек.", image: "/file_177.jpg" },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="relative aspect-[4/3] overflow-hidden">
                        <img src={item.image || "/file_175.jpg"} alt={item.name} className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-110"/>
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
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Почему стройки выбирают Gastroprime</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Доставка на объект", desc: "Собственные фургоны с рефрижераторами — довозим горячие обеды в любую точку." },
                { title: "Полевые кухни", desc: "Разворачиваем питание прямо на площадке: повар, оборудование, раздача." },
                { title: "Любые объёмы", desc: "От 30 до 1000+ порций — масштабируемся под количество рабочих." },
                { title: "Гибкий график", desc: "Утренние, дневные и ночные смены — питание в любой час." },
                { title: "Без холодильников", desc: "Термосы и одноразовая посуда — не нужны условия хранения." },
                { title: "Дегустация", desc: "Перед стартом привозим пробные обеды — без риска и обязательств." },
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
                { q: "Как вы организуете питание на удалённом объекте?", a: "Доставляем в термосах или разворачиваем полевую кухню. Всё зависит от условий и количества рабочих." },
                { q: "Какой минимальный объём заказа?", a: "От 30 комплексов. Работаем по Москве и Московской области." },
                { q: "Как быстро вы запускаете питание на новом объекте?", a: "В среднем 2-3 дня. Замер, согласование, запуск." },
                { q: "Нужны ли на объекте холодильники или кухня?", a: "Нет. Всё необходимое привозим с собой: термосы, одноразовая посуда, газовые плиты для полевых кухонь." },
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
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Обсудить питание для вашего объекта</h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-amber-100">Оставьте заявку — менеджер свяжется в течение часа и предложит формат под ваш объект.</p>
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
