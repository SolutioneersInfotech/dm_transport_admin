import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Select = ({ value, onValueChange, children, disabled, ...props }) => {
  const [open, setOpen] = React.useState(false)
  
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
      {children({ value, onValueChange, open, setOpen, disabled })}
    </PopoverPrimitive.Root>
  )
}

const SelectTrigger = React.forwardRef(
  ({ className, children, disabled, ...props }, ref) => (
    <PopoverPrimitive.Trigger
      ref={ref}
      disabled={disabled}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-gray-700 bg-[#161b22] px-3 py-2 text-sm text-white shadow-sm transition-colors hover:bg-[#1d232a] hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </PopoverPrimitive.Trigger>
  )
)
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-700 bg-[#161b22] text-white shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
)
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(
  ({ className, children, value, selected, onSelect, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-[#1d232a] focus:bg-[#1d232a] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        selected && "bg-[#1d232a] text-[#1f6feb]",
        className
      )}
      onClick={() => onSelect?.(value)}
      {...props}
    >
      {selected && <Check className="mr-2 h-4 w-4" />}
      <span className={selected ? "" : "ml-6"}>{children}</span>
    </div>
  )
)
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectContent, SelectItem }
