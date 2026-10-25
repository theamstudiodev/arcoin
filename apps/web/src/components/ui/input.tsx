import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import {cn} from '@/lib/utils';

// 16px at EVERY width, never `md:text-sm`. Below 16px iOS Safari zooms the page and stays zoomed, and
// `md` is 768px — which is an iPad in portrait running iOS Safari, not a desktop. The e2e suite asserts
// the 16px but only on the phone project, so the iPad case was live and untested.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-field md:h-10 transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
