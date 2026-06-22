import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/lead-form";
import { SectionHeading } from "@/components/section-heading";
import { siteUrl, solutionMap, solutions } from "@/content/site";

type PageProps = {
  params: Promise<{ solutionSlug: string }>;
};

export async function generateStaticParams() {
  return solutions.map((solution) => ({ solutionSlug: solution.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { solutionSlug } = await params;
  const solution = solutionMap[solutionSlug];

  if (!solution) {
    return {};
  }

  return {
    title: solution.seoTitle,
    description: solution.seoDescription,
    alternates: {
      canonical: `/${solution.slug}`,
    },
    openGraph: {
      title: solution.seoTitle,
      description: solution.seoDescription,
      url: `${siteUrl}/${solution.slug}`,
    },
  };
}

export default async function SolutionPage({ params }: PageProps) {
  const { solutionSlug } = await params;
  const solution = solutionMap[solutionSlug];

  if (!solution) notFound();

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-950">← На главную</Link>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-start">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">{solution.shortLabel}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">{solution.heroTitle}</h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">{solution.heroSubtitle}</p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">{solution.minimumOrder}</div>
              {solution.idealFor.map((item) => (
                <div key={item} className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Что надо показать на этой странице</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-7 text-slate-600">
              {solution.proof.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Боли сегмента</h2>
            <ul className="mt-6 grid gap-4 text-sm leading-7 text-slate-700">
              {solution.pains.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Что должно обещать GastroPrime</h2>
            <ul className="mt-6 grid gap-4 text-sm leading-7 text-slate-700">
              {solution.outcomes.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Примеры питания"
          title="Форматы комплексов и предложения под сегмент"
          description="На следующем этапе сюда можно подтянуть реальные примеры меню, фотографии, калорийность, бюджеты и PDF-коммерческие предложения."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {solution.sampleMenu.map((item) => (
            <div key={item.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600">{item.price}</div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{item.name}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="FAQ"
            title="Вопросы по этому сегменту"
            description="Такую структуру легко расширять, а это значит, что SEO-контент и продажи можно масштабировать быстро и аккуратно."
          />
          <div className="mt-10 grid gap-4">
            {solution.faq.map((item) => (
              <div key={item.question} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-950">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <LeadForm title="Обсудить запуск питания на объекте" description="Здесь будет точка захвата лидов именно под этот сегмент. Можно подключить в backend, Telegram, CRM или в ваш личный кабинет." />
      </section>
    </main>
  );
}
