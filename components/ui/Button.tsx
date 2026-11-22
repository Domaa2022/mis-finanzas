import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark hover:text-white",
  secondary: "border border-line-strong bg-white text-ink hover:bg-surface hover:text-ink",
  ghost: "bg-transparent text-primary hover:bg-primary-soft hover:text-primary-dark",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-[15px]",
  lg: "h-[52px] px-5 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "lg",
  block = false,
  className,
}: { variant?: Variant; size?: Size; block?: boolean; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], block && "w-full", className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; block?: boolean };

export function Button({ variant, size, block, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, block, className })} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; block?: boolean };

/** Enlace con apariencia de botón. */
export function ButtonLink({ variant, size, block, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, block, className })} {...props} />;
}
