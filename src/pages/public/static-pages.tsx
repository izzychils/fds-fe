import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Bike,
  ChefHat,
  Compass,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Store,
  Utensils,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Field,
  GlassCard,
  Input,
  SectionHeading,
  Textarea,
} from "@/components/ui";
import { PageContainer } from "@/components/layout/public";
import { settingsService } from "@/services";
import { toast } from "sonner";

/* --------------------------------------------------------------- about */

export function AboutPage() {
  const settings = settingsService.get();
  return (
    <PageContainer className="max-w-4xl space-y-8">
      <SectionHeading
        title="About Food Delivery System"
        subtitle="One marketplace, many independent kitchens."
      />
      <GlassCard intensity="card" className="space-y-4 rounded-3xl p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Food Delivery System started as a single home kitchen in Wuse II and grew into a marketplace where
          independent food businesses sell side by side. Customers browse <strong>dishes</strong>, not
          directory listings: you choose what you want to eat first, and only then do you see which
          kitchen is cooking it.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Every vendor manages its own menu, proteins, extras, inventory, seasonal specials, riders
          and delivery terms. The platform merchant oversees vendors, orders, banners, platform fees
          and customer feedback, and can moderate any of it.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Search, title: "Dish-first discovery", body: "Search by name, ingredient or cuisine." },
            { icon: Utensils, title: "Real customization", body: "Proteins, extras, sizes and notes." },
            { icon: Bike, title: "Tracked delivery", body: "A shared status model for every role." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-4">
              <item.icon className="size-5 text-primary" aria-hidden />
              <p className="mt-2 text-sm font-bold">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <Card className="space-y-2 p-6">
        <h2 className="text-lg font-bold">Company details</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Registered address</dt>
            <dd className="font-semibold">{settings.address}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Support hours</dt>
            <dd className="font-semibold">{settings.supportHours}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-semibold">{settings.contactEmail}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-semibold">{settings.phone}</dd>
          </div>
        </dl>
      </Card>
    </PageContainer>
  );
}

/* ------------------------------------------------------------- contact */

export function ContactPage() {
  const settings = settingsService.get();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const submit = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Tell us your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Enter a valid email address.";
    if (message.trim().length < 10) next.message = "Please add at least 10 characters.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // No mail transport is wired up in this build — say so plainly instead of
    // pretending the message was delivered.
    toast.warning("No email service is connected yet", {
      description: `In this development build nothing was sent. Email ${settings.contactEmail} or call ${settings.phone} directly.`,
    });
  };

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <SectionHeading
        title="Contact us"
        subtitle="Questions about an order, a refund or partnering with us."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Mail, label: "Email", value: settings.contactEmail, href: `mailto:${settings.contactEmail}` },
          { icon: Phone, label: "Phone", value: settings.phone, href: `tel:${settings.phone.replace(/\s/g, "")}` },
          { icon: MapPin, label: "Head office", value: settings.address },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <item.icon className="size-5 text-primary" aria-hidden />
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            {item.href ? (
              <a href={item.href} className="text-sm font-semibold hover:text-primary">
                {item.value}
              </a>
            ) : (
              <p className="text-sm font-semibold">{item.value}</p>
            )}
          </Card>
        ))}
      </div>

      <GlassCard intensity="card" className="space-y-4 rounded-3xl p-5">
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800">
          This form is part of the frontend build. No mail provider is configured, so submitting it
          will not send an email — use the contact details above.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" required error={errors.name} htmlFor="contact-name">
            <Input
              id="contact-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              invalid={Boolean(errors.name)}
            />
          </Field>
          <Field label="Email address" required error={errors.email} htmlFor="contact-email">
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              invalid={Boolean(errors.email)}
            />
          </Field>
        </div>
        <Field label="Message" required error={errors.message} htmlFor="contact-message">
          <Textarea
            id="contact-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            invalid={Boolean(errors.message)}
            placeholder="How can we help?"
          />
        </Field>
        <Button onClick={submit}>Send message</Button>
      </GlassCard>
    </PageContainer>
  );
}

/* ---------------------------------------------------------------- help */

const FAQS: Array<{ id: string; question: string; answer: string }> = [
  {
    id: "tracking",
    question: "How does order tracking work?",
    answer:
      "Every order moves through one shared status model: pending, confirmed, preparing, ready for pickup, rider assigned, picked up, out for delivery, delivered. Customers, vendors and the merchant all read the same timeline, so no dashboard can disagree with another. The courier position on the map is simulated in this build: the tiles are real, the position is not GPS.",
  },
  {
    id: "customise",
    question: "Can I customize a dish?",
    answer:
      "Yes. Open any dish to pick a serving size, a protein (required or optional depending on the dish), extras and a quantity, then add special instructions. The kitchen decides which options it offers and how many you may select. The exact options you pick are carried into the order and into the kitchen's ticket.",
  },
  {
    id: "addresses",
    question: "Why can't I order from a kitchen?",
    answer:
      "Each kitchen sets its own delivery radius and fee. If your selected delivery address is outside that radius, the dish page says so and the add-to-cart button is disabled for that address. Change your delivery location from the header to see what else is reachable.",
  },
  {
    id: "fees",
    question: "What is the platform fee?",
    answer:
      "It is a service fee added to every purchase and shown separately at checkout. The merchant configures whether it is a percentage of the food subtotal, a flat fee per order or a per-item charge. The policy in force at the time of purchase is stored on the order, so changing it later never rewrites your history.",
  },
  {
    id: "refunds",
    question: "How do refunds work?",
    answer:
      "Refunds are handled by the kitchen and the platform merchant. Orders can only be cancelled before preparation begins; after that, contact support with your order reference and the merchant will resolve it. No payment provider is connected in this development build, so no card has ever been charged.",
  },
  {
    id: "vendors",
    question: "How do I sell on Food Delivery System?",
    answer:
      "Register through the Become a vendor page. You create your account and business profile straight away; the merchant reviews and approves the kitchen before it can go live. Once approved you can publish dishes, configure proteins and extras, manage inventory and assign riders.",
  },
];

export function HelpPage() {
  return (
    <PageContainer className="max-w-3xl space-y-6">
      <SectionHeading title="Help centre" subtitle="Answers to the questions we get most often." />
      <div className="space-y-3">
        {FAQS.map((faq) => (
          <details
            key={faq.id}
            id={faq.id}
            className="group rounded-2xl border border-border bg-card p-4 open:shadow-md"
          >
            <summary className="cursor-pointer list-none text-sm font-bold marker:hidden">
              <span className="flex items-center justify-between gap-3">
                {faq.question}
                <span className="text-primary transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
      <GlassCard intensity="card" className="rounded-2xl p-5">
        <h2 className="text-sm font-bold">Still stuck?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Email us and include your order reference (for example NMK-10241).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/contact">
            <Button size="sm">Contact support</Button>
          </Link>
          <Link to="/app/orders">
            <Button size="sm" variant="outline">
              View my orders
            </Button>
          </Link>
        </div>
      </GlassCard>
    </PageContainer>
  );
}

/* ------------------------------------------------------- terms/privacy */

function LegalShell({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: Array<{ heading: string; body: string[] }>;
}) {
  return (
    <PageContainer className="max-w-3xl space-y-6">
      <SectionHeading title={title} subtitle={`Last updated ${updated}`} />
      <Card className="space-y-6 p-6">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-extrabold">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </Card>
      <p className="text-xs text-muted-foreground">
        This document describes the intended behaviour of the product. It is a development build:
        payments, delivery GPS and authentication are served by local mock adapters rather than live
        providers. Replace this copy with counsel-reviewed terms before going live.
      </p>
    </PageContainer>
  );
}

export function TermsPage() {
  return (
    <LegalShell
      title="Terms of service"
      updated="9 October 2026"
      sections={[
        {
          heading: "1. Who we are",
          body: [
            "Nma's Kitchen operates a marketplace that connects customers with independent food vendors. We are not the kitchen: each vendor prepares and fulfils its own dishes and sets its own prices, delivery fee, delivery radius, preparation time and serving hours.",
          ],
        },
        {
          heading: "2. Accounts and roles",
          body: [
            "There are three account types: customer, vendor and platform merchant (admin). Customer and vendor accounts can be created through the public sign-up flows. Merchant access is never granted through public registration — it is assigned administratively, because it carries platform-wide authority.",
            "You are responsible for keeping your credentials secure. In this development build authentication is handled by a local mock adapter and must be replaced by the production identity service before launch.",
          ],
        },
        {
          heading: "3. Orders, prices and fees",
          body: [
            "All prices are displayed in Nigerian naira. The amount shown at checkout is the amount payable: food subtotal, delivery fees (one per participating kitchen) and the platform service fee, less any valid promotion.",
            "The platform fee policy in force when the order is placed is recorded against that order. Changing the policy later does not retroactively alter completed orders.",
          ],
        },
        {
          heading: "4. Cancellations",
          body: [
            "An order may be cancelled only while it is pending confirmation or confirmed. Once the kitchen begins preparing, cancellation is no longer available because ingredients have been committed.",
          ],
        },
        {
          heading: "5. Vendor obligations",
          body: [
            "Vendors must keep their menus, prices, stock and availability accurate, hold the licences required to prepare and sell food in their jurisdiction, and fulfil accepted orders in the preparation time they publish.",
          ],
        },
        {
          heading: "6. Reviews",
          body: [
            "Customers may review dishes they have received. A review is badged as a verified purchase only when it is tied to a delivered order containing that dish. Abusive or unlawful reviews may be hidden by the platform merchant.",
          ],
        },
      ]}
    />
  );
}

export function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy policy"
      updated="9 October 2026"
      sections={[
        {
          heading: "What we collect",
          body: [
            "Account details (name, email address, phone number), delivery addresses, order history, favourites, reviews you write and any photographs you attach to them, plus the preferences you set such as dietary requirements.",
          ],
        },
        {
          heading: "How addresses are used",
          body: [
            "Delivery addresses are used to match you with kitchens that can reach you and to give your rider a destination. No geocoding provider is connected in this build: address suggestions are not generated, and coordinates are never invented for a manually typed address.",
          ],
        },
        {
          heading: "Who can see what",
          body: [
            "Customers see only their own orders, addresses, reviews and profile. A vendor sees only the orders containing its own dishes and the delivery details needed to fulfil them. The platform merchant can see platform-wide data in order to operate the marketplace.",
            "In this frontend-only build all data lives in your browser's localStorage. Clearing site data removes it. Production deployment must move storage, access control and audit logging to the backend.",
          ],
        },
        {
          heading: "Review photographs",
          body: [
            "Review photos you select are read locally into the page and attached to your review record. No upload service is connected, so they never leave your device in this build.",
          ],
        },
        {
          heading: "Third-party services",
          body: [
            "Map tiles are requested from OpenStreetMap's public embed endpoint when you open a delivery tracking view. No payment provider, geocoding provider, SMS gateway or email service is integrated at this stage.",
          ],
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------ not found */

export function NotFoundPage() {
  return (
    <PageContainer className="flex min-h-[60vh] items-center justify-center">
      <GlassCard intensity="cardStrong" className="max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Compass className="size-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-extrabold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you were looking for doesn't exist, or it may have moved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/">
            <Button>Back to home</Button>
          </Link>
          <Link to="/foods">
            <Button variant="outline">Browse dishes</Button>
          </Link>
        </div>
        <div className="mt-6 grid gap-2 text-left">
          {[
            { to: "/help", label: "Help centre", icon: ShieldCheck },
            { to: "/vendor-signup", label: "Become a vendor", icon: ChefHat },
            { to: "/sign-in", label: "Sign in", icon: Store },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent"
            >
              <link.icon className="size-4 text-primary" aria-hidden />
              {link.label}
            </Link>
          ))}
        </div>
        <p className="mt-4">
          <Badge tone="muted">
            <BadgeCheck className="size-3" aria-hidden /> 404
          </Badge>
        </p>
      </GlassCard>
    </PageContainer>
  );
}
