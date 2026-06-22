import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "О компании | Gastroprime",
  description: "Gastroprime — собственное производство корпоративного питания в Дмитрове. Работаем с 2023 года. 600 м² цехов, своя логистика, HACCP. Кормим офисы, склады, стройки, производства и проводим кейтеринг в Москве и МО.",
};

const stats = [
  { value: "600 м²", label: "площадь производства" },
  { value: "5 000+", label: "порций в день" },
  { value: "100+", label: "корпоративных клиентов" },
  { value: "с 2023", label: "года на рынке" },
];

const values = [
  {
    title: "Собственное производство",
    desc: "600 кв.м цехов в Дмитрове с полным циклом — от закупки продуктов до фасовки готовых обедов. Соблюдаем стандарты HACCP на всех этапах.",
    icon: "🏭",
  },
  {
    title: "Контроль качества",
    desc: "Каждая партия проходит проверку: входной контроль сырья, контроль на производстве, термоконтроль при отгрузке. Работаем только с сертифицированными поставщиками.",
    icon: "✅",
  },
  {
    title: "Своя логистика",
    desc: "Автопарк рефрижераторов с поддержанием температуры. Доставляем горячие обеды в любое время в Москве и Московской области.",
    icon: "🚚",
  },
  {
    title: "Персональный менеджер",
    desc: "Закрепляем менеджера за каждым клиентом. Он отвечает за меню, корректировки, контроль качества и оперативное решение любых вопросов.",
    icon: "👤",
  },
  {
    title: "Гибкое меню",
    desc: "Составляем рацион под задачи клиента: комплексные обеды, шведская линия, диетическое / спортивное питание, постное меню.",
    icon: "🍽️",
  },
  {
    title: "Кейтеринг и мероприятия",
    desc: "Организуем выездное обслуживание: фуршеты, бизнес-ланчи, кофе-брейки, корпоративы. Работаем на площадках заказчика.",
    icon: "🎉",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black py-24">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-amber-500 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-amber-600 blur-3xl"></div>
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">О компании</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Gastroprime —<br />
            <span className="text-amber-400">корпоративное питание</span> полного цикла
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Мы не перепродаём еду — мы её производим. Собственный цех 600 м², рефрижераторы,
            HACCP-контроль и персональный подход к каждому клиенту.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/request/"
              className="rounded-full bg-amber-500 px-8 py-4 text-base font-bold text-black shadow-xl transition-all duration-300 hover:bg-amber-400 hover:scale-105"
            >
              Запросить КП
            </Link>
            <Link
              href="/contacts/"
              className="rounded-full border border-slate-600 px-8 py-4 text-base font-medium text-slate-300 transition hover:border-amber-500 hover:text-amber-400"
            >
              Связаться с нами
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-amber-600 sm:text-4xl">{s.value}</div>
                <div className="mt-2 text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About description */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
          <div className="mx-auto max-w-3xl space-y-6 text-lg leading-8 text-slate-600">
            <p>
              Gastroprime — это сервис корпоративного питания, основанный в 2023 году в Дмитрове (Московская область).
              За два года работы мы превратились из небольшой кухни в полноценное производство с оборотом более 5000 порций в день.
            </p>
            <p>
              В основе нашего подхода — <strong className="text-slate-900">полный цикл производства</strong>. Мы сами закупаем продукты,
              сами готовим, сами фасуем, сами доставляем. Это позволяет контролировать качество на каждом этапе и гибко
              подстраиваться под пожелания клиентов.
            </p>
            <p>
              Наш цех расположен по адресу: <strong className="text-slate-900">г. Дмитров, ул. Промышленная, 27к5</strong>.
              Приглашаем на дегустацию и экскурсию по производству — посмотрите своими глазами, как и из чего мы готовим.
            </p>
          </div>
        </div>
      </section>

      {/* Values grid */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Почему мы</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Преимущества Gastroprime
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="mb-4 text-3xl">{v.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900">{v.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Приезжайте на дегустацию
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Посмотрите производство, попробуйте меню, задайте вопросы — бесплатно и без обязательств.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/request/"
              className="rounded-full bg-amber-500 px-8 py-4 text-base font-bold text-black shadow-xl transition hover:bg-amber-400 hover:scale-105"
            >
              Записаться на дегустацию
            </Link>
            <a
              href="tel:+79166847288"
              className="rounded-full border border-slate-600 px-8 py-4 text-base font-medium text-slate-300 transition hover:border-amber-500 hover:text-amber-400"
            >
              +7 916 684-72-88
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Дмитров, Промышленная ул., 27к5
          </p>
        </div>
      </section>
    </>
  );
}
