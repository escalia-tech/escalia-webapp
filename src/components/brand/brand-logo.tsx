import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Single entry point for the official Escalia logos (public/branding, integrity-checked by
 * docs/branding/ASSET_MANIFEST.sha256). Assets are used as provided: never recoloured, redrawn or
 * replaced by typography. Horizontal light logo on light surfaces, white logo on dark surfaces
 * (switched with CSS only, so there is no hydration mismatch).
 */

const LOGOS = {
  horizontalLight: "/branding/logos/escalia-horizontal.svg",
  horizontalWhite: "/branding/logos/escalia-white.svg",
  icon: "/branding/icons/escalia-icon.svg",
} as const;

interface BrandLogoProps {
  variant?: "horizontal" | "icon";
  /** Tailwind height class; the width follows the official 3:1 ratio (icon is square). */
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ variant = "horizontal", className = "h-10", priority = false }: BrandLogoProps) {
  if (variant === "icon") {
    return (
      <Image
        src={LOGOS.icon}
        alt="Escalia"
        width={120}
        height={120}
        unoptimized
        priority={priority}
        className={cn("aspect-square w-auto", className)}
      />
    );
  }

  return (
    <>
      <Image
        src={LOGOS.horizontalLight}
        alt="Escalia"
        width={600}
        height={200}
        unoptimized
        priority={priority}
        className={cn("aspect-[3/1] w-auto dark:hidden", className)}
      />
      <Image
        src={LOGOS.horizontalWhite}
        alt="Escalia"
        width={600}
        height={200}
        unoptimized
        priority={priority}
        className={cn("hidden aspect-[3/1] w-auto dark:block", className)}
      />
    </>
  );
}
