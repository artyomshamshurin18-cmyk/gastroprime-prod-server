"use client";

import { useState, FormEvent, useCallback } from "react";

type LeadFormProps = {
  title?: string;
  description?: string;
  compact?: boolean;
};

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits === "7" || digits === "8") return "+7 ";
  let result = digits[0] === "8" ? "+7 " : "+7 ";
  const rest = digits.startsWith("7") || digits.startsWith("8") ? digits.slice(1) : digits;
  if (rest.length > 0) result += "(" + rest.slice(0, 3);
  if (rest.length > 3) result += ") " + rest.slice(3, 6);
  if (rest.length > 6) result += "-" + rest.slice(6, 8);
  if (rest.length > 8) result += "-" + rest.slice(8, 10);
  return result;
}

export function LeadForm({
  title = "Оставить заявку на дегустацию или расчёт",
  description = "Заполните форму — мы свяжемся с вами в течение 2 часов и предложим оптимальный формат питания.",
  compact = false,
}: LeadFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [task, setTask] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!name.trim()) {
      setError("Укажите имя");
      return;
    }
    if (cleanPhone.length < 11) {
      setError("Укажите корректный номер телефона");
      return;
    }
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/lead/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: company.trim() || name.trim(),
          contactPerson: name.trim(),
          phone: `+${cleanPhone}`,
          notes: task.trim() || "Заявка с сайта",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка отправки");
      }

      setDone(true);
    } catch (err: any) {
      setError(err.message || "Ошибка сети. Попробуйте позже.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-4 text-xl font-bold text-green-800">Заявка отправлена! ✅</h3>
        <p className="mt-2 text-green-700">Мы свяжемся с вами в ближайшее время.</p>
        <button
          onClick={() => { setDone(false); setName(""); setPhone(""); setCompany(""); setTask(""); }}
          className="mt-4 text-sm font-medium text-green-600 underline hover:text-green-800"
        >
          Отправить ещё одну
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? "p-6" : "p-6 sm:p-10"}`}>
      <div className="space-y-3">
        <h3 className={`font-bold tracking-tight text-slate-950 ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
          {title}
        </h3>
        <p className={`leading-relaxed text-slate-500 ${compact ? "text-sm" : "text-base"}`}>
          {description}
        </p>
      </div>
      <form className={`grid gap-4 ${compact ? "mt-4" : "mt-8"} sm:grid-cols-2`} onSubmit={handleSubmit} noValidate>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          <span>Ваше имя <span className="text-red-500">*</span></span>
          <input
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:bg-white focus:shadow-sm"
            placeholder="Иван Петров"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          <span>Телефон <span className="text-red-500">*</span></span>
          <input
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:bg-white focus:shadow-sm"
            placeholder="+7 (999) 123-45-67"
            value={phone}
            onChange={handlePhoneChange}
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
          <span>Компания / объект</span>
          <input
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:bg-white focus:shadow-sm"
            placeholder="Офис, склад, стройка, производство…"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
          <span>Что нужно?</span>
          <textarea
            className={`rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:bg-white focus:shadow-sm ${compact ? "min-h-[80px]" : "min-h-[100px]"}`}
            placeholder="Сколько человек, график работы, особые пожелания…"
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
        </label>
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">
            <span>⚠️</span> {error}
          </div>
        )}
        <button
          type="submit"
          disabled={sending}
          className="col-span-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-amber-500/25 transition-all duration-300 hover:from-amber-400 hover:to-amber-500 hover:scale-[1.02] hover:shadow-amber-500/40 active:scale-[0.98] disabled:opacity-60"
        >
          {sending ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Отправляем…
            </>
          ) : (
            <>
              🚀 Отправить заявку
            </>
          )}
        </button>
        <p className="col-span-full text-center text-xs text-slate-400">
          Нажимая кнопку, вы соглашаетесь с <a href="/offer" className="text-amber-600 underline">политикой обработки данных</a>
        </p>
      </form>
    </div>
  );
}
