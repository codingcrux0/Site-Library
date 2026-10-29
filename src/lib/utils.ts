import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// The standard shadcn helper: joins class names and lets later Tailwind classes
// win over earlier ones (e.g. cn("p-2", "p-4") gives "p-4").
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
