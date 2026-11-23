import {
  BookOpen,
  Briefcase,
  Car,
  Circle,
  CircleEllipsis,
  CirclePlus,
  Clapperboard,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  House,
  Music,
  PawPrint,
  Phone,
  Plane,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Store,
  Target,
  Tv,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Íconos disponibles para categorías, metas y gastos fijos. En la base se guarda
 * el nombre en kebab-case de lucide ("shopping-bag").
 */
export const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  utensils: { icon: Utensils, label: "Comida" },
  "shopping-cart": { icon: ShoppingCart, label: "Supermercado" },
  car: { icon: Car, label: "Transporte" },
  clapperboard: { icon: Clapperboard, label: "Entretenimiento" },
  "shopping-bag": { icon: ShoppingBag, label: "Compras" },
  "heart-pulse": { icon: HeartPulse, label: "Salud" },
  house: { icon: House, label: "Hogar" },
  zap: { icon: Zap, label: "Luz" },
  wifi: { icon: Wifi, label: "Internet" },
  phone: { icon: Phone, label: "Teléfono" },
  tv: { icon: Tv, label: "Streaming" },
  music: { icon: Music, label: "Música" },
  dumbbell: { icon: Dumbbell, label: "Gimnasio" },
  shield: { icon: Shield, label: "Seguro" },
  "graduation-cap": { icon: GraduationCap, label: "Educación" },
  "book-open": { icon: BookOpen, label: "Libros" },
  "paw-print": { icon: PawPrint, label: "Mascotas" },
  plane: { icon: Plane, label: "Viaje" },
  briefcase: { icon: Briefcase, label: "Trabajo" },
  store: { icon: Store, label: "Negocio" },
  "circle-plus": { icon: CirclePlus, label: "Otros ingresos" },
  "circle-ellipsis": { icon: CircleEllipsis, label: "Otros" },
  target: { icon: Target, label: "Meta" },
};

export function iconFor(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]?.icon) || Circle;
}
