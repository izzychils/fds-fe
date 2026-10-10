import {
  Beef,
  CakeSlice,
  Carrot,
  Coffee,
  CookingPot,
  CupSoda,
  Drumstick,
  EggFried,
  Fish,
  Flame,
  IceCream,
  Leaf,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";

/**
 * Cuisine and category iconography.
 *
 * The reference design marks each cuisine with a pictogram, and this build
 * renders them as line icons rather than emoji so they inherit the brand colour,
 * stay sharp at any size and read identically on every platform. Cuisine records
 * keep their `emoji` field, but nothing displays it any more.
 */
const RULES: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /nigerian|west african|local|soup|stew|jollof|pepper/i, icon: CookingPot },
  { match: /soup|broth|ramen|pho/i, icon: Soup },
  { match: /breakfast|egg|brunch/i, icon: EggFried },
  { match: /burger|grill|bbq|suya|steak|beef/i, icon: Beef },
  { match: /chicken|wing|poultry/i, icon: Drumstick },
  { match: /seafood|fish|shrimp|prawn/i, icon: Fish },
  { match: /salad|vegetable|vegan|vegetarian|healthy|green/i, icon: Salad },
  { match: /starter|appetiser|appetizer|small chop|snack/i, icon: Soup },
  { match: /side|accompaniment|extra portion/i, icon: Carrot },
  { match: /pizza|italian|pasta/i, icon: Pizza },
  { match: /sandwich|wrap|shawarma|burger bun|sub/i, icon: Sandwich },
  { match: /drink|juice|smoothie|cup|soda|water/i, icon: CupSoda },
  { match: /dessert|cake|pastry|bakery|sweet/i, icon: CakeSlice },
  { match: /ice|frozen|yoghurt|yogurt/i, icon: IceCream },
  { match: /coffee|tea|café|cafe/i, icon: Coffee },
  { match: /wine|bar|cocktail/i, icon: Wine },
  { match: /spice|pepper|hot|chilli|chili/i, icon: Flame },
  { match: /plate|platter|main|dish|combo|bundle/i, icon: Utensils },
];

export function cuisineIcon(label: string): LucideIcon {
  const rule = RULES.find((entry) => entry.match.test(label));
  return rule?.icon ?? Leaf;
}
