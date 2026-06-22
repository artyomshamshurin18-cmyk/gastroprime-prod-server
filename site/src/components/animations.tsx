"use client";

import { useEffect, useRef, useState } from "react";

// Fade In при скролле
export function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Анимация цифр (счётчик)
export function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let frame = 0;
    const totalFrames = 60;
    const step = value / totalFrames;

    const animate = () => {
      frame++;
      const next = Math.min(Math.round(step * frame), value);
      setDisplayed(next);
      if (frame < totalFrames) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, value]);

  return <span ref={ref}>{displayed}{suffix}</span>;
}

// Параллакс
export function Parallax({ children, speed = 0.3 }: { children: React.ReactNode; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const offset = rect.top * speed;
      el.style.transform = `translateY(${offset}px)`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return <div ref={ref}>{children}</div>;
}

// Пульсирующая кнопка
export function PulseButton({ children, href, className = "" }: { children: React.ReactNode; href: string; className?: string }) {
  return (
    <a
      href={href}
      className={`relative inline-block overflow-hidden rounded-full font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 ${className}`}
    >
      <span className="relative z-10 block px-7 py-3.5">{children}</span>
      <span className="absolute inset-0 animate-pulse rounded-full bg-white/20"></span>
    </a>
  );
}
