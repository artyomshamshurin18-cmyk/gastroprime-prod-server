import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { caseMap, cases } from "@/content/cases";
import { siteUrl } from "@/content/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return cases.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const currentCase = caseMap[slug];

  if (!currentCase) return {};

  return {
    title: currentCase.title,
    description: currentCase.challenge,
    alternates: { canonical: `/cases/${currentCase.slug}` },
    openGraph: {
      title: currentCase.title,
      description: currentCase.challenge,
      url: `${siteUrl}/cases/${currentCase.slug}`,
    },
  };
}

export default async function CasePage({ params }: PageProps) {
  const { slug } = await params;
  const currentCase = caseMap[slug];

  if (!currentCase) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <Link href="/cases" className="text-sm text-slate-500 transition hover:text-slate-950">← Ко всем кейсам</Link>
      <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">{currentCase.segment}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{currentCase.title}</h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">{currentCase.challenge}</p>
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <SectionHeading eyebrow="Решение" title="Что сделал Gastroprime" />
          <ul className="mt-6 grid gap-4 text-sm leading-7 text-slate-600">
            {currentCase.solution.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <SectionHeading eyebrow="Результат" title="Что получил клиент" />
          <ul className="mt-6 grid gap-4 text-sm leading-7 text-slate-700">
            {currentCase.result.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
