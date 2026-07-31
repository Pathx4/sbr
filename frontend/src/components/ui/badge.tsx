import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  pulse?: boolean;
}

function Badge({ className, children, pulse = false, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-full border border-accent/30 bg-accent/5 px-5 py-2",
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
        </span>
      )}
      {!pulse && <span className="h-2 w-2 rounded-full bg-accent" />}
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-accent font-medium">
        {children}
      </span>
    </div>
  )
}

export { Badge }
