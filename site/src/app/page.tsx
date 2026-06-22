import Link from "next/link";
import { BASE } from "@/lib/base";
import { FadeIn, AnimatedNumber, PulseButton } from "@/components/animations";
import { PhotoGrid } from "@/components/photo-grid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Корпоративное питание в Москве | GastroPrime",
  description: "Доставка обедов в офисы, на стройки, склады и производства. GastroPrime — горячее питание для вашего бизнеса.",
  openGraph: {
    title: "Корпоративное питание в Москве",
    description: "Доставка обедов в офисы, на стройки, склады и производства. GastroPrime — горячее питание для вашего бизнеса.",
    siteName: "GastroPrime",
    locale: "ru_RU",
    type: "website",
  },
};

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        <div className="absolute inset-0">
          <img src="/file_162.jpg" alt="" className="h-full w-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black"></div>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="grid gap-16 lg:grid-cols-[1.3fr,0.9fr] lg:items-center">
            <FadeIn className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Фабрика-кухня нового поколения
              </div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Мы не готовим обеды.<br />
                <span className="text-amber-400">Мы даём решение по организации питания</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Корпоративное питание для заводов, офисов, строек и производств. Гибкие условия под ваш запрос — от небольшой команды до 200+ человек с полным пансионом: завтрак, обед и ужин.
              </p>
              <div className="flex flex-wrap gap-4">
                <PulseButton href="https://app.gastroprime.ru/register" className="bg-amber-500 shadow-lg shadow-amber-500/25 hover:bg-amber-400">
                  Начать сотрудничество
                </PulseButton>
                <a href="https://app.gastroprime.ru/" className="rounded-full border border-slate-600 px-7 py-3.5 text-base font-medium text-slate-300 transition hover:border-amber-500 hover:text-white">Уже клиент? Войти</a>
              </div>
            </FadeIn>
            <FadeIn delay={200} className="grid gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400"><AnimatedNumber value={3000} suffix="+" /></div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">обедов в день</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400"><AnimatedNumber value={30} suffix="+" /></div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">корпоративных клиентов</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400"><AnimatedNumber value={10} suffix="+" /></div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">лет опыта в общепите</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400"><AnimatedNumber value={600} /></div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">собственное производство</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-900/50 bg-amber-900/20 p-5 backdrop-blur-sm">
                <p className="text-sm font-medium text-amber-300">Для заводов от 200 человек — специальные условия по ценам. Полный пансион: завтрак, обед, ужин.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Meals */}
      <section className="bg-slate-50 py-20 sm:py-28">
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
              { src: "/standard.jpg", title: "Стандартное меню", desc: "Котлета домашняя из свинины с говядиной и зелёной чечевицей, сырный суп, салат из зелёной фасоли с тунцом.", price: "400 ₽", details: "Второе 300 г (гарнир 180, котлета 120) · Суп 300 г · Салат 120 г · Хлеб 2 куска + приборы" },
              { src: "/premium.jpg", title: "Премиум меню", desc: "Плов праздничный, шурпа из говядины, салат из куриной печени.", price: "600 ₽", details: "Второе 300 г (гарнир 180, мясо 120) · Суп 300 г · Салат 120 г · Хлеб 2 куска + приборы" },
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

      {/* More meals */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Ещё больше примеров</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Наши обеды в деталях</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">От стандартных комплексных обедов до премиальных позиций — каждое блюдо готовится на собственном производстве.</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              "/file_150.jpg",
              "/file_151.jpg",
              "/file_152.jpg",
              "/file_154.jpg",
              "/file_155.jpg",
              "/file_156.jpg",
              "/file_158.jpg",
              "/file_159.jpg",
            ].map((src, i) => (
              <div key={i} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events - фуршеты */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Фуршеты и мероприятия</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Мероприятия под ключ</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">От небольшого фуршета до масштабного корпоратива. Всё организуем под ключ.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src="/file_163.jpg" alt="Корпоративы на выезде" className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-110"/>
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <h3 className="text-lg font-bold text-slate-950">Корпоративы на выезде</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Организуем питание на вашем мероприятии — от небольшого фуршета до полноценного банкета. Шеф-повар лично контролирует подачу.</p>
              </div>
            </div>
            <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src="/file_164.jpg" alt="Организация торжеств" className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-110"/>
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <h3 className="text-lg font-bold text-slate-950">Организация торжеств</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Свадьбы, дни рождения, юбилеи — полный цикл: от сценария до сервировки. Индивидуальное меню под ваш вкус и бюджет.</p>
              </div>
            </div>
            <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src="/file_160.jpg" alt="Выездное барбекю" className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-110"/>
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <h3 className="text-lg font-bold text-slate-950">Выездное барбекю</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Стейки сухого вызревания, брискет, тар-тар — шеф жарит лично. Наша фирменная фишка, которая выделяет нас среди любого кейтеринга.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Production */}
      <FadeIn>
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-16 lg:grid-cols-[1fr,1.1fr] lg:items-center">
              <div className="space-y-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Производство</div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Собственное производство. Современное оборудование. Делаем то, что любим.</h2>
                <p className="text-base leading-7 text-slate-600">Собственное производство — это не просто цех. Это пространство, где мы делаем полный цикл производства еды под ключ — от идеи до реализации. Мы сами ферментируем мясо для наших BBQ, сами делаем копченые и сыровяленые деликатесы, сами ферментируем овощи и многое другое.</p>
                <p className="text-base leading-7 text-slate-600">600 м² — современное оборудование, полный контроль качества. Всё делаем сами, без посредников.</p>
              </div>
              <PhotoGrid />
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Why */}
      <FadeIn delay={100}>
        <section className="bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Почему мы</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Мы слышим клиента и находим решение для любого запроса</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Не шаблонные обеды, а сервис, который подстраивается под вас. Мы не усложняем — мы облегчаем.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Гибкость", icon: "/file_165.jpg", desc: "Любой формат: от 30 до 3000+ порций в день. Полный пансион, отдельные смены, ночные доставки — работаем как нужно вам." },
                { title: "Своя логистика", icon: "/file_166.jpg", desc: "Автофургоны с рефрижераторами. Доставка точно в окно, без опозданий и пересортицы. Москва и Московская область." },
                { title: "Полный цикл", icon: "/file_167.jpg", desc: "Собственное производство, контроль качества, декларации соответствия, HACCP, Меркурий — полный документооборот." },
                { title: "Мероприятия под ключ", icon: "/file_168.jpg", desc: "От сценария до реализации. Выездные фуршеты, свадьбы, корпоративы, BBQ. Шеф-повар (он же владелец) жарит стейки лично." },
                { title: "Прозрачность", icon: "/file_169.jpg", desc: "Персональный менеджер, постоплата с отсрочкой до 10 дней, понятный цифровой кабинет для заказов и отчётов." },
                { title: "Бесплатная дегустация", icon: "/file_170.jpg", desc: "Перед стартом привозим пробные обеды — пробуете лично и убеждаетесь в качестве. Без риска и обязательств." },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-amber-200">
                  <div className="mb-4 h-16 w-16 overflow-hidden rounded-full border-2 border-amber-200 bg-slate-100">
                    <img src={item.icon} alt="" className="h-full w-full object-cover"/>
                  </div>
                  <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Solutions */}
      <FadeIn>
        <section id="solutions" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Решения</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Кому мы нужны</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Каждый сегмент — свои боли. Мы не продаём одно меню всем. Мы проектируем питание под задачу.</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Заводы и предприятия", desc: "Полный пансион для 200+ человек. Завтрак, обед, ужин. Специальные условия.", href: "/production" },
                { title: "Офисы и бизнес-центры", desc: "Горячие обеды для команд. Гибкое меню, точное время, постоплата.", href: "/office" },
                { title: "Стройки и объекты", desc: "Плотные комплексы, термоупаковка, доставка прямо на площадку.", href: "/construction" },
                { title: "Склады и логистические хабы", desc: "Питание под дневные и ночные смены. Без перебоев.", href: "/warehouses" },
                { title: "Мероприятия", desc: "Выездной кейтеринг, BBQ, свадьбы, корпоративы. Шеф на гриле лично.", href: "/events" },
                { title: "Госучреждения", desc: "HACCP, Меркурий, санитарные стандарты, прозрачный документооборот.", href: "/quality" },
              ].map((s, i) => (
                <Link key={i} href={s.href} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-300 hover:shadow-xl">
                  <h3 className="text-lg font-bold text-slate-950 group-hover:text-amber-700 transition-colors">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{s.desc}</p>
                  <div className="mt-4 text-sm font-medium text-amber-600 group-hover:translate-x-1 transition-transform">Подробнее →</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>



      {/* Process */}
      <FadeIn>
        <section className="bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Процесс</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">От заявки до стабильной работы</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { num: "01", title: "Заявка", desc: "Регистрируетесь в кабинете — мы уже знаем ваш запрос." },
                { num: "02", title: "Дегустация", desc: "Пробуете — убеждаетесь в качестве лично. Бесплатно." },
                { num: "03", title: "Запуск", desc: "Согласовываем меню, график, бюджет. Начинаем работать." },
                { num: "04", title: "Сервис", desc: "Персональный менеджер, постоплата, прозрачная отчётность." },
              ].map((step, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="text-3xl font-bold text-amber-500">{step.num}</div>
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Logistics */}
      <FadeIn>
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
                <img src="/file_161.jpg" alt="Логистика" className="absolute inset-0 h-full w-full object-cover"/>
              </div>
              <div className="space-y-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Логистика</div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Своя логистика с рефрижераторами</h2>
                <p className="text-base leading-7 text-slate-600">Не нанимаем сторонних перевозчиков. У нас собственные автофургоны с холодильным оборудованием. Это значит: температура соблюдена, время доставки — минута в минуту, контроль — полный.</p>
                <p className="text-base leading-7 text-slate-600">Москва и Московская область. От 30 комплексов. Точно в срок, к началу обеда.</p>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* CTA */}
      <section className="bg-amber-600 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Готовы обсудить питание для вашего предприятия?</h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-amber-100">Для заводов от 200 человек — специальные условия. Завтрак, обед, ужин. Заполните заявку — менеджер свяжется в течение часа.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href="https://app.gastroprime.ru/register" className="rounded-full bg-white px-8 py-3.5 text-base font-bold text-amber-700 shadow-lg transition-all duration-300 hover:bg-amber-50 hover:scale-105 active:scale-95">Начать сотрудничество</a>
              <a href="tel:+79166847288" className="rounded-full border border-white/30 px-8 py-3.5 text-base font-medium text-white transition hover:border-white hover:scale-105 active:scale-95">+7 916 684-72-88</a>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
