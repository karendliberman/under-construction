import { cn } from "@/lib/utils";

/**
 * Typographic mark rather than a logo. A drawn logo now would be a guess, and
 * the serif does more for credibility with this audience than a symbol would.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-serif text-lg tracking-tight", className)}>
      Under Construction
    </span>
  );
}
