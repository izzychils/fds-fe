import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, Star, X } from "lucide-react";
import { glassMorphism } from "@/lib/glass-morphism";
import { cn } from "@/lib/utils";
import { useLockBodyScroll } from "@/hooks";

/* ------------------------------------------------------------------ types */

export type Tone = "primary" | "success" | "warning" | "destructive" | "info" | "muted";

export const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-primary/20 text-primary-ink border-primary/40",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/30",
  destructive: "bg-destructive/12 text-destructive border-destructive/25",
  info: "bg-info/12 text-info border-info/25",
  muted: "bg-muted text-muted-foreground border-border",
};

/* ---------------------------------------------------------------- Button */

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "glass";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/25 border border-primary/40",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
  outline: "border border-border bg-transparent hover:bg-accent text-foreground",
  ghost: "border border-transparent hover:bg-accent text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive/40",
  glass: cn(
    glassMorphism.tab,
    glassMorphism.hover,
    "text-foreground rounded-full",
  ),
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10 justify-center",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Card */

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-card shadow-sm", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * The glassmorphism surface. The class strings come from the EXACT module
 * ported out of `frontend_v0/src/lib/glass-morphism.ts` — no re-invented blur
 * values anywhere in this codebase.
 */
export function GlassCard({
  className,
  children,
  intensity = "card",
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { intensity?: "base" | "card" | "cardStrong" | "modal" | "light" }) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        glassMorphism[intensity],
        intensity === "card" && "rounded-2xl",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
  className,
  id,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-extrabold tracking-tight sm:text-xl">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ----------------------------------------------------------------- Badge */

export function Badge({
  tone = "muted",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-xs font-extrabold text-primary-ink",
        className,
      )}
      aria-hidden={src ? undefined : true}
    >
      {src ? <img src={src} alt={name} className="img-cover" /> : (initials || "?")}
    </span>
  );
}

/* ----------------------------------------------------------------- Forms */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Shared control chrome. Focus is communicated by the BORDER COLOUR alone — the
 * 2px border moves from a soft neutral to brand green, and the browser outline
 * is removed. `:focus` (not `:focus-visible`) is deliberate here: it keeps the
 * affordance identical whether the field was reached by mouse or keyboard.
 */
const CONTROL_BASE =
  "w-full rounded-xl border-2 border-border/70 bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 hover:border-border focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

export const Input = ({
  className,
  invalid,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) => (
  <input
    className={cn(
      CONTROL_BASE,
      invalid && "border-destructive/60 focus:border-destructive",
      className,
    )}
    aria-invalid={invalid || undefined}
    {...rest}
  />
);

export const Textarea = ({
  className,
  invalid,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) => (
  <textarea
    className={cn(
      CONTROL_BASE,
      "min-h-24 resize-y",
      invalid && "border-destructive/60 focus:border-destructive",
      className,
    )}
    aria-invalid={invalid || undefined}
    {...rest}
  />
);

export const Select = ({
  className,
  invalid,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) => (
  <select
    className={cn(
      CONTROL_BASE,
      "appearance-none bg-[right_0.75rem_center] pr-9",
      invalid && "border-destructive/60 focus:border-destructive",
      className,
    )}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
    }}
    {...rest}
  >
    {children}
  </select>
);

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={inputId} className="block text-sm font-semibold">
          {label}
        </label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <button
        type="button"
        id={inputId}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          checked ? "border-primary bg-primary" : "border-border bg-muted",
          disabled && "opacity-50",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  price,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  price?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
        checked ? "border-primary/50 bg-primary/8" : "border-border hover:bg-accent/60",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">{label}</span>
          {price ? <span className="shrink-0 text-sm font-bold text-primary-ink">{price}</span> : null}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

/* ---------------------------------------------------------------- Ratings */

export function Rating({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const starSize = size === "md" ? "size-4" : "size-3.5";
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star className={cn(starSize, "fill-amber-400 text-amber-400")} aria-hidden />
      <span className="text-xs font-bold">{value > 0 ? value.toFixed(1) : "New"}</span>
      {count !== undefined ? (
        <span className="text-xs text-muted-foreground">
          ({count} {count === 1 ? "review" : "reviews"})
        </span>
      ) : null}
      <span className="sr-only">
        {value > 0 ? `Rated ${value.toFixed(1)} out of 5` : "Not yet rated"}
      </span>
    </span>
  );
}

export function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          onClick={() => onChange(star)}
          className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            className={cn(
              "size-7",
              star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Stepper */

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  label = "Quantity",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
}) {
  const dimension = size === "sm" ? "size-7" : "size-9";
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-colors hover:bg-accent disabled:opacity-40",
          dimension,
        )}
      >
        <Minus className="size-3.5" aria-hidden />
      </button>
      <span aria-live="polite" className="min-w-6 text-center text-sm font-bold">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40",
          dimension,
        )}
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- Modal */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // Move focus into the dialog for keyboard and screen-reader users.
    const timer = setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        "input,select,textarea,button,[href],[tabindex]:not([tabindex='-1'])",
      );
      focusable?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-primary-deep/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/40 bg-card p-5 shadow-2xl custom-scrollbar sm:rounded-3xl sm:p-6",
          width,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Destructive confirmation, so nothing irreversible happens on one click. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  destructive = true,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "primary"} loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ Tabs */

interface TabsContextValue {
  value: string;
  setValue: (next: string) => void;
  baseId: string;
}
const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (next: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const baseId = useId();
  const ctx = useMemo(() => ({ value, setValue: onValueChange, baseId }), [value, onValueChange, baseId]);
  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        "no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-white/40 bg-white/40 p-1 backdrop-blur-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Tab({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.baseId}-tab-${value}`}
      aria-selected={active}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      className="animate-stagger-fade-in pt-4"
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- Table */

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-x-auto custom-scrollbar", className)}>
      <table className="w-full min-w-[36rem] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-border/60 px-3 py-3 align-middle", className)}>{children}</td>;
}

/* ----------------------------------------------------------- Empty/Loading */

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      {icon ? (
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-bold">{title}</h3>
      {message ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} aria-hidden />;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------ Pagination */

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (next: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-2 pt-6" aria-label="Pagination">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      <span className="px-2 text-sm font-semibold">
        Page {page} of {pageCount}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </nav>
  );
}

/* --------------------------------------------------------------- Toolbar */

/**
 * Dashboard metric tile.
 *
 * Icon first and circular, value set large: the same rhythm the reference
 * dashboard screens use, and it keeps every tile the same height whether it has
 * an icon, a hint or neither.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <GlassCard
      intensity="card"
      className="p-4 transition-transform duration-300 hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full border",
              TONE_CLASSES[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
    </GlassCard>
  );
}

export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    toggle: () => setOpen((prev) => !prev),
  };
}

/** Kept for future drag-driven reordering of banners and menu sections. */
export function useReorder<T>(initial: T[]) {
  const [items, setItems] = useState(initial);
  const move = (from: number, to: number) => {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  return { items, setItems, move };
}
