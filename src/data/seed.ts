import type {
  Address,
  Banner,
  Cuisine,
  Database,
  FoodItem,
  Order,
  OrderItem,
  OrderStatus,
  PlatformSettings,
  PromoCode,
  Protein,
  Extra,
  Review,
  Rider,
  User,
  Vendor,
} from "@/types";
import { calcPlatformFee } from "@/lib/orders";

/**
 * Development seed data.
 *
 * This is the ONLY place sample content lives. It is loaded by the mock
 * adapter in `src/services/repository.ts` the first time the app runs, then
 * persisted to localStorage — exactly the shape the real backend will return.
 *
 * Food photography comes from the supplied `inspo/` reference folder.
 * Demo credentials are intentionally weak and development-only.
 */

export const DEMO_PASSWORD = "password123";

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

const IMG = {
  steakEggs: "/foods/steak-and-eggs.jpg",
  burgerBacon: "/foods/bacon-cheeseburger.jpg",
  pizza: "/foods/pepperoni-pizza.jpg",
  tacos: "/foods/birria-tacos.jpg",
  partyPlatter: "/foods/party-burger-platter.jpg",
  burgerWings: "/foods/burger-wings-fries.jpg",
  shawarma: "/foods/steak-shawarma.jpg",
  dining: "/foods/venue-dining.jpg",
  patio: "/foods/venue-patio.jpg",
  sandwiches: "/foods/sandwich-platter.jpg",
} as const;

/* ---------------------------------------------------------------- cuisine */

const cuisines: Cuisine[] = [
  { id: "cui_nigerian", name: "Nigerian", emoji: "🍲", isActive: true },
  { id: "cui_continental", name: "Continental", emoji: "🍽️", isActive: true },
  { id: "cui_grills", name: "Burgers & Grills", emoji: "🍔", isActive: true },
  { id: "cui_pizza", name: "Pizza & Italian", emoji: "🍕", isActive: true },
  { id: "cui_mexican", name: "Mexican", emoji: "🌮", isActive: true },
  { id: "cui_breakfast", name: "Breakfast", emoji: "🍳", isActive: true },
  { id: "cui_sandwich", name: "Sandwiches", emoji: "🥪", isActive: true },
  { id: "cui_drinks", name: "Drinks & Desserts", emoji: "🥤", isActive: true },
];

/* ---------------------------------------------------------------- vendors */

const vendors: Vendor[] = [
  {
    id: "vnd_nma",
    name: "Nma's Kitchen",
    slug: "nmas-kitchen",
    tagline: "Home-style Nigerian cooking & a proper grilled breakfast",
    description:
      "Our flagship kitchen. Slow-grilled steaks, pepper sauces simmered from scratch and continental plates served all day.",
    coverImage: IMG.dining,
    logoText: "NK",
    cuisineIds: ["cui_nigerian", "cui_continental", "cui_breakfast"],
    address: "152 Ademola Adetokunbo Crescent",
    area: "Wuse II",
    city: "Abuja",
    state: "FCT",
    phone: "0803 111 2233",
    email: "hello@nmaskitchen.ng",
    status: "approved",
    isOpen: true,
    openTime: "07:00",
    closeTime: "22:30",
    prepTimeMinutes: 25,
    deliveryFee: 1200,
    deliveryRadiusKm: 12,
    deliveryNote: "Free delivery on orders above ₦25,000 within Wuse II.",
    latitude: 9.0820,
    longitude: 7.4750,
    ownerUserId: "usr_admin",
    createdAt: daysAgo(240),
  },
  {
    id: "vnd_grill",
    name: "Grill Republic",
    slug: "grill-republic",
    tagline: "Flame-grilled burgers, wings and stacked party platters",
    description:
      "Charcoal grills, brioche buns and house sauces. Built for people who take their burgers seriously.",
    coverImage: IMG.burgerWings,
    logoText: "GR",
    cuisineIds: ["cui_grills", "cui_continental"],
    address: "21 Admiralty Way",
    area: "Lekki Phase 1",
    city: "Lagos",
    state: "Lagos",
    phone: "0805 442 8890",
    email: "orders@grillrepublic.ng",
    status: "approved",
    isOpen: true,
    openTime: "11:00",
    closeTime: "23:30",
    prepTimeMinutes: 30,
    deliveryFee: 1800,
    deliveryRadiusKm: 15,
    deliveryNote: "Rider leaves the kitchen every 20 minutes during peak hours.",
    latitude: 6.4413,
    longitude: 3.4688,
    ownerUserId: "usr_vendor_grill",
    createdAt: daysAgo(190),
  },
  {
    id: "vnd_slice",
    name: "Slice & Spice Pizzeria",
    slug: "slice-and-spice",
    tagline: "Stone-baked pepperoni, stretched by hand every morning",
    description:
      "Naturally leavened dough, 48-hour fermentation and a 400°C stone oven. Sizes from personal to family.",
    coverImage: IMG.pizza,
    logoText: "S&S",
    cuisineIds: ["cui_pizza", "cui_continental"],
    address: "7 Ozumba Mbadiwe Avenue",
    area: "Victoria Island",
    city: "Lagos",
    state: "Lagos",
    phone: "0811 909 3311",
    email: "hello@sliceandspice.ng",
    status: "approved",
    isOpen: true,
    openTime: "12:00",
    closeTime: "23:00",
    prepTimeMinutes: 28,
    deliveryFee: 1600,
    deliveryRadiusKm: 14,
    deliveryNote: "Insulated bags keep the base crisp on the way over.",
    latitude: 6.4281,
    longitude: 3.4219,
    ownerUserId: "usr_vendor_slice",
    createdAt: daysAgo(160),
  },
  {
    id: "vnd_taco",
    name: "Taco Alley",
    slug: "taco-alley",
    tagline: "Slow-braised birria, street corn and proper salsas",
    description:
      "Twelve-hour braises, hand-pressed tortillas and a salsa bar. Street food with a Lagos accent.",
    coverImage: IMG.tacos,
    logoText: "TA",
    cuisineIds: ["cui_mexican"],
    address: "3B Aminu Kano Crescent",
    area: "Wuse II",
    city: "Abuja",
    state: "FCT",
    phone: "0813 220 7745",
    email: "hola@tacoalley.ng",
    status: "approved",
    isOpen: true,
    openTime: "12:00",
    closeTime: "22:00",
    prepTimeMinutes: 22,
    deliveryFee: 1400,
    deliveryRadiusKm: 10,
    deliveryNote: "Tacos are packed flat so the shells arrive intact.",
    latitude: 9.0765,
    longitude: 7.4812,
    ownerUserId: "usr_vendor_taco",
    createdAt: daysAgo(120),
  },
  {
    id: "vnd_sunrise",
    name: "Sunrise Deli",
    slug: "sunrise-deli",
    tagline: "All-day breakfast, club sandwiches and cold-pressed coolers",
    description:
      "Toasted sandwiches on house sourdough, brunch boards and fresh citrus coolers from 6:30am.",
    coverImage: IMG.sandwiches,
    logoText: "SD",
    cuisineIds: ["cui_breakfast", "cui_sandwich", "cui_drinks"],
    address: "14 Allen Avenue",
    area: "Ikeja",
    city: "Lagos",
    state: "Lagos",
    phone: "0817 655 1200",
    email: "hi@sunrisedeli.ng",
    status: "approved",
    isOpen: false,
    openTime: "06:30",
    closeTime: "16:00",
    prepTimeMinutes: 18,
    deliveryFee: 1000,
    deliveryRadiusKm: 9,
    deliveryNote: "Breakfast orders placed before 9am jump the queue.",
    latitude: 6.6018,
    longitude: 3.3515,
    ownerUserId: "usr_vendor_sunrise",
    createdAt: daysAgo(95),
  },
  {
    id: "vnd_bistro",
    name: "Verandah Bistro",
    slug: "verandah-bistro",
    tagline: "Waiting for platform approval",
    description:
      "New applicant — contemporary West-African small plates and natural wine.",
    coverImage: IMG.patio,
    logoText: "VB",
    cuisineIds: ["cui_nigerian", "cui_continental"],
    address: "9 Bourdillon Road",
    area: "Ikoyi",
    city: "Lagos",
    state: "Lagos",
    phone: "0802 000 1188",
    email: "owner@verandahbistro.ng",
    status: "pending",
    isOpen: false,
    openTime: "17:00",
    closeTime: "23:00",
    prepTimeMinutes: 35,
    deliveryFee: 2200,
    deliveryRadiusKm: 8,
    deliveryNote: "Delivery within Ikoyi only while we ramp up.",
    latitude: 6.4531,
    longitude: 3.4356,
    ownerUserId: "usr_vendor_bistro",
    createdAt: daysAgo(4),
  },
];

/* ----------------------------------------------------------------- users */

const users: User[] = [
  {
    id: "usr_admin",
    fullName: "Nma Odili",
    email: "merchant@nmaskitchen.ng",
    phone: "0803 111 2233",
    role: "admin",
    dietaryPreferences: [],
    favoriteCuisineIds: [],
    vendorId: "vnd_nma",
    isActive: true,
    password: DEMO_PASSWORD,
    createdAt: daysAgo(240),
  },
  {
    id: "usr_customer",
    fullName: "Adaeze Okafor",
    email: "adaeze@example.com",
    phone: "0806 774 1122",
    role: "customer",
    avatarUrl: undefined,
    dietaryPreferences: ["High-protein", "Spicy"],
    favoriteCuisineIds: ["cui_grills", "cui_mexican"],
    isActive: true,
    password: DEMO_PASSWORD,
    createdAt: daysAgo(60),
  },
  {
    id: "usr_customer_2",
    fullName: "Tobi Adebayo",
    email: "tobi@example.com",
    phone: "0809 330 5566",
    role: "customer",
    dietaryPreferences: ["Vegetarian"],
    favoriteCuisineIds: ["cui_pizza"],
    isActive: true,
    password: DEMO_PASSWORD,
    createdAt: daysAgo(30),
  },
  {
    id: "usr_vendor_grill",
    fullName: "Kelechi Umeh",
    email: "grill@grillrepublic.ng",
    phone: "0805 442 8890",
    role: "vendor",
    dietaryPreferences: [],
    favoriteCuisineIds: [],
    vendorId: "vnd_grill",
    isActive: true,
    password: DEMO_PASSWORD,
    createdAt: daysAgo(190),
  },
  {
    id: "usr_vendor_slice",
    fullName: "Bianca Ferraro",
    email: "slice@sliceandspice.ng",
    phone: "0811 909 3311",
    role: "vendor",
    dietaryPreferences: [],
    favoriteCuisineIds: [],
    vendorId: "vnd_slice",
    isActive: true,
    password: DEMO_PASSWORD,
    createdAt: daysAgo(160),
  },
  {
    id: "usr_vendor_taco",
    fullName: "Hauwa Bello",
    email: "taco@tacoalley.ng",
    phone: "0813 220 7745",
    role: "vendor",
    dietaryPreferences: [],
    favoriteCuisineIds: [],
    vendorId: "vnd_taco",
    isActive: true,
    password: DEMO_PASSWORD,
    createdAt: daysAgo(120),
  },
  {
    id: "usr_vendor_sunrise",
    fullName: "Femi Daramola",
    email: "sunrise@sunrisedeli.ng",
    phone: "0817 655 1200",
    role: "vendor",
    dietaryPreferences: [],
    favoriteCuisineIds: [],
    vendorId: "vnd_sunrise",
    isActive: true,
    password: DEMO_PASSWORD,
    createdAt: daysAgo(95),
  },
  {
    id: "usr_vendor_bistro",
    fullName: "Ify Nwachukwu",
    email: "bistro@verandahbistro.ng",
    phone: "0802 000 1188",
    role: "vendor",
    dietaryPreferences: [],
    favoriteCuisineIds: [],
    vendorId: "vnd_bistro",
    isActive: true,
    password: DEMO_PASSWORD,
    createdAt: daysAgo(4),
  },
];

/* ------------------------------------------------------------- proteins */

type ProteinSeed = [string, number, string, string | null];
const proteinSeed: ProteinSeed[] = [
  ["Grilled chicken breast", 1500, "Char-grilled, lightly peppered", null],
  ["Crispy fried chicken thigh", 1200, "Buttermilk-brined and fried to order", null],
  ["Grilled beef steak", 2500, "200g sirloin, medium", null],
  ["Smoked suya beef strips", 1800, "House yaji spice blend", null],
  ["Grilled turkey wings", 2200, "Slow-grilled, pepper glazed", null],
  ["Fried fish fillet", 2000, "Crisp croaker fillet", null],
  ["Smoked catfish", 2300, "Point-and-kill style smoking", null],
  ["Pulled beef brisket", 2600, "Twelve-hour braise", "Mains"],
  ["Falafel patty", 1600, "Chickpea, herb and sesame", null],
  ["Two boiled eggs", 700, "Free-range", null],
  ["Extra scrambled eggs", 900, "Soft-scrambled with butter", "Breakfast"],
];

const proteins: Protein[] = proteinSeed.map(([name, price, description, appliesToCategory], i) => ({
  id: `pro_${i + 1}`,
  name,
  price,
  description,
  isAvailable: true,
  appliesToCategory,
  vendorIds: [],
  createdAt: daysAgo(200),
}));

/* --------------------------------------------------------------- extras */

type ExtraSeed = [string, number, string, string | null];
const extraSeed: ExtraSeed[] = [
  ["Extra melted cheese", 800, "Aged cheddar", null],
  ["Sliced avocado", 900, "Half avocado, ripe", null],
  ["Smoked bacon strips", 1300, "Two rashers", null],
  ["Sweet chilli sauce", 400, "House-made", null],
  ["Guacamole", 900, "Fresh lime and coriander", null],
  ["Sour cream", 500, "Cooling dollop", null],
  ["Loaded fries", 1500, "Cheese, jalapeño and bacon", "Sides"],
  ["Onion rings", 1200, "Beer-battered", null],
  ["Fried plantain (dodo)", 800, "Sweet ripe plantain", null],
  ["Extra pepper sauce", 300, "Nma's signature ata dindin", null],
  ["Coleslaw", 600, "Creamy, house dressing", "Sides"],
  ["Bottled water", 500, "75cl", "Drinks"],
  ["Chilled cola", 700, "35cl, served cold", "Drinks"],
];

const extras: Extra[] = extraSeed.map(([name, price, description, appliesToCategory], i) => ({
  id: `ext_${i + 1}`,
  name,
  price,
  description,
  isAvailable: true,
  appliesToCategory,
  vendorIds: [],
  createdAt: daysAgo(200),
}));

/* ------------------------------------------------------------ food items */

interface FoodSeed {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  cuisineId: string;
  category: string;
  ingredients: string[];
  dietary: FoodItem["dietary"];
  prepTimeMinutes: number;
  calories?: number;
  isPopular?: boolean;
  isSeasonalSpecial?: boolean;
  seasonalPrice?: number;
  stockCount?: number | null;
  lowStockThreshold?: number;
  isAvailable?: boolean;
  sizes?: FoodItem["sizes"];
  proteinIds?: string[];
  maxProteins?: number;
  extraIds?: string[];
  maxExtras?: number;
  proteinSelection?: FoodItem["proteinSelection"];
}

const foodSeed: FoodSeed[] = [
  {
    id: "fd_steak_eggs",
    vendorId: "vnd_nma",
    name: "Nma's Signature Steak & Eggs",
    description:
      "Grilled sirloin with two fried eggs, roasted tomatoes, cucumber ribbons and blueberries. Our most-ordered breakfast.",
    price: 8500,
    image: IMG.steakEggs,
    cuisineId: "cui_breakfast",
    category: "Breakfast",
    ingredients: ["Sirloin steak", "Free-range eggs", "Cherry tomatoes", "Cucumber", "Blueberries"],
    dietary: ["High-protein", "Gluten-free"],
    prepTimeMinutes: 20,
    calories: 620,
    isPopular: true,
    proteinIds: ["pro_11", "pro_1", "pro_2", "pro_10"],
    maxProteins: 2,
    extraIds: ["ext_2", "ext_3", "ext_10", "ext_13"],
    maxExtras: 3,
    proteinSelection: "optional",
  },
  {
    id: "fd_peppered_steak",
    vendorId: "vnd_nma",
    name: "Peppered Beef Steak Platter",
    description:
      "Thick-cut steak rested over our signature ata dindin, served with roasted plantain and a garden side.",
    price: 12500,
    image: IMG.steakEggs,
    cuisineId: "cui_nigerian",
    category: "Mains",
    ingredients: ["Beef steak", "Red bell pepper", "Scotch bonnet", "Ripe plantain", "Onions"],
    dietary: ["High-protein", "Spicy"],
    prepTimeMinutes: 30,
    calories: 780,
    isSeasonalSpecial: true,
    seasonalPrice: 10900,
    stockCount: 14,
    lowStockThreshold: 5,
    proteinIds: ["pro_3", "pro_8", "pro_5", "pro_7"],
    maxProteins: 2,
    extraIds: ["ext_9", "ext_10", "ext_11"],
    maxExtras: 3,
    proteinSelection: "optional",
  },
  {
    id: "fd_garden_bowl",
    vendorId: "vnd_nma",
    name: "Chef's Garden Salad Bowl",
    description:
      "Crisp leaves, heirloom tomatoes, toasted seeds and a bright citrus dressing. Add a protein to make it a full plate.",
    price: 4800,
    image: IMG.dining,
    cuisineId: "cui_continental",
    category: "Starters",
    ingredients: ["Mixed leaves", "Heirloom tomato", "Toasted seeds", "Citrus vinaigrette"],
    dietary: ["Vegetarian", "Gluten-free", "Low-carb"],
    prepTimeMinutes: 10,
    calories: 260,
    proteinIds: ["pro_1", "pro_9", "pro_6", "pro_4"],
    maxProteins: 1,
    extraIds: ["ext_2", "ext_5", "ext_11"],
    maxExtras: 2,
    proteinSelection: "optional",
  },
  {
    id: "fd_shawarma",
    vendorId: "vnd_nma",
    name: "Levantine Steak Shawarma",
    description:
      "Shaved steak, pickles, garlic toum and crisp lettuce wrapped in a griddled flatbread.",
    price: 5900,
    image: IMG.shawarma,
    cuisineId: "cui_continental",
    category: "Mains",
    ingredients: ["Steak", "Flatbread", "Pickles", "Garlic toum", "Lettuce"],
    dietary: ["High-protein"],
    prepTimeMinutes: 18,
    calories: 690,
    stockCount: 9,
    lowStockThreshold: 4,
    proteinIds: ["pro_1", "pro_2", "pro_9"],
    maxProteins: 1,
    extraIds: ["ext_4", "ext_7", "ext_10"],
    maxExtras: 3,
    proteinSelection: "required",
  },
  {
    id: "fd_bacon_burger",
    vendorId: "vnd_grill",
    name: "Smoky Bacon Cheeseburger",
    description:
      "Smashed beef patty, molten cheddar, smoked bacon and burger sauce in a toasted brioche bun.",
    price: 7200,
    image: IMG.burgerBacon,
    cuisineId: "cui_grills",
    category: "Mains",
    ingredients: ["Beef patty", "Cheddar", "Smoked bacon", "Brioche bun", "Burger sauce"],
    dietary: ["High-protein"],
    prepTimeMinutes: 22,
    calories: 840,
    isPopular: true,
    proteinIds: ["pro_2", "pro_8", "pro_1"],
    maxProteins: 2,
    extraIds: ["ext_1", "ext_3", "ext_7", "ext_8"],
    maxExtras: 4,
    proteinSelection: "optional",
  },
  {
    id: "fd_double_burger",
    vendorId: "vnd_grill",
    name: "Double Beef Burger & Wings Combo",
    description:
      "Two seared patties with grilled chicken wings and a generous basket of skin-on fries.",
    price: 9800,
    image: IMG.burgerWings,
    cuisineId: "cui_grills",
    category: "Mains",
    ingredients: ["Beef patties", "Chicken wings", "Fries", "Pickles", "House sauce"],
    dietary: ["High-protein"],
    prepTimeMinutes: 28,
    calories: 1180,
    isPopular: true,
    stockCount: 20,
    lowStockThreshold: 6,
    sizes: [
      { id: "sz_dbl_reg", label: "Regular", priceDelta: 0 },
      { id: "sz_dbl_large", label: "Large (extra patty)", priceDelta: 2500 },
    ],
    proteinIds: ["pro_2", "pro_8", "pro_1", "pro_5"],
    maxProteins: 2,
    extraIds: ["ext_1", "ext_3", "ext_7", "ext_8", "ext_13"],
    maxExtras: 4,
    proteinSelection: "optional",
  },
  {
    id: "fd_wings_basket",
    vendorId: "vnd_grill",
    name: "Grilled Wings & Fries Basket",
    description:
      "Eight charcoal-grilled wings tossed in yaji butter with seasoned fries and a dip.",
    price: 6500,
    image: IMG.burgerWings,
    cuisineId: "cui_grills",
    category: "Sides",
    ingredients: ["Chicken wings", "Yaji butter", "Fries", "Dipping sauce"],
    dietary: ["Spicy", "High-protein"],
    prepTimeMinutes: 20,
    calories: 720,
    isPopular: true,
    proteinIds: ["pro_10", "pro_9"],
    maxProteins: 1,
    extraIds: ["ext_7", "ext_8", "ext_4"],
    maxExtras: 3,
    proteinSelection: "none",
  },
  {
    id: "fd_party_platter",
    vendorId: "vnd_grill",
    name: "Republic Family Party Platter",
    description:
      "Sliders, crispy chicken, wings, loaded fries and dips. Built to feed four to six people.",
    price: 24500,
    image: IMG.partyPlatter,
    cuisineId: "cui_grills",
    category: "Platters",
    ingredients: ["Sliders", "Fried chicken", "Wings", "Loaded fries", "Dips"],
    dietary: [],
    prepTimeMinutes: 40,
    calories: 3200,
    isSeasonalSpecial: true,
    seasonalPrice: 21900,
    stockCount: 6,
    lowStockThreshold: 2,
    sizes: [
      { id: "sz_pl_four", label: "Serves 4", priceDelta: 0 },
      { id: "sz_pl_six", label: "Serves 6", priceDelta: 7000 },
    ],
    proteinIds: ["pro_2", "pro_5", "pro_1"],
    maxProteins: 2,
    extraIds: ["ext_7", "ext_8", "ext_4", "ext_13"],
    maxExtras: 4,
    proteinSelection: "optional",
  },
  {
    id: "fd_pepperoni",
    vendorId: "vnd_slice",
    name: "Classic Pepperoni Pizza",
    description:
      "48-hour fermented dough, San Marzano tomato, fior di latte and a generous pepperoni layer.",
    price: 11500,
    image: IMG.pizza,
    cuisineId: "cui_pizza",
    category: "Mains",
    ingredients: ["Sourdough base", "San Marzano tomato", "Fior di latte", "Pepperoni"],
    dietary: [],
    prepTimeMinutes: 25,
    calories: 960,
    isPopular: true,
    sizes: [
      { id: "sz_pz_9", label: 'Personal 9"', priceDelta: -2500 },
      { id: "sz_pz_12", label: 'Medium 12"', priceDelta: 0 },
      { id: "sz_pz_16", label: 'Family 16"', priceDelta: 4500 },
    ],
    proteinIds: ["pro_1", "pro_8", "pro_4", "pro_9"],
    maxProteins: 2,
    extraIds: ["ext_1", "ext_3", "ext_4", "ext_2"],
    maxExtras: 4,
    proteinSelection: "optional",
  },
  {
    id: "fd_pizza_platter",
    vendorId: "vnd_slice",
    name: "Pizzeria Sharing Platter",
    description:
      "Three half-pizzas — pepperoni, garden and a chef's special — with garlic dip and rocket.",
    price: 18500,
    image: IMG.partyPlatter,
    cuisineId: "cui_pizza",
    category: "Platters",
    ingredients: ["Pizza bases", "Assorted toppings", "Garlic dip", "Rocket"],
    dietary: [],
    prepTimeMinutes: 35,
    calories: 2100,
    stockCount: 5,
    lowStockThreshold: 2,
    proteinIds: ["pro_1", "pro_8", "pro_9"],
    maxProteins: 2,
    extraIds: ["ext_1", "ext_2", "ext_5"],
    maxExtras: 3,
    proteinSelection: "optional",
  },
  {
    id: "fd_birria",
    vendorId: "vnd_taco",
    name: "Slow-Braised Beef Birria Tacos",
    description:
      "Three hand-pressed tortillas filled with twelve-hour braised beef, melted cheese and rich consomé for dipping.",
    price: 8900,
    image: IMG.tacos,
    cuisineId: "cui_mexican",
    category: "Mains",
    ingredients: ["Braised beef", "Corn tortilla", "Oaxaca cheese", "Consomé", "Coriander"],
    dietary: ["High-protein", "Spicy"],
    prepTimeMinutes: 20,
    calories: 740,
    isPopular: true,
    proteinIds: ["pro_4", "pro_1", "pro_2", "pro_9"],
    maxProteins: 2,
    extraIds: ["ext_5", "ext_6", "ext_1", "ext_4"],
    maxExtras: 4,
    proteinSelection: "optional",
  },
  {
    id: "fd_chicken_tacos",
    vendorId: "vnd_taco",
    name: "Street Chicken Tacos",
    description:
      "Grilled chicken thigh, charred pineapple salsa, pickled onion and lime crema.",
    price: 6900,
    image: IMG.tacos,
    cuisineId: "cui_mexican",
    category: "Mains",
    ingredients: ["Chicken thigh", "Pineapple salsa", "Pickled onion", "Lime crema"],
    dietary: ["High-protein"],
    prepTimeMinutes: 18,
    calories: 610,
    stockCount: 16,
    lowStockThreshold: 5,
    proteinIds: ["pro_1", "pro_2", "pro_9"],
    maxProteins: 2,
    extraIds: ["ext_5", "ext_6", "ext_4"],
    maxExtras: 3,
    proteinSelection: "optional",
  },
  {
    id: "fd_nachos",
    vendorId: "vnd_taco",
    name: "Loaded Nacho Basket",
    description:
      "Warm tortilla chips under melted cheese, jalapeño, black beans, guacamole and sour cream.",
    price: 5500,
    image: IMG.partyPlatter,
    cuisineId: "cui_mexican",
    category: "Starters",
    ingredients: ["Tortilla chips", "Cheese", "Jalapeño", "Black beans", "Guacamole"],
    dietary: ["Vegetarian", "Spicy"],
    prepTimeMinutes: 15,
    calories: 880,
    proteinIds: ["pro_4", "pro_9"],
    maxProteins: 1,
    extraIds: ["ext_5", "ext_6", "ext_4"],
    maxExtras: 3,
    proteinSelection: "optional",
  },
  {
    id: "fd_club_platter",
    vendorId: "vnd_sunrise",
    name: "Triple Decker Club Platter",
    description:
      "A stacked club sandwich platter for sharing, with fries, garden salad and citrus dressing.",
    price: 13500,
    image: IMG.sandwiches,
    cuisineId: "cui_sandwich",
    category: "Platters",
    ingredients: ["Sourdough", "Chicken", "Bacon", "Egg", "Fries", "Salad"],
    dietary: [],
    prepTimeMinutes: 22,
    calories: 1450,
    isPopular: true,
    sizes: [
      { id: "sz_cl_two", label: "Serves 2", priceDelta: 0 },
      { id: "sz_cl_four", label: "Serves 4", priceDelta: 6000 },
    ],
    proteinIds: ["pro_1", "pro_2", "pro_6"],
    maxProteins: 2,
    extraIds: ["ext_2", "ext_3", "ext_11", "ext_13"],
    maxExtras: 4,
    proteinSelection: "optional",
  },
  {
    id: "fd_club_sandwich",
    vendorId: "vnd_sunrise",
    name: "Toasted Club Sandwich",
    description:
      "Triple-stacked sourdough with roast chicken, egg, crisp lettuce and a side of fries.",
    price: 4500,
    image: IMG.sandwiches,
    cuisineId: "cui_sandwich",
    category: "Sandwich",
    ingredients: ["Sourdough", "Roast chicken", "Egg", "Lettuce", "Fries"],
    dietary: [],
    prepTimeMinutes: 14,
    calories: 720,
    proteinIds: ["pro_1", "pro_2", "pro_10"],
    maxProteins: 1,
    extraIds: ["ext_2", "ext_3", "ext_11"],
    maxExtras: 3,
    proteinSelection: "optional",
  },
  {
    id: "fd_crispy_chicken_sandwich",
    vendorId: "vnd_sunrise",
    name: "Crispy Chicken Sandwich",
    description: "Buttermilk-fried chicken, pickles and honey-mustard mayo in a soft bun.",
    price: 5200,
    image: IMG.sandwiches,
    cuisineId: "cui_sandwich",
    category: "Sandwich",
    ingredients: ["Chicken thigh", "Pickles", "Honey mustard", "Soft bun"],
    dietary: [],
    prepTimeMinutes: 16,
    calories: 690,
    isAvailable: true,
    proteinIds: ["pro_2", "pro_10", "pro_1"],
    maxProteins: 1,
    extraIds: ["ext_1", "ext_3", "ext_11"],
    maxExtras: 2,
    proteinSelection: "optional",
  },
  {
    id: "fd_citrus_cooler",
    vendorId: "vnd_sunrise",
    name: "Chilled Citrus Cooler",
    description: "Fresh lime, orange and mint over crushed ice. Naturally caffeine-free.",
    price: 2500,
    image: IMG.patio,
    cuisineId: "cui_drinks",
    category: "Drinks",
    ingredients: ["Lime", "Orange", "Mint", "Crushed ice"],
    dietary: ["Vegan", "Gluten-free"],
    prepTimeMinutes: 5,
    calories: 140,
    stockCount: 40,
    lowStockThreshold: 10,
    proteinIds: [],
    maxProteins: 0,
    extraIds: ["ext_12"],
    maxExtras: 1,
    proteinSelection: "none",
  },
  {
    id: "fd_breakfast_sandwich",
    vendorId: "vnd_sunrise",
    name: "Sunrise Breakfast Sandwich",
    description:
      "Bacon, folded egg and cheddar on a toasted muffin with a hash-brown patty. Weekend special.",
    price: 4200,
    image: IMG.burgerBacon,
    cuisineId: "cui_breakfast",
    category: "Breakfast",
    ingredients: ["Bacon", "Egg", "Cheddar", "Muffin", "Hash brown"],
    dietary: [],
    prepTimeMinutes: 12,
    calories: 520,
    isSeasonalSpecial: true,
    seasonalPrice: 3600,
    proteinIds: ["pro_11", "pro_10", "pro_3"],
    maxProteins: 1,
    extraIds: ["ext_1", "ext_3", "ext_13"],
    maxExtras: 2,
    proteinSelection: "optional",
  },
];

const foods: FoodItem[] = foodSeed.map((seed, index) => ({
  id: seed.id,
  vendorId: seed.vendorId,
  name: seed.name,
  description: seed.description,
  price: seed.price,
  image: seed.image,
  cuisineId: seed.cuisineId,
  category: seed.category,
  ingredients: seed.ingredients,
  dietary: seed.dietary,
  prepTimeMinutes: seed.prepTimeMinutes,
  calories: seed.calories,
  isAvailable: seed.isAvailable ?? true,
  stockCount: seed.stockCount ?? null,
  lowStockThreshold: seed.lowStockThreshold ?? 3,
  isPopular: seed.isPopular ?? false,
  isSeasonalSpecial: seed.isSeasonalSpecial ?? false,
  seasonalPrice: seed.seasonalPrice ?? null,
  specialStartDate: seed.isSeasonalSpecial ? daysAgo(3) : null,
  specialEndDate: seed.isSeasonalSpecial
    ? new Date(Date.now() + 18 * DAY).toISOString()
    : null,
  sizes: seed.sizes ?? [],
  proteinSelection: seed.proteinSelection ?? "optional",
  proteinIds: seed.proteinIds ?? [],
  maxProteins: seed.maxProteins ?? 1,
  extraIds: seed.extraIds ?? [],
  maxExtras: seed.maxExtras ?? 2,
  createdAt: daysAgo(180 - index),
  updatedAt: daysAgo(Math.max(1, 40 - index)),
}));

/* -------------------------------------------------------------- riders */

const riders: Rider[] = [
  {
    id: "rdr_chidi",
    name: "Chidi Okonkwo",
    phone: "0803 552 9911",
    vehicle: "Bike",
    plateNumber: "KJA-431-QR",
    vendorId: null,
    isActive: true,
    isAvailable: true,
    rating: 4.8,
    deliveriesCompleted: 412,
    createdAt: daysAgo(210),
  },
  {
    id: "rdr_musa",
    name: "Musa Ibrahim",
    phone: "0805 118 7723",
    vehicle: "Bike",
    plateNumber: "ABJ-908-KL",
    vendorId: null,
    isActive: true,
    isAvailable: true,
    rating: 4.6,
    deliveriesCompleted: 288,
    createdAt: daysAgo(180),
  },
  {
    id: "rdr_blessing",
    name: "Blessing Adeyemi",
    phone: "0809 445 2210",
    vehicle: "Bicycle",
    plateNumber: "—",
    vendorId: null,
    isActive: true,
    isAvailable: false,
    rating: 4.9,
    deliveriesCompleted: 176,
    createdAt: daysAgo(120),
  },
  {
    id: "rdr_tunde",
    name: "Tunde Salami",
    phone: "0806 771 3344",
    vehicle: "Car",
    plateNumber: "LAG-772-XY",
    vendorId: "vnd_grill",
    isActive: true,
    isAvailable: true,
    rating: 4.7,
    deliveriesCompleted: 233,
    createdAt: daysAgo(150),
  },
  {
    id: "rdr_grace",
    name: "Grace Nwosu",
    phone: "0811 322 6688",
    vehicle: "Keke",
    plateNumber: "TRK-114-AA",
    vendorId: null,
    isActive: true,
    isAvailable: true,
    rating: 4.5,
    deliveriesCompleted: 97,
    createdAt: daysAgo(80),
  },
  {
    id: "rdr_emeka",
    name: "Emeka Obi",
    phone: "0813 665 0099",
    vehicle: "Bike",
    plateNumber: "KJA-556-BT",
    vendorId: "vnd_slice",
    isActive: false,
    isAvailable: false,
    rating: 4.2,
    deliveriesCompleted: 64,
    createdAt: daysAgo(70),
  },
];

/* ------------------------------------------------------------ addresses */

const addresses: Address[] = [
  {
    id: "adr_home",
    userId: "usr_customer",
    label: "Home",
    line1: "12B Kumasi Crescent",
    area: "Wuse II",
    city: "Abuja",
    state: "FCT",
    landmark: "Opposite Sahad Stores",
    latitude: 9.0801,
    longitude: 7.4788,
    isDefault: true,
    createdAt: daysAgo(58),
  },
  {
    id: "adr_work",
    userId: "usr_customer",
    label: "Work",
    line1: "Plot 447 Constitution Avenue",
    area: "Central Business District",
    city: "Abuja",
    state: "FCT",
    landmark: "12th floor reception",
    latitude: 9.0572,
    longitude: 7.4891,
    isDefault: false,
    createdAt: daysAgo(40),
  },
  {
    id: "adr_friend",
    userId: "usr_customer",
    label: "Sister's place",
    line1: "5 Gana Street",
    area: "Maitama",
    city: "Abuja",
    state: "FCT",
    latitude: 9.0868,
    longitude: 7.4951,
    isDefault: false,
    createdAt: daysAgo(12),
  },
  {
    id: "adr_tobi",
    userId: "usr_customer_2",
    label: "Home",
    line1: "24 Freedom Way",
    area: "Lekki Phase 1",
    city: "Lagos",
    state: "Lagos",
    latitude: 6.4443,
    longitude: 3.4707,
    isDefault: true,
    createdAt: daysAgo(28),
  },
];

/* ------------------------------------------------------------- settings */

const promoCodes: PromoCode[] = [
  { id: "prm_1", code: "NMA10", percentOff: 10, minOrder: 10000, isActive: true },
  { id: "prm_2", code: "WELCOME15", percentOff: 15, minOrder: 15000, isActive: true },
  { id: "prm_3", code: "FREEDEL", percentOff: 5, minOrder: 8000, isActive: false },
];

const settings: PlatformSettings = {
  siteName: "Nma's Kitchen",
  tagline: "Fresh food from kitchens near you, delivered hot.",
  logoText: "Nma's Kitchen",
  logoUrl: null,
  contactEmail: "support@nmaskitchen.ng",
  phone: "0800 662 5000",
  supportHours: "Daily, 7:00am – 11:00pm WAT",
  address: "152 Ademola Adetokunbo Crescent, Wuse II, Abuja",
  defaultDeliveryFee: 1500,
  defaultDeliveryMinutes: 35,
  defaultPrepMinutes: 25,
  categories: ["Breakfast", "Starters", "Mains", "Sides", "Platters", "Sandwich", "Drinks", "Desserts"],
  feeType: "percentage",
  feeValue: 7.5,
  minOrderValue: 2000,
  serviceEnabled: true,
  promoCodes,
};

/* --------------------------------------------------------------- banners */

const banners: Banner[] = [
  {
    id: "bnr_1",
    badge: "Weekend only",
    title: "30% off grilled platters",
    subtitle: "Family-sized burger and wing platters, delivered hot across Abuja and Lagos.",
    image: IMG.partyPlatter,
    buttonText: "Shop platters",
    buttonLink: "/foods?category=Platters",
    isActive: true,
    priority: 1,
    createdAt: daysAgo(6),
  },
  {
    id: "bnr_2",
    badge: "New on Nma's",
    title: "Stone-baked pepperoni",
    subtitle: "48-hour fermented dough from Slice & Spice Pizzeria. Personal to family size.",
    image: IMG.pizza,
    buttonText: "Order pizza",
    buttonLink: "/foods?cuisine=cui_pizza",
    isActive: true,
    priority: 2,
    createdAt: daysAgo(10),
  },
  {
    id: "bnr_3",
    badge: "Breakfast",
    title: "Start with steak & eggs",
    subtitle: "Our signature grilled breakfast, ready in 20 minutes.",
    image: IMG.steakEggs,
    buttonText: "See breakfast",
    buttonLink: "/foods?category=Breakfast",
    isActive: true,
    priority: 3,
    createdAt: daysAgo(14),
  },
  {
    id: "bnr_4",
    badge: "Free delivery",
    title: "No delivery fee over ₦25,000",
    subtitle: "Applies to every kitchen within our Abuja delivery zones.",
    image: IMG.dining,
    buttonText: "Browse kitchens",
    buttonLink: "/foods",
    isActive: true,
    priority: 4,
    createdAt: daysAgo(20),
  },
];

/* ---------------------------------------------------------------- orders */

function buildOrder(args: {
  id: string;
  index: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  addressId: string;
  items: Array<{ foodId: string; quantity: number; proteinIds?: string[]; extraIds?: string[]; sizeId?: string | null; instructions?: string }>;
  status: OrderStatus;
  hoursAgo: number;
  riderId?: string | null;
  promoCode?: string | null;
  paymentMethod?: Order["paymentMethod"];
  vendorNote?: string;
}): Order {
  const address = addresses.find((a) => a.id === args.addressId) ?? addresses[0];
  const orderItems: OrderItem[] = [];
  let subtotal = 0;
  let itemCount = 0;

  for (const line of args.items) {
    const food = foods.find((f) => f.id === line.foodId);
    if (!food) continue;
    const vendor = vendors.find((v) => v.id === food.vendorId);
    const size = line.sizeId ? food.sizes.find((s) => s.id === line.sizeId) : undefined;
    const lineProteins = (line.proteinIds ?? [])
      .map((id) => proteins.find((p) => p.id === id))
      .filter((p): p is Protein => Boolean(p))
      .map((p) => ({ id: p.id, name: p.name, price: p.price }));
    const lineExtras = (line.extraIds ?? [])
      .map((id) => extras.find((e) => e.id === id))
      .filter((e): e is Extra => Boolean(e))
      .map((e) => ({ id: e.id, name: e.name, price: e.price }));
    const addOnTotal = [...lineProteins, ...lineExtras].reduce((s, a) => s + a.price, 0);
    const unitPrice = food.price;
    const lineTotal = (unitPrice + (size?.priceDelta ?? 0) + addOnTotal) * line.quantity;
    subtotal += lineTotal;
    itemCount += line.quantity;

    orderItems.push({
      id: `${args.id}-li-${orderItems.length + 1}`,
      foodId: food.id,
      vendorId: food.vendorId,
      vendorName: vendor?.name ?? "Kitchen",
      name: food.name,
      image: food.image,
      unitPrice,
      sizeLabel: size?.label ?? null,
      sizePriceDelta: size?.priceDelta ?? 0,
      proteins: lineProteins,
      extras: lineExtras,
      instructions: line.instructions ?? "",
      quantity: line.quantity,
      lineTotal,
    });
  }

  const vendorIds = [...new Set(orderItems.map((i) => i.vendorId))];
  const deliveryFee = vendorIds.reduce(
    (sum, id) => sum + (vendors.find((v) => v.id === id)?.deliveryFee ?? settings.defaultDeliveryFee),
    0,
  );
  const promo = args.promoCode ? promoCodes.find((p) => p.code === args.promoCode) : undefined;
  const discount = promo && promo.isActive && subtotal >= promo.minOrder
    ? Math.round((subtotal * promo.percentOff) / 100)
    : 0;
  const fee = calcPlatformFee(subtotal, itemCount, settings);
  const createdAt = hoursAgo(args.hoursAgo);

  const vendorStatus: Record<string, OrderStatus> = {};
  for (const id of vendorIds) vendorStatus[id] = args.status;

  const flowPath = FULFILMENT_FLOW_FOR_SEED.slice(
    0,
    Math.max(1, FULFILMENT_FLOW_FOR_SEED.indexOf(args.status) + 1),
  );
  const timeline = flowPath.map((status, i) => ({
    status,
    at: new Date(new Date(createdAt).getTime() + i * 7 * 60_000).toISOString(),
    note: STATUS_NOTE[status],
    actor: (i < 2 ? "customer" : "vendor") as Order["timeline"][number]["actor"],
  }));

  return {
    id: args.id,
    customerId: args.customerId,
    customerName: args.customerName,
    customerPhone: args.customerPhone,
    vendorIds,
    items: orderItems,
    status: args.status,
    vendorStatus,
    subtotal,
    deliveryFee,
    platformFee: fee.amount,
    feeSnapshot: { type: settings.feeType, value: settings.feeValue },
    discount,
    promoCode: args.promoCode ?? null,
    total: Math.max(0, subtotal + deliveryFee + fee.amount - discount),
    address,
    paymentMethod: args.paymentMethod ?? "card",
    paymentStatus: args.status === "cancelled" ? "failed" : "paid",
    paymentReference: args.status === "cancelled" ? null : `DEV-PAY-${args.id}`,
    riderId: args.riderId ?? null,
    timeline,
    etaMinutes: settings.defaultDeliveryMinutes + args.index,
    trackingPath: [],
    trackingProgress: args.status === "delivered" ? 1 : 0.35,
    customerNote: "",
    vendorNote: args.vendorNote ?? "",
    createdAt,
    updatedAt: timeline[timeline.length - 1]?.at ?? createdAt,
  };
}

const FULFILMENT_FLOW_FOR_SEED: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "rider_assigned",
  "picked_up",
  "out_for_delivery",
  "delivered",
];

const STATUS_NOTE: Record<OrderStatus, string> = {
  pending: "Order placed",
  confirmed: "Accepted by the kitchen",
  preparing: "Cooking started",
  ready_for_pickup: "Packed and waiting for a rider",
  rider_assigned: "Rider assigned",
  picked_up: "Collected from the kitchen",
  out_for_delivery: "On the way to the customer",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Delivery failed",
};

const orders: Order[] = [
  buildOrder({
    id: "NMK-10241",
    index: 1,
    customerId: "usr_customer",
    customerName: "Adaeze Okafor",
    customerPhone: "0806 774 1122",
    addressId: "adr_home",
    items: [
      { foodId: "fd_bacon_burger", quantity: 1, proteinIds: ["pro_3"], extraIds: ["ext_3", "ext_7"], instructions: "No pickles please." },
      { foodId: "fd_wings_basket", quantity: 1, extraIds: ["ext_4"] },
    ],
    status: "delivered",
    hoursAgo: 96,
    riderId: "rdr_chidi",
    promoCode: "NMA10",
  }),
  buildOrder({
    id: "NMK-10243",
    index: 2,
    customerId: "usr_customer",
    customerName: "Adaeze Okafor",
    customerPhone: "0806 774 1122",
    addressId: "adr_work",
    items: [{ foodId: "fd_birria", quantity: 2, proteinIds: ["pro_4"], extraIds: ["ext_5"] }],
    status: "delivered",
    hoursAgo: 60,
    riderId: "rdr_musa",
  }),
  buildOrder({
    id: "NMK-10247",
    index: 3,
    customerId: "usr_customer",
    customerName: "Adaeze Okafor",
    customerPhone: "0806 774 1122",
    addressId: "adr_home",
    items: [
      { foodId: "fd_pepperoni", quantity: 1, sizeId: "sz_pz_16", extraIds: ["ext_1"] },
      { foodId: "fd_citrus_cooler", quantity: 2 },
    ],
    status: "delivered",
    hoursAgo: 20,
    riderId: "rdr_grace",
  }),
  buildOrder({
    id: "NMK-10251",
    index: 4,
    customerId: "usr_customer",
    customerName: "Adaeze Okafor",
    customerPhone: "0806 774 1122",
    addressId: "adr_home",
    items: [
      { foodId: "fd_double_burger", quantity: 1, proteinIds: ["pro_8"], extraIds: ["ext_7"] },
      { foodId: "fd_steak_eggs", quantity: 1 },
    ],
    status: "out_for_delivery",
    hoursAgo: 1,
    riderId: "rdr_tunde",
    vendorNote: "Rider is 3 minutes away.",
  }),
  buildOrder({
    id: "NMK-10252",
    index: 5,
    customerId: "usr_customer_2",
    customerName: "Tobi Adebayo",
    customerPhone: "0809 330 5566",
    addressId: "adr_tobi",
    items: [{ foodId: "fd_pizza_platter", quantity: 1 }],
    status: "preparing",
    hoursAgo: 0.5,
  }),
  buildOrder({
    id: "NMK-10249",
    index: 6,
    customerId: "usr_customer",
    customerName: "Adaeze Okafor",
    customerPhone: "0806 774 1122",
    addressId: "adr_friend",
    items: [{ foodId: "fd_club_platter", quantity: 1 }],
    status: "cancelled",
    hoursAgo: 30,
  }),
  buildOrder({
    id: "NMK-10253",
    index: 7,
    customerId: "usr_customer_2",
    customerName: "Tobi Adebayo",
    customerPhone: "0809 330 5566",
    addressId: "adr_tobi",
    items: [{ foodId: "fd_garden_bowl", quantity: 1, proteinIds: ["pro_9"] }],
    status: "pending",
    hoursAgo: 0.2,
  }),
];

/* --------------------------------------------------------------- reviews */

const reviews: Review[] = [
  {
    id: "rev_1",
    userId: "usr_customer",
    userName: "Adaeze Okafor",
    foodId: "fd_bacon_burger",
    vendorId: "vnd_grill",
    orderId: "NMK-10241",
    rating: 5,
    comment:
      "Genuinely the best burger I've had delivered in Abuja. Bacon was still crisp and the loaded fries travelled well.",
    photos: [],
    isVerifiedPurchase: true,
    vendorReply: {
      text: "Thank you Adaeze! We'll keep the bacon crispy for you.",
      at: hoursAgo(90),
    },
    isHidden: false,
    createdAt: hoursAgo(93),
  },
  {
    id: "rev_2",
    userId: "usr_customer",
    userName: "Adaeze Okafor",
    foodId: "fd_birria",
    vendorId: "vnd_taco",
    orderId: "NMK-10243",
    rating: 5,
    comment: "The consomé is the star. Rich, spicy and the tortillas held together perfectly.",
    photos: [],
    isVerifiedPurchase: true,
    vendorReply: null,
    isHidden: false,
    createdAt: hoursAgo(58),
  },
  {
    id: "rev_3",
    userId: "usr_customer",
    userName: "Adaeze Okafor",
    foodId: "fd_pepperoni",
    vendorId: "vnd_slice",
    orderId: "NMK-10247",
    rating: 4,
    comment: "Great crust and generous pepperoni. The family size is genuinely huge — good value.",
    photos: [],
    isVerifiedPurchase: true,
    vendorReply: null,
    isHidden: false,
    createdAt: hoursAgo(18),
  },
  {
    id: "rev_4",
    userId: "usr_customer_2",
    userName: "Tobi Adebayo",
    foodId: "fd_pizza_platter",
    vendorId: "vnd_slice",
    orderId: null,
    rating: 4,
    comment: "Loved the garden half of the platter. Would order again for a group.",
    photos: [],
    isVerifiedPurchase: false,
    vendorReply: null,
    isHidden: false,
    createdAt: hoursAgo(40),
  },
  {
    id: "rev_5",
    userId: "usr_customer_2",
    userName: "Tobi Adebayo",
    foodId: "fd_garden_bowl",
    vendorId: "vnd_nma",
    orderId: null,
    rating: 3,
    comment: "Fresh and light, though I'd have liked a little more dressing on the side.",
    photos: [],
    isVerifiedPurchase: false,
    vendorReply: {
      text: "Noted — we now send dressing separately on request. Thanks for the feedback!",
      at: hoursAgo(20),
    },
    isHidden: false,
    createdAt: hoursAgo(26),
  },
];

/* ------------------------------------------------------------------- db */

export function createSeedDatabase(): Database {
  return {
    version: 1,
    users,
    vendors,
    foods,
    cuisines,
    proteins,
    extras,
    orders,
    riders,
    reviews,
    banners,
    addresses,
    favorites: [
      { userId: "usr_customer", foodId: "fd_birria", at: daysAgo(12) },
      { userId: "usr_customer", foodId: "fd_bacon_burger", at: daysAgo(9) },
      { userId: "usr_customer_2", foodId: "fd_pizza_platter", at: daysAgo(5) },
    ],
    settings,
    audit: [],
    session: { userId: null },
    cart: [],
    delivery: { addressId: null, query: "" },
  };
}

/** Surfaces the demo logins in the sign-in screen. Development only. */
export const DEMO_ACCOUNTS = [
  { role: "customer" as const, email: "adaeze@example.com", label: "Customer — Adaeze Okafor" },
  { role: "vendor" as const, email: "grill@grillrepublic.ng", label: "Vendor — Grill Republic" },
  { role: "admin" as const, email: "merchant@nmaskitchen.ng", label: "Merchant (Admin) — Nma Odili" },
];
