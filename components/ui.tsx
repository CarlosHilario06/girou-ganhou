"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "gold" | "ghost" | "outline";
  size?: "md" | "lg";
  loading?: boolean;
};

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-accent-contrast shadow-lg shadow-brand-500/25 hover:brightness-110",
  gold: "bg-gold text-brand-950 shadow-lg shadow-gold/30 hover:brightness-105",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink",
  outline:
    "border border-line-strong bg-surface text-ink hover:border-accent hover:text-accent",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 ${
        size === "lg" ? "px-7 py-4 text-base" : "px-5 py-3 text-sm"
      } ${VARIANTS[variant]} ${className}`}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-line bg-surface/85 p-6 shadow-xl shadow-brand-900/5 backdrop-blur-xl dark:shadow-black/40 ${className}`}
    >
      {children}
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, id, className = "", ...props }: FieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </span>
      <input
        id={id}
        {...props}
        className={`w-full rounded-2xl border border-line bg-surface-2 px-4 py-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-accent focus:bg-surface ${className}`}
      />
      {hint ? (
        <span className="mt-1.5 block text-xs text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function Badge({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "gold" | "green";
}) {
  const tones = {
    brand: "border-accent/30 bg-accent/10 text-accent",
    gold: "border-gold/40 bg-gold/15 text-gold",
    green: "border-festa-green/40 bg-festa-green/15 text-festa-green",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
