declare module "lucide-react" {
  import type { ComponentType, SVGProps } from "react";

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    absoluteStrokeWidth?: boolean;
    className?: string;
  }

  export type LucideIcon = ComponentType<LucideProps>;

  export const LayoutDashboard: LucideIcon;
  export const ArrowLeftRight: LucideIcon;
  export const Target: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Plus: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const LogOut: LucideIcon;
  export const Wallet: LucideIcon;
  export const Calendar: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const X: LucideIcon;
  export const Check: LucideIcon;
  export const ArrowDownLeft: LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const CreditCard: LucideIcon;
  export const PieChart: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const User: LucideIcon;
  export const Tags: LucideIcon;
  export const Landmark: LucideIcon;
  export const Lock: LucideIcon;
  export const Shield: LucideIcon;
  export const PiggyBank: LucideIcon;
  export const Filter: LucideIcon;
  export const Search: LucideIcon;
  export const Pencil: LucideIcon;
  export const Trash2: LucideIcon;
  export const Layers: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Clock: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const Sparkles: LucideIcon;

  const icons: Record<string, LucideIcon>;
  export default icons;
}
