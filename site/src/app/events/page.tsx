import type { Metadata } from "next";
import Link from "next/link";
import { BASE } from "@/lib/base";
import { FadeIn, PulseButton } from "@/components/animations";
import Gallery from "@/components/gallery";

export const metadata: Metadata = {
  title: "Организация мероприятий под ключ | Gastroprime",
  description: "Кейтеринг на мероприятия: фуршеты, банкеты, корпоративы, выездное обслуживание под ключ.",
  openGraph: {
    title: "Организация мероприятий под ключ",
    description: "Кейтеринг на мероприятия: фуршеты, банкеты, корпоративы, выездное обслуживание под ключ.",
    siteName: "Gastroprime",
    locale: "ru_RU",
    type: "website",
  },
};

export default function EventsPage() {
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
                Мероприятия и кейтеринг
              </div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Организация мероприятий<br />
                <span className="text-amber-400">под ключ</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Полный цикл кейтеринга: от фуршета и BBQ до корпоратива на 500+ человек. Меню, сервис, логистика — всё берём на себя.
              </p>
              <div className="flex flex-wrap gap-4">
                <PulseButton href="https://app.gastroprime.ru/register" className="bg-amber-500 shadow-lg shadow-amber-500/25 hover:bg-amber-400">
                  Обсудить мероприятие
                </PulseButton>
                <Link href={BASE} className="rounded-full border border-slate-600 px-7 py-3.5 text-base font-medium text-slate-300 transition hover:border-amber-500 hover:text-white">← На главную</Link>
              </div>
            </FadeIn>
            <FadeIn delay={200} className="grid gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">50+</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">проведённых мероприятий</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">500+</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">гостей максимум</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">24/7</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">подготовка и проведение</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400">10+</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">лет опыта в кейтеринге</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-900/50 bg-amber-900/20 p-5 backdrop-blur-sm">
                <p className="text-sm font-medium text-amber-300">Фуршеты, BBQ, банкеты, корпоративы — любой формат под ключ.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Форматы */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Форматы</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Форматы мероприятий</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { icon: "🍸", title: "Фуршеты", desc: "Лёгкие закуски, канапе, напитки. Идеально для деловых встреч и нетворкинга." },
              { icon: "🍖", title: "Выездное BBQ", desc: "Мангал, стейки, овощи на гриле. Для больших компаний на природе." },
              { icon: "🎉", title: "Банкеты", desc: "Полноценное меню с подачей. Для корпоративов, юбилеев и торжеств." },
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

      {/* Что входит */}
      <FadeIn>
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Что входит</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Всё включено</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Мы берём на себя полную организацию питания на вашем мероприятии.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: "📋", title: "Разработка меню", desc: "Индивидуальное меню под формат, количество гостей и бюджет." },
                { icon: "👨‍🍳", title: "Повара и персонал", desc: "Шеф-повар, официанты, бармены — полная команда." },
                { icon: "🚐", title: "Выездное оборудование", desc: "Мангалы, мармиты, посуда, мебель — всё привозим." },
                { icon: "🌿", title: "Продукты", desc: "Только свежие продукты с собственного производства." },
                { icon: "🧹", title: "Уборка", desc: "После мероприятия убираем площадку — вы отдыхаете." },
                { icon: "⏰", title: "Тайминг", desc: "Строго по времени — подача, сервировка, уборка." },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-amber-200">
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.desc}</p>
                </div>
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
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Почему выбирают Gastroprime</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Под ключ", desc: "От меню до уборки — занимаемся всем, вы только принимаете гостей." },
                { title: "Собственное производство", desc: "600 м² цех — контролируем качество каждого блюда." },
                { title: "Любой формат", desc: "Фуршет, BBQ, банкет, кофе-брейк — подстроимся под задачу." },
                { title: "Своя логистика", desc: "Автопарк с рефрижераторами — довезём в любую точку." },
                { title: "Опыт", desc: "Более 50 мероприятий, от 10 до 500+ гостей." },
                { title: "Дегустация", desc: "Пробуете меню до мероприятия — уверены в результате." },
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

      {/* Галерея мероприятий */}
      <section className="bg-black py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Галерея</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Фото с мероприятий</h2>
            <p className="mt-4 text-base leading-7 text-slate-400">Кликайте на фото, чтобы открыть карусель</p>
          </div>
          <Gallery />
        </div>
      </section>
      {/* Отзывы и кейсы */}
      <FadeIn>
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Отзывы и кейсы</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Проведённые мероприятия</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Реальные отзывы и кейсы наших клиентов</p>
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {/* Кейс 1 */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {"★★★★★"}
                </div>
                <p className="text-sm leading-7 text-slate-600 italic">
                  "Заказывали выездной фуршет на 80 гостей. Всё прошло идеально: красивый сервис, вкусная еда, персонал вежливый. Спасибо команде!"
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">АН</div>
                  <div>
                    <p className="text-sm font-bold text-slate-950">Алексей Н.</p>
                    <p className="text-xs text-slate-500">Корпоратив, 80 гостей</p>
                  </div>
                </div>
              </div>
              {/* Кейс 2 */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {"★★★★★"}
                </div>
                <p className="text-sm leading-7 text-slate-600 italic">
                  "Организовали банкет на 200 человек в нашем офисе. Gastroprime привезли всё: от посуды до десертов. Очень довольны качеством и сервисом."
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">МК</div>
                  <div>
                    <p className="text-sm font-bold text-slate-950">Мария К.</p>
                    <p className="text-xs text-slate-500">Банкет, 200 гостей</p>
                  </div>
                </div>
              </div>
              {/* Кейс 3 */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {"★★★★★"}
                </div>
                <p className="text-sm leading-7 text-slate-600 italic">
                  "BBQ на природе для команды из 50 человек. Gastroprime привезли мангалы, мясо, овощи, напитки. Всё на высшем уровне, спасибо!"
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">ДС</div>
                  <div>
                    <p className="text-sm font-bold text-slate-950">Дмитрий С.</p>
                    <p className="text-xs text-slate-500">Выездное BBQ, 50 гостей</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>
      <section className="bg-amber-600 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Обсудить ваше мероприятие</h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-amber-100">Оставьте заявку — менеджер свяжется в течение часа и предложит варианты под ваш формат и бюджет.</p>
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
