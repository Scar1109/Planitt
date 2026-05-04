import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-[#1B4F72] text-white hover:bg-[#164060]",
                secondary:
                    "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200",
                destructive:
                    "border-transparent bg-red-500 text-white hover:bg-red-600",
                outline: "border-slate-200 text-slate-700 bg-white",
                success:
                    "border-transparent bg-green-100 text-green-700",
                warning:
                    "border-transparent bg-[#17A2B8]/10 text-[#1B4F72]",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function Badge({ className, variant, ...props }) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }

