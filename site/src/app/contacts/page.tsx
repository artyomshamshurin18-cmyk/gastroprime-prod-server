import type { Metadata } from "next";
import { LeadForm } from "@/components/lead-form";
import { SectionHeading } from "@/components/section-heading";
import { company } from "@/content/site";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Контакты Gastroprime и черновик будущей страницы связи без Tilda и технических хвостов.",
};

export default function ContactsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <SectionHeading
        eyebrow="Контакты"
        title="Чистая контактная страница вместо разрозненных блоков и дублирующихся адресов"
        description="На следующем этапе сюда можно добавить карту, график логистики, SLA по ответам и разные CTA для разных сценариев обращения."
      />
      <div className="mt-10 grid gap-6 lg:grid-cols-[0.8fr,1.2fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-4 text-sm leading-7 text-slate-600">
            <p><span className="font-semibold text-slate-950">Телефон:</span> {company.phone}</p>
            <p><span className="font-semibold text-slate-950">Email:</span> {company.email}</p>
            <p><span className="font-semibold text-slate-950">География:</span> {company.city}</p>
            <p><span className="font-semibold text-slate-950">Адрес:</span> {company.address}</p>
            <p><span className="font-semibold text-slate-950">Юр. лицо:</span> {company.legalName}</p>
          </div>
        </div>
        <LeadForm title="Связаться с Gastroprime" description="В этой форме можно будет разделять лиды: офис, склад, стройка, производство, госучреждение или рационы." />
      </div>
    </main>
  );
}
