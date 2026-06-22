import Link from "next/link";
import { FadeIn, AnimatedNumber, PulseButton } from "@/components/animations";
import { PhotoGrid } from "@/components/photo-grid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Корпоративное питание в Москве | Gastroprime",
  description: "Доставка обедов в офисы, на стройки, склады и производства. Gastroprime — горячее питание для вашего бизнеса.",
  openGraph: {
    title: "Корпоративное питание в Москве",
    description: "Доставка обедов в офисы, на стройки, склады и производства. Gastroprime — горячее питание для вашего бизнеса.",
    siteName: "Gastroprime",
  },
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        <div className="absolute inset-0">
          <img src="/file_162.jpg" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="grid gap-16 lg:grid-cols-[1.3fr,0.9fr] lg:items-center">
            <FadeIn className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Фабрика-кухня нового поколения
              </div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Корпоративное питание в офисы, на производство и стройки.<br />
                <span className="text-amber-400">Мы даём решение по организации питания</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Собственное производство в Дмитрове. 600 м² цехов, HACCP, своя логистика.
              </p>
              <div className="flex flex-wrap gap-4">
                <PulseButton href="/request/" className="bg-amber-500 shadow-lg shadow-amber-500/25 hover:bg-amber-400">
                  Запросить КП
                </PulseButton>
                <Link href="/about/" className="rounded-full border border-slate-600 px-7 py-3.5 text-base font-medium text-slate-300 transition hover:border-amber-500 hover:text-white">
                  О компании
                </Link>
              </div>
            </FadeIn>
            <FadeIn delay={200} className="grid gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400"><AnimatedNumber value={5000} suffix="+" /></div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">порций в день</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400"><AnimatedNumber value={100} suffix="+" /></div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">корпоративных клиентов</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400"><AnimatedNumber value={600} /></div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">м² собственного производства</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-3xl font-bold text-amber-400"><AnimatedNumber value={2023} /></div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">год основания</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent p-4">
                  <p className="text-xs font-medium text-amber-400">★ HACCP — контроль качества на каждом этапе</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
