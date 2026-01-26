import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (range) => {
    onChange(range);
    if (range?.from && range?.to) {
      setOpen(false);
    }
  };

  const label =
    value?.from && value?.to
      ? `${format(value.from, "MMM dd, yyyy")} - ${format(value.to, "MMM dd, yyyy")}`
      : "Select date range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="w-[260px] bg-[#1d232a] border border-gray-700 rounded-md px-3 py-2 text-left text-gray-300">
        {label}
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Calendar mode="range" selected={value} onSelect={handleSelect} numberOfMonths={2} />
      </PopoverContent>
    </Popover>
  );
}
