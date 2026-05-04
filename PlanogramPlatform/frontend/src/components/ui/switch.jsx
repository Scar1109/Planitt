import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef(({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
        className={cn(
            "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-slate-200 bg-slate-200/80 shadow-inner transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17A2B8] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-emerald-200 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200/80",
            className
        )}
        {...props}
        ref={ref}
    >
        <SwitchPrimitive.Thumb
            className={cn(
                "pointer-events-none block h-5 w-5 rounded-full border border-slate-200/80 bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
            )}
        />
    </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
