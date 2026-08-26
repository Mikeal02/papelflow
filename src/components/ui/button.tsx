import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { playClickSound } from "@/lib/sounds";
import { haptic } from "@/lib/sounds";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "text-sm font-medium tracking-[-0.01em] select-none",
    "transition-[background-color,box-shadow,color,border-color,transform,filter] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "active:translate-y-[0.5px]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-xs),inset_0_1px_0_hsl(0_0%_100%/0.12)] hover:brightness-[1.06] active:brightness-[0.97]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-xs)] hover:brightness-[1.06] active:brightness-[0.97]",
        outline:
          "border border-input bg-background text-foreground shadow-[var(--shadow-xs)] hover:bg-muted/60 hover:border-border",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-income text-white shadow-[var(--shadow-xs)] hover:brightness-[1.06] active:brightness-[0.97]",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 px-5",
        xl: "h-12 px-7 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  soundVariant?: "soft" | "crisp" | "success" | "toggle" | "none";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      soundVariant,
      onClick,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        const sound =
          soundVariant ??
          (variant === "ghost" || variant === "link" ? "none" : "soft");
        if (sound !== "none") {
          playClickSound(sound);
          haptic(sound === "success" ? "success" : "light");
        }
        onClick?.(e);
      },
      [soundVariant, variant, onClick],
    );

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={asChild ? onClick : handleClick}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
