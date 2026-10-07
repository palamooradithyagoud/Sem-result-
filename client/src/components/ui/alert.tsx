import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";

export function Alert({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex gap-3 rounded-md border border-border bg-card p-4 text-sm", className)}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
