import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────── Button ───────── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 font-bold rounded-ui transition-colors disabled:opacity-50 disabled:pointer-events-none select-none";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-strong",
  secondary: "bg-surface text-primary border-2 border-primary hover:bg-primary-50",
  ghost: "text-ink hover:bg-primary-50",
  danger: "bg-danger text-white hover:opacity-90",
  link: "text-primary underline underline-offset-4 hover:text-primary-strong px-0",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-base",
  lg: "min-h-13 px-6 text-lg",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(buttonBase, buttonVariants[variant], variant !== "link" && buttonSizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

/* ───────── Card ───────── */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-surface rounded-card shadow-card border border-line", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  icon,
  action,
  as: Heading = "h2",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex items-start gap-3 p-5 pb-3">
      {icon && <div className="mt-0.5 shrink-0 text-primary" aria-hidden>{icon}</div>}
      <div className="min-w-0 flex-1">
        <Heading className="text-lg font-bold text-navy leading-tight">{title}</Heading>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ───────── Badge ───────── */
type Tone = "success" | "danger" | "warning" | "info" | "neutral" | "accent";
const tones: Record<Tone, string> = {
  success: "bg-primary-50 text-primary-strong border-primary-200",
  danger: "bg-danger-50 text-danger border-danger/30",
  warning: "bg-warning-50 text-warning border-warning/30",
  info: "bg-info-50 text-info border-info/20",
  neutral: "bg-canvas text-muted border-line",
  accent: "bg-accent-50 text-ink border-accent",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", tones[tone], className)}
      {...props}
    />
  );
}

/** Oznaczenie funkcji wspieranej przez AI (wymóg F9). */
export function AiBadge({ className }: { className?: string }) {
  return (
    <Badge tone="info" className={className} title="Funkcja wykorzystuje sztuczną inteligencję">
      <Sparkles aria-hidden className="size-3" />
      AI<span className="sr-only"> — funkcja wspierana przez sztuczną inteligencję</span>
    </Badge>
  );
}

/* ───────── Form fields ───────── */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const hintId = htmlFor && hint ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  // Wiążemy podpowiedź i błąd z polem (error-placement + aria-describedby).
  const control =
    React.isValidElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>(children) && describedBy
      ? React.cloneElement(children, { "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })
      : children;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-bold text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="-mt-0.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "min-h-11 w-full rounded-ui border-2 border-line bg-surface px-3 text-base text-ink placeholder:text-muted/70 hover:border-muted focus:border-primary focus:outline-none tabular";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  },
);

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, "pr-8", className)} {...props} />;
}

/* ───────── Choice cards (radio as cards) ───────── */
export function ChoiceGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  legend,
  columns = 2,
}: {
  name: string;
  value: T | undefined;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; description?: React.ReactNode; icon?: React.ReactNode }[];
  legend: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}) {
  // container queries: liczba kolumn zależy od szerokości kolumny formularza, nie okna
  const cols = { 1: "", 2: "@lg:grid-cols-2", 3: "@xl:grid-cols-3", 4: "@lg:grid-cols-2 @4xl:grid-cols-4" }[columns];
  return (
    <fieldset className="@container min-w-0">
      <legend className="mb-2 text-sm font-bold text-ink">{legend}</legend>
      <div className={cn("grid gap-2", cols)}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-ui border-2 bg-surface p-3 transition-colors",
                checked ? "border-primary bg-primary-50" : "border-line hover:border-muted",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="mt-1 size-4 accent-[var(--c-primary)]"
              />
              {o.icon && <span className="mt-0.5 text-primary" aria-hidden>{o.icon}</span>}
              <span className="min-w-0">
                <span className="block font-bold leading-snug">{o.label}</span>
                {o.description && <span className="mt-0.5 block text-sm text-muted">{o.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  id: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block font-bold">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          // after: rozszerza pole dotyku do ≥ 44 px bez powiększania przełącznika (touch-target-size)
          "relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors after:absolute after:-inset-2 after:content-['']",
          // wyłączony: obrys o kontraście ≥ 3:1 (WCAG 1.4.11), nie blady szary
          checked ? "bg-primary border-primary" : "bg-surface border-muted",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full shadow transition-transform",
            checked ? "translate-x-5 bg-white" : "translate-x-0.5 bg-muted",
          )}
        />
        <span className="sr-only">{checked ? "włączone" : "wyłączone"}</span>
      </button>
    </div>
  );
}

/* ───────── Callout ───────── */
export function Callout({
  tone = "info",
  title,
  icon,
  children,
  className,
}: {
  tone?: Tone;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const border: Record<Tone, string> = {
    success: "border-l-primary bg-primary-50",
    danger: "border-l-danger bg-danger-50",
    warning: "border-l-warning bg-warning-50",
    info: "border-l-info bg-info-50",
    neutral: "border-l-muted bg-canvas",
    accent: "border-l-accent bg-accent-50",
  };
  return (
    <div className={cn("rounded-ui border-l-4 p-4", border[tone], className)}>
      <div className="flex gap-3">
        {icon && <span className="mt-0.5 shrink-0" aria-hidden>{icon}</span>}
        <div className="min-w-0">
          {title && <p className="font-bold leading-snug">{title}</p>}
          {children && <div className={cn("text-sm", title && "mt-1")}>{children}</div>}
        </div>
      </div>
    </div>
  );
}
