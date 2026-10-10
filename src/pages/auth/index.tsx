import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  Eye,
  EyeOff,
  KeyRound,
  ShoppingBag,
  Store,
} from "lucide-react";
import type { DietaryPreference, Role } from "@/types";
import { Button, Card, Field, GlassCard, Input, Textarea } from "@/components/ui";
import { Logo } from "@/components/layout/public";
import { cn } from "@/lib/utils";
import { useAsyncAction, useDb } from "@/hooks";
import { authService, isOrderable } from "@/services";
import { homeRouteFor } from "@/services/guards";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/data/seed";
import { DIETARY_PREFERENCES } from "@/types";

/* ------------------------------------------------------------ auth shell */

function AuthShell({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const db = useDb();
  const heroImage =
    db.foods.find((food) => isOrderable(food) && food.image.includes("venue"))?.image ??
    db.foods[0]?.image ??
    "/foods/venue-dining.jpg";

  return (
    <div className="app-ambient min-h-dvh">
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl gap-0 lg:grid-cols-2 lg:gap-8 lg:p-6">
        {/* Dark green brand panel, the reference image used for sign-up */}
        <aside className="relative hidden overflow-hidden lg:block lg:rounded-3xl">
          <img src={heroImage} alt="" className="img-cover absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary-deep/92 via-primary-deep/80 to-primary-deep/95" />
          <div className="relative flex h-full flex-col justify-between p-8 text-white">
            <Link to="/" aria-label="Back to Food Delivery System">
              <span className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xl">
                  <ChefHat className="size-5" aria-hidden />
                </span>
                <span className="text-base font-extrabold tracking-tight">Food Delivery System</span>
              </span>
            </Link>

            <div>
              <h2 className="max-w-md text-3xl font-extrabold leading-tight">
                Fast delivery of delicious food.
              </h2>
              <p className="mt-3 max-w-md text-sm text-white/75">
                Order within days, track every stage, and customise every plate with your own protein
                and extras.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  "Dish-first discovery across independent kitchens",
                  "Real protein, extra and serving-size customization",
                  "Shared order tracking for customers, kitchens and merchants",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/85">
                    <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-white/55">
              Development build, authentication is served by a local mock adapter, not a production
              identity service.
            </p>
          </div>
        </aside>

        {/* Form panel */}
        <main className="flex items-center justify-center px-4 py-8 lg:py-0">
          <div className={cn("w-full", wide ? "max-w-2xl" : "max-w-md")}>
            <div className="mb-6 lg:hidden">
              <Link to="/">
                <Logo />
              </Link>
            </div>
            <GlassCard intensity="cardStrong" className="rounded-3xl p-6 sm:p-7">
              <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              <div className="mt-6">{children}</div>
            </GlassCard>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary">
                ← Back to the storefront
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  invalid,
  placeholder = "At least 8 characters",
  autoComplete = "new-password",
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        invalid={invalid}
        placeholder={placeholder}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-accent"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- sign in */

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { run, pending } = useAsyncAction();
  const params = new URLSearchParams(location.search);
  const next = params.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    await run(
      () => authService.signIn(email, password),
      {
        success: "Welcome back",
        onSuccess: (user) => navigate(next ?? homeRouteFor(user.role), { replace: true }),
        silentError: true,
      },
    ).then((user) => {
      if (!user) setFormError("That email and password combination is not recognised.");
    });
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setErrors({});
    setFormError(null);
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to order, track deliveries and manage your account."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {formError ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {formError}
          </p>
        ) : null}

        <Field label="Email address" required error={errors.email} htmlFor="signin-email">
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            invalid={Boolean(errors.email)}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password" required error={errors.password} htmlFor="signin-password">
          <PasswordInput
            id="signin-password"
            value={password}
            onChange={setPassword}
            invalid={Boolean(errors.password)}
            placeholder="Your password"
            autoComplete="current-password"
          />
        </Field>

        <div className="flex items-center justify-between gap-2">
          <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
            Forgot your password?
          </Link>
          <Link to="/sign-up" className="text-xs font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={pending}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
          <KeyRound className="size-3.5" aria-hidden /> Development sign-in
        </p>
        <p className="mt-1 text-[11px] text-amber-800/90">
          These are seeded demo accounts on the local mock adapter. Password for all of them:{" "}
          <strong>{DEMO_PASSWORD}</strong>. This is not production authentication.
        </p>
        <div className="mt-2 grid gap-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => quickFill(account.email)}
              className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-white/70 px-3 py-2 text-left text-[11px] font-semibold transition-colors hover:bg-white"
            >
              <span className="truncate">{account.label}</span>
              <span className="shrink-0 text-muted-foreground">use</span>
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}

/* --------------------------------------------------------------- sign up */

export function SignUpPage() {
  const navigate = useNavigate();
  const { run, pending } = useAsyncAction();
  const [role, setRole] = useState<Extract<Role, "customer" | "vendor">>("customer");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [dietary, setDietary] = useState<DietaryPreference[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Enter your full name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) nextErrors.email = "Enter a valid email.";
    if (!form.phone.trim()) nextErrors.phone = "Enter a phone number.";
    if (form.password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const user = await run(
      () =>
        authService.signUpCustomer({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          confirmPassword: form.confirmPassword,
          dietaryPreferences: dietary,
        }),
      { success: "Account created, welcome to Food Delivery System", silentError: true },
    );
    if (user) navigate("/app", { replace: true });
    else setFormError("We couldn't create that account. Try a different email address.");
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Order food, save addresses and track every delivery."
      wide
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {formError ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
          >
            {formError}
          </p>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">I want to</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  value: "customer" as const,
                  icon: ShoppingBag,
                  title: "Order food",
                  body: "A customer account to browse and order.",
                },
                {
                  value: "vendor" as const,
                  icon: Store,
                  title: "Sell food",
                  body: "Register a kitchen and manage its menu.",
                },
              ]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={role === option.value}
                onClick={() => {
                  if (option.value === "vendor") {
                    navigate("/vendor-signup");
                    return;
                  }
                  setRole(option.value);
                }}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-3 text-left transition-all",
                  role === option.value
                    ? "border-primary bg-primary/8 shadow-sm"
                    : "border-border hover:bg-accent/60",
                )}
              >
                <option.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="block text-sm font-bold">{option.title}</span>
                  <span className="block text-xs text-muted-foreground">{option.body}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Administrator access cannot be self-assigned. Merchant roles are granted by an existing
            platform administrator.
          </p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.fullName} htmlFor="signup-name">
            <Input
              id="signup-name"
              value={form.fullName}
              autoComplete="name"
              onChange={(event) => set("fullName")(event.target.value)}
              invalid={Boolean(errors.fullName)}
              placeholder="Adaeze Okafor"
            />
          </Field>
          <Field label="Phone number" required error={errors.phone} htmlFor="signup-phone">
            <Input
              id="signup-phone"
              type="tel"
              value={form.phone}
              autoComplete="tel"
              onChange={(event) => set("phone")(event.target.value)}
              invalid={Boolean(errors.phone)}
              placeholder="0803 000 0000"
            />
          </Field>
        </div>

        <Field label="Email address" required error={errors.email} htmlFor="signup-email">
          <Input
            id="signup-email"
            type="email"
            value={form.email}
            autoComplete="email"
            onChange={(event) => set("email")(event.target.value)}
            invalid={Boolean(errors.email)}
            placeholder="you@example.com"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" required error={errors.password} htmlFor="signup-password">
            <PasswordInput
              id="signup-password"
              value={form.password}
              onChange={set("password")}
              invalid={Boolean(errors.password)}
            />
          </Field>
          <Field
            label="Confirm password"
            required
            error={errors.confirmPassword}
            htmlFor="signup-confirm"
          >
            <PasswordInput
              id="signup-confirm"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              invalid={Boolean(errors.confirmPassword)}
            />
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">
            Dietary preferences <span className="font-normal text-muted-foreground">(optional)</span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {DIETARY_PREFERENCES.map((preference) => {
              const active = dietary.includes(preference);
              return (
                <button
                  key={preference}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setDietary((prev) =>
                      active ? prev.filter((p) => p !== preference) : [...prev, preference],
                    )
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary/12 text-primary"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {preference}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            These filter what we recommend and are used by the recommendation engine.
          </p>
        </fieldset>

        <Button type="submit" fullWidth size="lg" loading={pending}>
          Create account
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/sign-in" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

/* ------------------------------------------------------- vendor sign up */

const STEPS = ["Your account", "Your kitchen", "Delivery terms"] as const;

export function VendorSignUpPage() {
  const navigate = useNavigate();
  const db = useDb();
  const { run, pending } = useAsyncAction();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    tagline: "",
    description: "",
    address: "",
    area: "",
    city: "Abuja",
    state: "FCT",
    businessPhone: "",
    prepTimeMinutes: 25,
    deliveryFee: 1500,
    deliveryRadiusKm: 10,
    coverImage: "/foods/venue-dining.jpg",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const coverOptions = useMemo(
    () => [
      "/foods/venue-dining.jpg",
      "/foods/venue-patio.jpg",
      "/foods/party-burger-platter.jpg",
      "/foods/burger-wings-fries.jpg",
      "/foods/sandwich-platter.jpg",
      "/foods/pepperoni-pizza.jpg",
    ],
    [],
  );

  const validateStep = (index: number) => {
    const nextErrors: Record<string, string> = {};
    if (index === 0) {
      if (!form.fullName.trim()) nextErrors.fullName = "Enter your full name.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) nextErrors.email = "Enter a valid email.";
      if (!form.phone.trim()) nextErrors.phone = "Enter a phone number.";
      if (form.password.length < 8) nextErrors.password = "Use at least 8 characters.";
      if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (index === 1) {
      if (!form.businessName.trim()) nextErrors.businessName = "Your kitchen needs a name.";
      if (!form.tagline.trim()) nextErrors.tagline = "Add a short tagline customers will see.";
      if (form.description.trim().length < 20) {
        nextErrors.description = "Describe your kitchen in at least 20 characters.";
      }
      if (!form.address.trim()) nextErrors.address = "Enter the kitchen's street address.";
      if (!form.area.trim()) nextErrors.area = "Enter the area or neighbourhood.";
      if (!form.city.trim()) nextErrors.city = "Enter the city.";
      if (!form.state.trim()) nextErrors.state = "Enter the state.";
    }
    if (index === 2) {
      if (form.prepTimeMinutes < 5) nextErrors.prepTimeMinutes = "Preparation time must be at least 5 minutes.";
      if (form.deliveryFee < 0) nextErrors.deliveryFee = "The delivery fee cannot be negative.";
      if (form.deliveryRadiusKm <= 0) nextErrors.deliveryRadiusKm = "Set a delivery radius above 0 km.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(STEPS.length - 1, prev + 1));
  };

  const submit = async () => {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      setErrors((prev) => ({ ...prev }));
      setFormError(
        "Some details still need attention, go back through the steps and fix the highlighted fields.",
      );
      setStep(0);
      return;
    }
    setFormError(null);
    const result = await run(
      () =>
        authService.signUpVendor({
          ...form,
          businessPhone: form.businessPhone || form.phone,
        }),
      { success: "Kitchen registered, awaiting merchant approval", silentError: true },
    );
    if (result) navigate("/vendor", { replace: true });
    else setFormError("We couldn't register that kitchen. The name may already be in use.");
  };

  return (
    <AuthShell
      title="Register your kitchen"
      subtitle="Three short steps. A merchant admin reviews every application before it goes live."
      wide
    >
      <ol className="mb-6 flex items-center gap-2" aria-label="Registration progress">
        {STEPS.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                index < step
                  ? "border-primary bg-primary text-primary-foreground"
                  : index === step
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {index < step ? <Check className="size-3.5" aria-hidden /> : index + 1}
            </span>
            <span
              className={cn(
                "hidden text-xs font-semibold sm:block",
                index === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {index < STEPS.length - 1 ? (
              <span className={cn("h-0.5 flex-1 rounded-full", index < step ? "bg-primary" : "bg-border")} />
            ) : null}
          </li>
        ))}
      </ol>

      {formError ? (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
        >
          {formError}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your full name" required error={errors.fullName} htmlFor="vs-name">
              <Input
                id="vs-name"
                value={form.fullName}
                onChange={(event) => set("fullName", event.target.value)}
                invalid={Boolean(errors.fullName)}
              />
            </Field>
            <Field label="Phone number" required error={errors.phone} htmlFor="vs-phone">
              <Input
                id="vs-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => set("phone", event.target.value)}
                invalid={Boolean(errors.phone)}
              />
            </Field>
          </div>
          <Field label="Email address" required error={errors.email} htmlFor="vs-email">
            <Input
              id="vs-email"
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
              invalid={Boolean(errors.email)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" required error={errors.password} htmlFor="vs-password">
              <PasswordInput
                id="vs-password"
                value={form.password}
                onChange={(value) => set("password", value)}
                invalid={Boolean(errors.password)}
              />
            </Field>
            <Field label="Confirm password" required error={errors.confirmPassword} htmlFor="vs-confirm">
              <PasswordInput
                id="vs-confirm"
                value={form.confirmPassword}
                onChange={(value) => set("confirmPassword", value)}
                invalid={Boolean(errors.confirmPassword)}
              />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kitchen name" required error={errors.businessName} htmlFor="vs-biz">
              <Input
                id="vs-biz"
                value={form.businessName}
                onChange={(event) => set("businessName", event.target.value)}
                invalid={Boolean(errors.businessName)}
                placeholder="e.g. Mama Cass Kitchen"
              />
            </Field>
            <Field label="Tagline" required error={errors.tagline} htmlFor="vs-tagline">
              <Input
                id="vs-tagline"
                value={form.tagline}
                onChange={(event) => set("tagline", event.target.value)}
                invalid={Boolean(errors.tagline)}
                placeholder="Home-style Nigerian cooking"
              />
            </Field>
          </div>
          <Field label="About your kitchen" required error={errors.description} htmlFor="vs-desc">
            <Textarea
              id="vs-desc"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              invalid={Boolean(errors.description)}
              placeholder="What do you cook, and what makes it worth ordering?"
            />
          </Field>
          <Field label="Street address" required error={errors.address} htmlFor="vs-address">
            <Input
              id="vs-address"
              value={form.address}
              onChange={(event) => set("address", event.target.value)}
              invalid={Boolean(errors.address)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Area" required error={errors.area} htmlFor="vs-area">
              <Input
                id="vs-area"
                value={form.area}
                onChange={(event) => set("area", event.target.value)}
                invalid={Boolean(errors.area)}
                placeholder="Wuse II"
              />
            </Field>
            <Field label="City" required error={errors.city} htmlFor="vs-city">
              <Input
                id="vs-city"
                value={form.city}
                onChange={(event) => set("city", event.target.value)}
                invalid={Boolean(errors.city)}
              />
            </Field>
            <Field label="State" required error={errors.state} htmlFor="vs-state">
              <Input
                id="vs-state"
                value={form.state}
                onChange={(event) => set("state", event.target.value)}
                invalid={Boolean(errors.state)}
              />
            </Field>
          </div>
          <Field label="Business phone" hint="Leave blank to use your personal number." htmlFor="vs-bphone">
            <Input
              id="vs-bphone"
              type="tel"
              value={form.businessPhone}
              onChange={(event) => set("businessPhone", event.target.value)}
            />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Cover photo</legend>
            <div className="flex flex-wrap gap-2">
              {coverOptions.map((image) => (
                <button
                  key={image}
                  type="button"
                  aria-pressed={form.coverImage === image}
                  onClick={() => set("coverImage", image)}
                  className={cn(
                    "overflow-hidden rounded-xl border-2 transition-all",
                    form.coverImage === image ? "border-primary" : "border-transparent opacity-70",
                  )}
                >
                  <img src={image} alt="" className="size-20 object-cover" />
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Choose from the supplied food photography. Image upload is not wired to a storage
              provider in this build.
            </p>
          </fieldset>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <p className="rounded-xl border border-primary/25 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary-ink">
            You set your own delivery terms. Customers only see dishes that can reach their address,
            and each kitchen's fee is charged separately on multi-vendor orders.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Preparation time (min)"
              required
              error={errors.prepTimeMinutes}
              htmlFor="vs-prep"
            >
              <Input
                id="vs-prep"
                type="number"
                min={5}
                max={180}
                value={form.prepTimeMinutes}
                onChange={(event) => set("prepTimeMinutes", Number(event.target.value))}
                invalid={Boolean(errors.prepTimeMinutes)}
              />
            </Field>
            <Field label="Delivery fee (₦)" required error={errors.deliveryFee} htmlFor="vs-fee">
              <Input
                id="vs-fee"
                type="number"
                min={0}
                step={100}
                value={form.deliveryFee}
                onChange={(event) => set("deliveryFee", Number(event.target.value))}
                invalid={Boolean(errors.deliveryFee)}
              />
            </Field>
            <Field
              label="Delivery radius (km)"
              required
              error={errors.deliveryRadiusKm}
              htmlFor="vs-radius"
            >
              <Input
                id="vs-radius"
                type="number"
                min={1}
                max={60}
                value={form.deliveryRadiusKm}
                onChange={(event) => set("deliveryRadiusKm", Number(event.target.value))}
                invalid={Boolean(errors.deliveryRadiusKm)}
              />
            </Field>
          </div>
          <Card className="p-4">
            <h3 className="text-sm font-bold">Summary</h3>
            <dl className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Owner</dt>
                <dd className="font-semibold">{form.fullName || "None"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Kitchen</dt>
                <dd className="font-semibold">{form.businessName || "None"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="font-semibold">
                  {form.area ? `${form.area}, ${form.city}` : "None"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Kitchens on the platform</dt>
                <dd className="font-semibold">{db.vendors.length + 1}</dd>
              </div>
            </dl>
          </Card>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => setStep((prev) => Math.max(0, prev - 1))}
          disabled={step === 0 || pending}
        >
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>
            Continue <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button onClick={() => void submit()} loading={pending}>
            <ChefHat className="size-4" aria-hidden /> Submit application
          </Button>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Already registered?{" "}
        <Link to="/sign-in" className="font-semibold text-primary hover:underline">
          Vendor sign in
        </Link>
      </p>
    </AuthShell>
  );
}

/* -------------------------------------------------------------- reset */

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { run, pending } = useAsyncAction();
  const [stage, setStage] = useState<"request" | "reset" | "done">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [issuedCode, setIssuedCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const request = async () => {
    const nextErrors: Record<string, string> = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const result = await run(() => authService.requestPasswordReset(email), { silentError: true });
    if (!result) return;
    // No email provider is connected, so the development code is shown on screen.
    setIssuedCode(result.code);
    setCode(result.code);
    setStage("reset");
  };

  const reset = async () => {
    const nextErrors: Record<string, string> = {};
    if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (password !== confirm) nextErrors.confirm = "Passwords do not match.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const user = await run(() => authService.resetPassword(email, code, password, confirm), {
      silentError: true,
      success: "Password updated",
    });
    if (user) setStage("done");
    else setErrors({ code: "That reset request is no longer valid." });
  };

  if (stage === "done") {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <div className="space-y-4 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Check className="size-6" aria-hidden />
          </span>
          <Button fullWidth size="lg" onClick={() => navigate("/sign-in")}>
            Go to sign in
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        stage === "request"
          ? "Enter the email address on your account."
          : "Enter the code and choose a new password."
      }
    >
      {stage === "request" ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void request();
          }}
        >
          <Field label="Email address" required error={errors.email} htmlFor="forgot-email">
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              invalid={Boolean(errors.email)}
              placeholder="you@example.com"
            />
          </Field>
          <Button type="submit" fullWidth size="lg" loading={pending}>
            Send reset code
          </Button>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-800">
            No email service is connected in this build, so the reset code appears on the next screen
            instead of being emailed. Production must send it to the account owner only.
          </p>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void reset();
          }}
        >
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
            <p className="font-bold">Development reset code</p>
            <p className="mt-0.5">
              {issuedCode ? (
                <>
                  Code for <strong>{email}</strong>: <strong className="tracking-widest">{issuedCode}</strong>
                </>
              ) : (
                <>
                  No account exists for <strong>{email}</strong>. The flow continues identically so we
                  don't reveal which addresses are registered.
                </>
              )}
            </p>
          </div>

          <Field label="Reset code" required error={errors.code} htmlFor="reset-code">
            <Input
              id="reset-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              invalid={Boolean(errors.code)}
              placeholder="Paste the code"
            />
          </Field>
          <Field label="New password" required error={errors.password} htmlFor="reset-password">
            <PasswordInput
              id="reset-password"
              value={password}
              onChange={setPassword}
              invalid={Boolean(errors.password)}
            />
          </Field>
          <Field label="Confirm new password" required error={errors.confirm} htmlFor="reset-confirm">
            <PasswordInput
              id="reset-confirm"
              value={confirm}
              onChange={setConfirm}
              invalid={Boolean(errors.confirm)}
            />
          </Field>
          <Button type="submit" fullWidth size="lg" loading={pending}>
            Update password
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link to="/sign-in" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
