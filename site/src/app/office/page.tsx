import type { Metadata } from "next";
import Link from "next/link";
import { BASE } from "@/lib/base";
import { FadeIn, AnimatedNumber, PulseButton } from "@/components/animations";
import { LeadForm } from "@/components/lead-form";

const faqItems = [
  { q: "Какой минимальный объём заказа?", a: "От 30 комплексных обедов. Работаем по Москве и Московской области." },
  { q: "Как быстро запускаете?", a: "В среднем 2-3 рабочих дня. Дегустация, согласование, старт." },
  { q: "Работаете ли с ночными сменами?", a: "Да, доставляем питание под любой график." },
  { q: "Есть ли доставка в МО?", a: "Да, доставляем по Москве и Московской области." },
];

export const metadata: Metadata = {
  title: "Корпоративное питание для офисов | GastroPrime",
  description: "Обеды для офисов: горячая доставка, понятный бюджет, персональный менеджер и запуск корпоративного питания без лишней рутины.",
  openGraph: {
    title: "Корпоративное питание для офисов",
    description: "Обеды для офисов: горячая доставка, понятный бюджет, персональный менеджер и запуск корпоративного питания без лишней рутины.",
    siteName: "GastroPrime",
    locale: "ru_RU",
    type: "website",
  },
};

export default function OfficePage() {
  return (
    <>
      {/* Hero — B2B-портал */}
      <section className="relative overflow-hidden bg-black">
        <div className="absolute inset-0">
          <img src="/file_174.jpg" alt="B2B-портал" className="h-full w-full object-cover opacity-70"/>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black"></div>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="grid gap-16 lg:grid-cols-[1.3fr,0.9fr] lg:items-center">
            <FadeIn className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                B2B-портал для офисов
              </div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                B2B-портал, где сотрудники<br />
                <span className="text-amber-400">быстро выбирают питание</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                А компания полностью контролирует заявки, бюджет и доступ. Один кабинет для сотрудников, координатора и администратора. Меньше ручной координации, меньше ошибок, больше прозрачности.
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
                    <div className="text-lg font-bold text-amber-400">Сотрудник</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Выбирает из меню, видит лимит</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-lg font-bold text-amber-400">Координатор</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Утверждает заявки, управляет меню</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-lg font-bold text-amber-400">Администратор</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Контролирует бюджет и отчётность</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-lg font-bold text-amber-400">Прозрачность</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Лимиты, счета, статусы, спрос</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-900/50 bg-amber-900/20 p-5 backdrop-blur-sm">
                <p className="text-sm font-medium text-amber-300">Постоплата, персональный менеджер и гибкое меню под бюджет компании.</p>
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
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">С чем сталкиваются офисы</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { icon: "⏱️", title: "Долгие перерывы", desc: "Сотрудники тратят длинные перерывы на поиск еды — теряют время и продуктивность." },
              { icon: "📋", title: "Нет единого процесса", desc: "В компании нет понятного сценария заказа и контроля — всё через переписки." },
              { icon: "🎲", title: "Непредсказуемость", desc: "Еда непредсказуемая по качеству и времени доставки — каждый день лотерея." },
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
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Наши обеды</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Примеры корпоративных обедов</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
              Сбалансированное питание для ваших сотрудников — от простых комплексных обедов до полноценного пансиона с завтраком, обедом и ужином.
            </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { src: "/standard.jpg", title: "Стандартное меню", desc: "Котлета домашняя из свинины с говядиной и зелёной чечевицей, сырный суп, салат из зелёной фасоли с тунцом.", price: "350 ₽", details: "Второе 300 г (гарнир 180, котлета 120) · Суп 300 г · Салат 120 г · Хлеб 2 куска + приборы" },
              { src: "/premium.jpg", title: "Премиум меню", desc: "Плов праздничный, шурпа из говядины, салат из куриной печени.", price: "380 ₽", details: "Второе 300 г (гарнир 180, мясо 120) · Суп 300 г · Салат 120 г · Напиток · Хлеб 2 куска + приборы" },
              { src: "/breakfast-new.jpg", title: "Завтраки", desc: "Сэндвичи, каши, роллы, омлеты в ассортименте.", price: "270 ₽", details: "Каши 200 г · Сэндвичи 220 г · Омлеты 220 г" },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[4/3] shrink-0 overflow-hidden">
                    <img
                      src={item.src}
                      alt={item.title}
                      className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-110"
                    />
                    {item.price && (
                      <div className="absolute left-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-sm font-bold text-amber-400 shadow-lg">
                        {item.price}
                      </div>
                    )}
                  </div>
                  <div className="flex h-[170px] flex-col justify-between p-5">
                      <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
                    {item.details && (
                      <p className="mt-3 text-xs leading-5 text-slate-400">{item.details}</p>
                    )}
                    {!item.details && (
                      <p className="mt-3 text-xs leading-5 text-transparent select-none">—</p>
                    )}
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
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Почему офисы выбирают GastroPrime</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Стабильность", desc: "Стабильное окно доставки и понятный процесс заказа — без сюрпризов." },
                { title: "Гибкое меню", desc: "Меню под бюджет и формат компании — от эконома до премиума." },
                { title: "Дегустация", desc: "Перед стартом привозим пробные обеды — пробуете и решаете." },
                { title: "Постоплата", desc: "Работаем с отсрочкой платежа до 10 дней — без предоплат." },
                { title: "Свой кабинет", desc: "Цифровой кабинет для заказов, меню и отчётности — всё в одном месте." },
                { title: "Менеджер", desc: "Персональный менеджер — один контакт по всем вопросам." },
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
                { q: "Можно ли учесть разные предпочтения команд?", a: "Да. Мы предлагаем несколько форматов меню, разные комплекты и отдельные сценарии согласования." },
                { q: "Подходит ли решение для компаний с гибридным графиком?", a: "Да. Плавающие объёмы, окна заказа и управляемость через кабинет — всё настроим под ваш график." },
                { q: "Какой минимальный объём заказа?", a: "От 30 комплексов. Доставка по Москве и Московской области." },
                { q: "Есть ли постоплата?", a: "Да, работаем с отсрочкой платежа до 10 дней для постоянных клиентов." },
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
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Обсудить питание для вашего офиса</h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-amber-100">Оставьте заявку — менеджер свяжется в течение часа и предложит варианты под ваш бюджет.</p>
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
