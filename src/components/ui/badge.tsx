import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider", {
  variants: {
    variant: {
      cyan: "border-cyan/40 bg-cyan/10 text-cyan",
      violet: "border-violet/40 bg-violet/10 text-violet",
      magenta: "border-magenta/40 bg-magenta/10 text-magenta",
      gold: "border-gold/40 bg-gold/10 text-gold",
      success: "border-success/40 bg-success/10 text-success",
      danger: "border-danger/40 bg-danger/10 text-danger",
      muted: "border-foreground/15 bg-foreground/5 text-muted-foreground",
    },
  },
  defaultVariants: { variant: "cyan" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
