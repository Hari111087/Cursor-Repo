import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-cyan text-[#030608] hover:shadow-glow hover:brightness-110 font-semibold",
        secondary: "bg-violet/90 text-white hover:bg-violet hover:shadow-glow-violet",
        accent: "bg-magenta text-white hover:shadow-glow-magenta",
        outline: "border border-cyan/40 text-cyan hover:bg-cyan/10 hover:shadow-glow",
        ghost: "hover:bg-foreground/5 text-foreground/80 hover:text-foreground",
        danger: "bg-danger/90 text-white hover:bg-danger",
        success: "bg-success text-[#030608] font-semibold hover:brightness-110",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
export { buttonVariants };
