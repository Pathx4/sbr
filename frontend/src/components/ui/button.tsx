import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "outline" | "ghost"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-base font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-12 px-6 active:scale-[0.98] group",
          {
            "bg-gradient-to-r from-accent to-accent-secondary text-white shadow-sm hover:shadow-accent hover:-translate-y-0.5 hover:brightness-110": variant === "default",
            "border border-border bg-transparent text-foreground hover:border-accent/30 hover:bg-muted shadow-sm hover:-translate-y-0.5": variant === "outline",
            "bg-transparent text-muted-foreground hover:text-foreground": variant === "ghost",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
