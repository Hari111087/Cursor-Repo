"use client";
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-foreground/15 transition-colors data-[state=checked]:border-cyan/60 data-[state=checked]:bg-cyan/30 data-[state=unchecked]:bg-foreground/10 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 translate-x-1 rounded-full bg-foreground/70 transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-cyan data-[state=checked]:shadow-glow" />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = "Switch";
