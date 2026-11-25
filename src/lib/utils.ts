import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class-name helper used by every shadcn/ui primitive.
 * Studio Admin ships the compiled `cn` package (Node >= 22); Escalia uses the
 * equivalent clsx + tailwind-merge pair to stay compatible with Node 20 LTS.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
