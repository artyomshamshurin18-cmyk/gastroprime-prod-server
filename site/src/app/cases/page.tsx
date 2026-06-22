import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn, PulseButton } from "@/components/animations";
import { LeadForm } from "@/components/lead-form";

export const metadata: Metadata = {
  title: "Кейсы корпоративного питания | GastroPrime",
  description: "Реальные примеры организации питания для производства, стройки, офиса, склада и мероприятий. Сотни довольных клиентов в Москве и МО.",
  openGraph: {
    title: "Кейсы корпоративного питания | GastroPrime",
    description: "Реальные примеры организации питания: производства, стройки, офисы, склады, мероприятия.",
  },
};

const cases = [
  {
    id: "production-plant",
    industry: "Промышленное производство",
    company: "ООО «ПРОММАШ»",
    location: "г. Подольск, МО",
    employees: 340,
    mealsPerDay: 680,
    format: "Трёхразовое питание в столовой",
    period: "ноябрь 2024 — настоящее время",
    result: [
      "Снизили простои на обедах на 35% за счёт разделения потоков",
      "Увеличили удовлетворённость персонала с 62% до 89%",
      "Автоматизировали учёт через GastroPrime CRM",
    ],
    testimonial: {
      text: "Относятся к задаче как к партнёрству, а не как к поставке. Если меняется график — реагируют за час, а не за день.",
      name: "Сергей, начальник производства",
    },
    tags: ["завод", "трёхразовое", "340 человек"],
  },
  {
    id: "office-complex",
    industry: "Офисный центр",
    company: "Бизнес-парк «Арена»",
    location: "Москва, МКАД 24 км",
    employees: 480,
    mealsPerDay: 420,
    format: "Комплексные обеды по системе шведский стол",
    period: "январь 2025 — настоящее время",
    result: [
      "Запустили за 5 рабочих дней с момента обращения",
      "Гибкое меню с ротацией каждые 2 недели без дублей",
      "Постоплата раз в месяц — удобная отчётность для бухгалтерии",
    ],
    testimonial: {
      text: "Сменили трёх поставщиков за два года. GastroPrime — первый, с кем работаем уже полгода и не хотим менять.",
      name: "Елена, руководитель административного отдела",
    },
    tags: ["офис", "шведский стол", "бизнес-центр"],
  },
  {
    id: "construction-site",
    industry: "Строительство",
    company: "ГК «МонолитСтрой»",
    location: "г. Москва, ЖК «Зиларт»",
    employees: 200,
    mealsPerDay: 600,
    format: "Термодоставка + полевая кухня",
    period: "февраль 2025 — настоящее время",
    result: [
      "Полевая кухня на объекте — горячее питание без отрыва от работы",
      "Плотный завтрак и обед для рабочих с 06:00 до 20:00",
      "Все документы ХАССП и Меркурий — для прохождения проверок",
    ],
    testimonial: {
      text: "Стройка — это постоянные изменения. GastroPrime подстраивается под смену графиков без вопросов и доплат.",
      name: "Андрей, прораб",
    },
    tags: ["стройка", "полевая кухня", "200 человек"],
  },
  {
    id: "warehouse-logistics",
    industry: "Складской комплекс",
    company: "Логистический центр «Южный»",
    location: "г. Домодедово, МО",
    employees: 150,
    mealsPerDay: 300,
    format: "Развозка по зонам + термосная доставка",
    period: "март 2025 — настоящее время",
    result: [
      "Питание для ночной смены 23:00–07:00 без перебоев",
      "Развозка по 4 зонам склада — сотрудникам не нужно отходить от поста",
      "Снизили текучесть персонала за счёт горячего питания на рабочих местах",
    ],
    testimonial: {
      text: "Раньше ночная смена питалась всухомятку из автоматов. Теперь горячие обеды — и люди держатся за место.",
      name: "Дмитрий, руководитель склада",
    },
    tags: ["склад", "ночные смены", "термосы"],
  },
  {
    id: "event-catering",
    industry: "Мероприятия",
    company: "Event-агентство «Формат»",
    location: "Москва и МО",
    employees: 0,
    mealsPerDay: 350,
    format: "Выездной кейтеринг / BBQ",
    period: "разовые мероприятия, июнь–сентябрь 2025",
    result: [
      "Корпоратив на 350 человек — от заявки до подачи за 4 дня",
      "Шеф-повар с мангалом на выезде — мясо, овощи, соусы собственного приготовления",
      "Полное пост-событие: уборка, вывоз инвентаря, ноль хлопот для заказчика",
    ],
    testimonial: {
      text: "Клиенты были в восторге от BBQ. Шеф лично всё контролировал, сервис на уровне ресторана — под открытым небом.",
      name: "Мария, продюсер мероприятий",
    },
    tags: ["кейтеринг", "BBQ", "корпоратив"],
  },
];

export default function CasesPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-900 to-black pb-28 pt-32 sm:pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <FadeIn>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Кейсы
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-zinc-400">
              Реальные проекты, которыми мы гордимся. Не «воркшопы» и не «дизайн-мышление» — просто работа, которая приносит результат.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Cases */}
      <section className="relative -mt-20 pb-32">
        <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
          {cases.map((c, i) => (
            <FadeIn key={c.id} delay={i * 100}>
              <div
                id={c.id}
                className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-8 transition-all duration-500 hover:border-amber-800/50 sm:p-12"
              >
                {/* Tags */}
                <div className="mb-6 flex flex-wrap gap-2">
                  {c.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-amber-800/30 bg-amber-900/20 px-3 py-1 text-xs font-medium text-amber-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
                  {/* Left — main content */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-500">
                      {c.industry}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{c.company}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{c.location}</p>

                    <p className="mt-2 text-sm font-medium text-zinc-400">
                      Формат: <span className="text-white">{c.format}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-500">{c.period}</p>

                    {/* Stats */}
                    <div className="mt-6 flex gap-8">
                      <div>
                        <div className="text-2xl font-bold text-amber-400">{c.employees}</div>
                        <div className="text-xs text-zinc-500">{c.industry === "Мероприятия" ? "гостей" : "сотрудников"}</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-amber-400">{c.mealsPerDay}</div>
                        <div className="text-xs text-zinc-500">порций в день</div>
                      </div>
                    </div>

                    {/* Results */}
                    <ul className="mt-6 space-y-3">
                      {c.result.map((r, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-zinc-300">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right — testimonial */}
                  <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                    <svg className="h-6 w-6 text-amber-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <blockquote className="mt-4 text-sm leading-relaxed text-zinc-300">
                      «{c.testimonial.text}»
                    </blockquote>
                    <p className="mt-4 text-xs text-zinc-500">— {c.testimonial.name}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-zinc-800 bg-gradient-to-b from-zinc-900 to-black py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Хотите так же?
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Расскажите о вашей задаче — подберём формат за один день.
            </p>
            <div className="mt-10">
              <LeadForm />
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
