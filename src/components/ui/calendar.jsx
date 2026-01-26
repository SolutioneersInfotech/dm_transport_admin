import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-white",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-gray-300 border-gray-700 hover:bg-[#1d232a]"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",

        // KEY FIX: STOP USING aria-selected AND USE MODIFIER CLASSES ONLY
        cell: `
          h-9 w-9 text-center text-sm p-0 relative 
          [&:has(.day-range-start)]:rounded-l-md
          [&:has(.day-range-end)]:rounded-r-md
          [&:has(.day-range-middle)]:bg-[#1f6feb]/20
          [&:has(.day-range-middle)]:text-white
          [&:has(.day-outside.day-range-middle)]:bg-[#1f6feb]/10
          focus-within:relative focus-within:z-20
        `,

        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-gray-300 hover:bg-[#1d232a] hover:text-white"
        ),

        day_range_start: "day-range-start bg-[#1f6feb] text-white",
        day_range_end: "day-range-end bg-[#1f6feb] text-white",

        day_range_middle: "day-range-middle bg-[#1f6feb]/20 text-white",

        day_today: "bg-[#1d232a] text-[#1f6feb] font-semibold",
        day_outside: "day-outside text-gray-500 opacity-50",
        day_disabled: "text-gray-600 opacity-50",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
