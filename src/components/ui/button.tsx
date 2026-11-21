import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-primary text-primary-foreground uppercase tracking-wide hover:bg-primary/85",
        destructive:
          "rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "rounded-full border border-foreground/60 bg-transparent text-foreground uppercase tracking-wide hover:bg-foreground hover:text-background",
        secondary: "rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/85",
        cream:
          "rounded-full bg-cream text-ink uppercase tracking-wide hover:bg-cream/85",
        ghost: "hover:bg-foreground/10",
        google:
          "rounded-full border border-google-border bg-google-surface text-google-text font-medium [font-family:'Google_Sans',var(--font-sans)] hover:opacity-90",
        link: "text-foreground underline underline-offset-4 decoration-1 hover:decoration-2",
        nav: "label-caps text-[0.95rem] font-medium tracking-normal hover:opacity-70",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-sm",
        xl: "h-14 px-10 text-base",
        icon: "h-10 w-10",
        none: "h-auto p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
