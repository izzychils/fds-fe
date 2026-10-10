import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Check,
  ChefHat,
  Clock,
  Compass,
  MapPin,
  Percent,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* --------------------------------------------------------------- about */

export function AboutPage() {
  const settings = settingsService.get();
  return (
    <PageContainer className="max-w-4xl space-y-8">
      <SectionHeading
        title="About Chupnow"
        subtitle="One marketplace, many independent kitchens."
      />
      <GlassCard intensity="card" className="space-y-5 rounded-3xl p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Chupnow is an online food ordering and delivery platform that brings local restaurants and
          home kitchens together in one place. Customers browse real food, customise it their way and
          follow their order to the door.
        </p>
        <div>
          <h2 className="text-base font-extrabold">Our mission</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            To make good food easy to find, easy to order and reliably delivered, while giving local
            food businesses the tools to grow.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/50 bg-white/45 p-4 backdrop-blur-xl">
            <h2 className="flex items-center gap-2 text-base font-extrabold">
              <ShoppingBag className="size-4 text-primary-ink" aria-hidden /> For customers
            </h2>
            <ul className="mt-2.5 space-y-2 text-sm text-muted-foreground">
              {[
                "Browse menus with high-quality food photography, and search by food name, description or category.",
                "Customise dishes with your preferred proteins, extras, ingredients and dietary needs.",
                "Track your order in real time on a live progress map.",
                "Read and write verified reviews with photos, and get dish recommendations based on what you have ordered before.",
                "Pay and manage your saved addresses and profile.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary-ink" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/50 bg-white/45 p-4 backdrop-blur-xl">
            <h2 className="flex items-center gap-2 text-base font-extrabold">
              <Store className="size-4 text-primary-ink" aria-hidden /> For vendors and merchants
            </h2>
            <ul className="mt-2.5 space-y-2 text-sm text-muted-foreground">
              {[
                "Register, publish dishes and set your own delivery timeline, location and fee.",
                "Manage your menu, popular dishes, cuisines, proteins and extras, banners and riders from one dashboard.",
                "Update seasonal specials instantly and keep stock current.",
                "Track every order through to delivery and respond to customer reviews.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary-ink" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h2 className="text-base font-extrabold">How we work</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Chupnow is a multi-vendor marketplace. Customers choose a dish first, and the vendor behind
            it is shown when they select it. Platform administrators oversee vendors and orders and set
            the platform fee on each meal.
          </p>
        </div>

        <div className="rounded-2xl border border-primary/40 bg-primary/15 p-4">
          <h2 className="text-base font-extrabold">One promise</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Fresh food, honest pricing, clear tracking and fair treatment for the customers, vendors
            and riders who make every order possible.
          </p>
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

    // No mail transport is wired up in this build, say so plainly instead of
    // pretending the message was delivered.
    toast.warning("No email service is connected yet", {
      description: `In this development build nothing was sent. Email ${settings.contactEmail} or call ${settings.phone} directly.`,
    });
  };

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <SectionHeading
        title="Contact us"
        subtitle="Hungry, stuck or running a kitchen? We are here to help. Choose the option that fits you best."
      />

      <Card className="overflow-hidden border-white/50 bg-white/45 p-0 backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-px bg-white/40 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <p className="bg-white/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Who you are
          </p>
          <p className="hidden bg-white/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:block">
            How to reach us
          </p>
          {[
            {
              who: "Customers (orders, refunds, delivery issues)",
              how: (
                <>
                  Email the support desk or call and message{" "}
                  <a
                    href={`tel:${settings.phone.replace(/\s/g, "")}`}
                    className="font-semibold hover:text-primary-ink"
                  >
                    {settings.phone}
                  </a>{" "}
                  (phone and WhatsApp).
                </>
              ),
            },
            {
              who: "Vendors and merchants (sign-up, dashboard, payouts)",
              how: (
                <>
                  Email the support desk with the subject line "Vendor support".
                </>
              ),
            },
            {
              who: "Riders and partners",
              how: <>Email the support desk with the subject line "Partnership".</>,
            },
            {
              who: "Privacy and data requests",
              how: (
                <>
                  Email the support desk with the subject line "Data Request", and we will answer as
                  the NDPA requires.
                </>
              ),
            },
            {
              who: "Legal notices",
              how: <>Email the support desk with the subject line "Legal".</>,
            },
          ].map((row) => (
            <div key={row.who} className="contents">
              <p className="bg-white/45 px-4 py-3 text-sm font-semibold">{row.who}</p>
              <p className="bg-white/45 px-4 py-3 text-sm text-muted-foreground">
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="font-semibold text-foreground hover:text-primary-ink"
                >
                  {settings.contactEmail}
                </a>{" "}
                {row.how}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-white/50 bg-white/45 p-5 backdrop-blur-xl">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <MapPin className="size-4 text-primary-ink" aria-hidden /> Company
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Chupnow, {settings.address}.
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <Clock className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden />
            Support hours: {settings.supportHours}
          </p>
        </Card>
        <Card className="border-white/50 bg-white/45 p-5 backdrop-blur-xl">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Phone className="size-4 text-primary-ink" aria-hidden /> Order problems
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            For order problems, please include your order number and the vendor's name so we can help
            faster.
          </p>
        </Card>
      </div>

      <GlassCard intensity="card" className="space-y-4 rounded-3xl p-5">
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800">
          This form is part of the frontend build. No mail provider is configured, so submitting it
          will not send an email, use the contact details above.
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
    question: "How do I sell on Chupnow?",
    answer:
      "Register through the Become a vendor page. You create your account and business profile straight away; the merchant reviews and approves the kitchen before it can go live. Once approved you can publish dishes, configure proteins and extras, manage inventory and assign riders.",
  },
];

export function HelpPage() {
  const location = useLocation();
  /**
   * Links such as the footer's "Refund policy" arrive as `/help#refunds`.
   * Without this the page scrolls to a closed accordion, which reads as a
   * broken link, so the targeted answer is opened and ringed on arrival.
   */
  const targeted = location.hash.replace(/^#/, "");
  return (
    <PageContainer className="max-w-3xl space-y-6">
      <SectionHeading title="Help centre" subtitle="Answers to the questions we get most often." />
      <div className="space-y-3">
        {FAQS.map((faq) => (
          <details
            key={faq.id}
            id={faq.id}
            open={targeted === faq.id}
            className={cn(
              "group scroll-mt-28 rounded-2xl border border-border bg-card p-4 open:shadow-md",
              targeted === faq.id && "border-primary/50 ring-2 ring-primary/30",
            )}
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

/* --------------------------------------------------------------- partners */

/**
 * The partnership page the header and footer link to.
 *
 * It describes the two ways to work with the platform (kitchens and riders) and
 * the approval gate that sits in front of both. Nothing here promises earnings:
 * this is a frontend build, and the copy says so where it matters.
 */
export function PartnersPage() {
  return (
    <PageContainer className="max-w-5xl space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]">
          <Store className="size-3.5" aria-hidden /> Partners
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Grow with Chupnow
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          Kitchens cook and deliver on their own terms. Riders carry those orders. The platform sets one
          fee model and one order status model so every partner is measured the same way.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard intensity="card" className="rounded-3xl p-6">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ChefHat className="size-6" aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-extrabold">Kitchens and food businesses</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Publish dishes with photos, prices and preparation times, configure proteins, extras and
            serving sizes, track live stock, publish seasonal specials and reply to customer reviews.
            You decide your own delivery fee, delivery radius and serving hours.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              "Your own menu, inventory and pricing",
              "Your own riders, or none at all",
              "Live orders and a single status timeline",
              "Reviews you can reply to in public",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <Link to="/vendor-signup" className="mt-5 inline-block">
            <Button>
              Register a kitchen <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
        </GlassCard>

        <GlassCard intensity="card" className="rounded-3xl p-6">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Bike className="size-6" aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-extrabold">Riders and delivery teams</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Riders are managed inside the kitchen that assigns them. A kitchen adds its own riders,
            keeps their contact details current, activates or deactivates them and assigns a rider to a
            specific order. The platform merchant can see every rider across the marketplace.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              "Assigned per order by the kitchen",
              "One shared delivery status timeline",
              "Delivery details scoped to the order",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted-foreground">
            Applications run through a kitchen, not through a public form, in this build.
          </p>
        </GlassCard>
      </div>

      <Card className="rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <ShieldCheck className="size-5 text-primary" aria-hidden /> How approval works
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Store,
              title: "1. Register",
              body: "Create an account and enter your business details. You can prepare your menu straight away.",
            },
            {
              icon: Users,
              title: "2. Review",
              body: "The merchant checks the business before it can sell. Pending kitchens are not visible to customers.",
            },
            {
              icon: Truck,
              title: "3. Go live",
              body: "Once approved, your dishes join the marketplace and orders start arriving in your console.",
            },
          ].map((step) => (
            <li key={step.title} className="rounded-2xl border border-border bg-card p-4">
              <step.icon className="size-5 text-primary" aria-hidden />
              <p className="mt-2 text-sm font-bold">{step.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </Card>

      <GlassCard intensity="card" className="rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Percent className="size-5 text-primary" aria-hidden /> Fees and payouts
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The platform charges one service fee on every completed purchase, configured by the merchant
          as a percentage of the food subtotal, a flat fee per order or a per item charge. Delivery fees
          belong to the kitchen and are shown separately at checkout. The fee policy in force when the
          order is placed is stored on that order, so a later change never rewrites history.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          No payment provider is connected in this development build, so no money moves and no payout
          schedule exists yet. Payouts are a backend and payment provider concern.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/help#vendors">
            <Button variant="outline" size="sm">
              Selling questions
            </Button>
          </Link>
          <Link to="/help#fees">
            <Button variant="outline" size="sm">
              How fees work
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline" size="sm">
              Talk to us
            </Button>
          </Link>
        </div>
      </GlassCard>
    </PageContainer>
  );
}

/* ------------------------------------------------------- terms/privacy */

type LegalSection = {
  heading: string;
  body?: string[];
  bullets?: string[];
};

/**
 * One legal document.
 *
 * The copy shipped here is the platform's own policy text: it says what the
 * product actually does, and where a provider is still a local mock adapter the
 * document says so rather than implying a live service.
 */
function LegalDocument({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <SectionHeading title={title} subtitle={`Last updated ${updated}`} />
      <GlassCard intensity="card" className="space-y-6 rounded-3xl p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">{intro}</p>
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-extrabold">{section.heading}</h2>
            {section.body?.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {section.bullets.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </GlassCard>
    </>
  );
}

const TERMS_OF_USE: LegalSection[] = [
  {
    heading: "1. Eligibility",
    body: [
      "You must be 18 or older, or use the service with a parent or guardian's permission. Vendors must be legally able to run a food business.",
    ],
  },
  {
    heading: "2. Accounts",
    body: [
      "Provide accurate details and keep your log-in secure. You are responsible for activity under your account.",
    ],
  },
  {
    heading: "3. Customers",
    body: ["You agree to:"],
    bullets: [
      "give a correct delivery address and phone number, and be reachable for delivery;",
      "tell the vendor about allergies and dietary needs in the order notes. Vendors, not Chupnow, prepare the food;",
      "pay for the orders you place.",
    ],
  },
  {
    heading: "4. Vendors and merchants",
    body: ["You agree to:"],
    bullets: [
      "register truthfully and keep your menu, prices, availability, location, delivery timeline and fee accurate;",
      "hold and keep valid the licences, hygiene and food-safety approvals your business needs under Nigerian law;",
      "prepare food safely, describe allergens and ingredients honestly and keep orders on time;",
      "manage your riders responsibly and keep their details up to date;",
      "respond to reviews fairly and professionally.",
    ],
  },
  {
    heading: "5. Reviews and uploads",
    body: [
      "Reviews must be honest, based on a real order, and free of abuse, hate, spam or private information. You keep ownership of your photos and text and give us a licence to display them on the platform. We may remove content that breaks these terms.",
    ],
  },
  {
    heading: "6. Prohibited conduct",
    body: ["You must not:"],
    bullets: [
      "place fake or fraudulent orders, or abuse refunds and promotions;",
      "sell unlawful, unsafe or misdescribed food;",
      "harass or threaten customers, vendors, riders or staff;",
      "scrape, copy or interfere with the platform, or attempt to access accounts or dashboards that are not yours;",
      "take orders or payments outside the platform to avoid fees, where our rules forbid it.",
    ],
  },
  {
    heading: "7. Recommendations and tracking",
    body: [
      "Dish recommendations and delivery estimates are guides, not promises. Live tracking depends on device, network and map services and may be delayed or inaccurate. In this development build the rider position on the map is simulated, and the page says so.",
    ],
  },
  {
    heading: "8. Administrators",
    body: [
      "Platform administrators may review vendors, orders and content, set platform fees and suspend accounts that break these terms or the law.",
    ],
  },
  {
    heading: "9. Our property",
    body: [
      "The Chupnow name, logo, software and design belong to us. Vendors own their own menus, names and photos.",
    ],
  },
  {
    heading: "10. Suspension and ending",
    body: [
      "We may suspend or end an account for breach of these terms. You may stop using the platform at any time.",
    ],
  },
  {
    heading: "11. Changes",
    body: ["We may update these terms and will notify you. Continued use means you accept the changes."],
  },
];

const TERMS_AND_CONDITIONS: LegalSection[] = [
  {
    heading: "1. Our role",
    body: [
      "Chupnow is a marketplace. Vendors are independent businesses that prepare and sell the food. A contract for the sale of food is formed between you and the vendor when your order is accepted. We provide the platform, ordering, tracking and payment tools.",
    ],
  },
  {
    heading: "2. Prices and currency",
    body: [
      "All prices are in Nigerian naira and shown by the vendor. Vendors are responsible for the accuracy of their prices and menu details.",
    ],
  },
  {
    heading: "3. What you pay",
    body: ["Your total may include:"],
    bullets: [
      "the price of the food, proteins and extras you choose;",
      "the vendor's delivery fee, which each vendor sets for its own location and delivery area;",
      "a platform fee set by Chupnow on each meal;",
      "applicable taxes.",
      "The full amount is shown before you confirm your order.",
    ],
  },
  {
    heading: "4. Orders and acceptance",
    body: [
      "An order is confirmed only when the vendor accepts it. Vendors may decline or cancel an order if an item is unavailable or the address is outside their delivery area.",
    ],
  },
  {
    heading: "5. Delivery",
    body: [
      "Each vendor sets its own delivery timeline. Times shown are estimates. Delays may occur because of traffic, weather, road conditions or high demand. You must be available to receive your order at the address given.",
    ],
  },
  {
    heading: "6. Cancellations and refunds",
    body: [
      "You may cancel before the vendor starts preparing your order. After that, cancellation is at the vendor's discretion. If your order is wrong, missing, unsafe or not delivered, contact us promptly through the order page. We will review the case with the vendor and may offer a replacement, partial refund or full refund. Refunds are paid back through the original payment method where possible.",
    ],
  },
  {
    heading: "7. Payments",
    body: [
      "Payments are processed by third-party payment providers. You must use a payment method you are authorised to use. Failed or disputed payments may delay or cancel an order. No payment provider is connected in this development build, so no card is ever charged.",
    ],
  },
  {
    heading: "8. Vendor payouts and fees",
    body: [
      "Vendors receive the sale proceeds less the platform fee and any other agreed charges, paid on the schedule communicated to them. Vendors are responsible for their own taxes and licences.",
    ],
  },
  {
    heading: "9. Food safety and allergies",
    body: [
      "Vendors are responsible for the safety and description of the food they sell. Customers with allergies must state them clearly in the order notes and should confirm directly with the vendor. We cannot guarantee that any dish is free of allergens.",
    ],
  },
  {
    heading: "10. Disclaimers",
    body: [
      'The platform is provided "as is" and "as available". We do not promise uninterrupted service or error-free tracking, and we are not responsible for the quality, safety or legality of food sold by vendors, except where the law says otherwise.',
    ],
  },
  {
    heading: "11. Limitation of liability",
    body: [
      "To the extent the law allows, we are not liable for indirect or consequential loss. Our total liability for any claim is limited to the amount you paid for the order concerned.",
    ],
  },
  {
    heading: "12. Force majeure",
    body: [
      "We are not responsible for delays or failures caused by events beyond our reasonable control, such as strikes, road closures, floods, network outages or acts of government.",
    ],
  },
  {
    heading: "13. Governing law and disputes",
    body: [
      "These terms are governed by the laws of the Federal Republic of Nigeria. We will first try to resolve disputes in good faith. Failing that, the courts of Rivers State, Nigeria, have jurisdiction.",
    ],
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Information we collect",
    bullets: [
      "Account data: name, phone number, email address, password (stored securely) and profile details.",
      "Addresses and location: delivery addresses you save and, with your permission, your device location so we can show delivery progress and rider position.",
      "Order data: dishes, customisations (such as dietary needs, proteins and extras), order history, delivery notes, status and payment status.",
      "Reviews: ratings, comments and photos you upload.",
      "Vendor data: business name, menu, prices, location, delivery fee and timeline, banners, and the details of riders a vendor adds.",
      "Payment data: handled by our payment processors. We do not store full card details.",
      "Technical data: device, browser, IP address, log-in times and error logs.",
    ],
  },
  {
    heading: "2. How we use it",
    bullets: [
      "To process orders, connect customers with vendors and riders, and show real-time order tracking.",
      "To personalise recommendations from your order history.",
      "To publish reviews, calculate fees and provide vendor dashboards and order records.",
      "To provide support, prevent fraud, keep the platform secure and meet legal duties.",
      "To send order updates and, where you agree, offers and news. You can opt out of marketing at any time.",
    ],
  },
  {
    heading: "3. Who we share it with",
    bullets: [
      "Vendors: your name, phone number, delivery address, order details and notes, so they can prepare and deliver your order.",
      "Riders: the pickup and delivery details needed to complete the delivery.",
      "Other users: your first name and review content appear publicly on reviews.",
      "Service providers: hosting, maps, payment, messaging and analytics providers acting on our instructions.",
      "Authorities: when the law requires it.",
      "We do not sell your personal data.",
    ],
  },
  {
    heading: "4. Location data",
    body: [
      "Location is used only for delivery and tracking. You can turn off location permission in your device settings, but live tracking and address suggestions may not work. This development build asks the browser for nothing: the rider position shown on the map is simulated and no coordinates are invented for an address you type.",
    ],
  },
  {
    heading: "5. Security and storage",
    body: [
      "In production we use encryption in transit, access controls and backups, and data may be processed outside Nigeria with protection equal to the NDPA standard. In this frontend-only build all data stays in your own browser's local storage, and clearing site data removes it.",
    ],
  },
  {
    heading: "6. Retention",
    body: [
      "We keep account and order records while your account is active and as long as needed for legal, tax and dispute purposes. You may ask us to delete your account, subject to those limits.",
    ],
  },
  {
    heading: "7. Your rights",
    body: [
      "You may ask to access, correct, delete, restrict or export your data, object to processing, withdraw consent and complain to the Nigeria Data Protection Commission.",
    ],
  },
  {
    heading: "8. Children",
    body: [
      "Chupnow is not directed at children under 18, and we do not knowingly collect their data.",
    ],
  },
  {
    heading: "9. Changes",
    body: ["We may update this policy and will notify you in the app or by email."],
  },
];

export function TermsPage() {
  const settings = settingsService.get();
  return (
    <PageContainer className="max-w-3xl space-y-8">
      <LegalDocument
        title="Terms of Use"
        updated="April 2024"
        intro="These Terms of Use apply to everyone who uses the Chupnow website, app and merchant dashboard: customers, vendors and administrators. By using the platform you agree to them."
        sections={TERMS_OF_USE}
      />
      <LegalDocument
        title="Terms and Conditions"
        updated="April 2024"
        intro="These Terms and Conditions set out how orders, payments, fees and responsibilities work on Chupnow. They apply with the Terms of Use and Privacy Policy."
        sections={TERMS_AND_CONDITIONS}
      />
      <p className="text-xs text-muted-foreground">
        Questions about either document can be sent to {settings.contactEmail}. This is a development
        build: payments, delivery GPS and authentication are served by local mock adapters rather than
        live providers.
      </p>
    </PageContainer>
  );
}

export function PrivacyPage() {
  const settings = settingsService.get();
  return (
    <PageContainer className="max-w-3xl space-y-8">
      <LegalDocument
        title="Privacy Policy"
        updated="April 2024"
        intro={`Chupnow ("we", "us", "our") collects and uses personal data to take, prepare and deliver food orders. This policy explains what we collect, why, who sees it and your rights under the Nigeria Data Protection Act 2023 (NDPA).`}
        sections={PRIVACY_SECTIONS}
      />
      <p className="text-xs text-muted-foreground">
        Data requests go to {settings.contactEmail} with the subject line "Data Request".
      </p>
    </PageContainer>
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
