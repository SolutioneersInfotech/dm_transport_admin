import { useMemo, useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { buildPresets } from "@/lib/dateRangePresets";

export default function DateRangePicker({
  value,
  onChange,
  showPresets = true,
  triggerWidthClassName = "w-fit",
  labelClassName = "text-center",
}) {
  const [open, setOpen] = useState(false);
  const presets = useMemo(() => buildPresets(new Date()), []);
  const today = useMemo(() => new Date(), []);
  const [tempRange, setTempRange] = useState(value);
  const [hoverDate, setHoverDate] = useState(null);

  useEffect(() => {
    setTempRange(value);
    setHoverDate(null);
  }, [value]);

  const handleDayClick = (day) => {
    setHoverDate(null);

    if (!tempRange?.from || tempRange?.to) {
      setTempRange({ from: day, to: undefined });
      return;
    }

    const fromDate = tempRange.from;
    const nextRange = day < fromDate ? { from: day, to: fromDate } : { from: fromDate, to: day };

    setTempRange(nextRange);
    onChange(nextRange);
    setOpen(false);
  };

  const applyPreset = (presetRange) => {
    setTempRange(presetRange);
    setHoverDate(null);
    onChange(presetRange);
    setOpen(false);
  };

  const previewRange = useMemo(() => {
    if (tempRange?.from && !tempRange?.to && hoverDate) {
      return { from: tempRange.from, to: hoverDate };
    }
    return tempRange;
  }, [tempRange, hoverDate]);

  const formattedFrom = value?.from ? format(value.from, "MMM dd, yyyy") : null;
  const formattedTo = value?.to ? format(value.to, "MMM dd, yyyy") : null;
  const label = formattedFrom && formattedTo ? (
    <span
      className={`grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 ${labelClassName}`}
    >
      <span className="text-left">{formattedFrom}</span>
      <span className="text-gray-400">-</span>
      <span className="text-right">{formattedTo}</span>
    </span>
  ) : (
    <span className={`w-full ${labelClassName}`}>Select date range</span>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`inline-flex ${triggerWidthClassName} items-center justify-center whitespace-nowrap bg-[#1d232a] border border-gray-700 rounded-md px-6 py-2 text-gray-300 transition-colors hover:bg-[#20262e] hover:border-gray-600`}
      >
        {label}
      </PopoverTrigger>

      <PopoverContent className="p-3 bg-[#0f141a] border border-gray-800 rounded-xl w-auto">
        {showPresets && (
          <div className="flex flex-wrap gap-2 mb-3 max-w-[620px]">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.range)}
                className={[
                  "px-3 py-1.5 text-xs rounded-full border transition",
                  p.key === "clear"
                    ? "border-gray-700 text-gray-300 hover:bg-[#1d232a]"
                    : "border-gray-700 text-gray-200 hover:bg-[#1d232a]",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        <Calendar
          mode="range"
          selected={previewRange}
          onDayClick={handleDayClick}
          onDayMouseEnter={(day) => {
            if (tempRange?.from && !tempRange?.to) {
              setHoverDate(day);
            }
          }}
          onDayMouseLeave={() => {
            if (tempRange?.from && !tempRange?.to) {
              setHoverDate(null);
            }
          }}
          showOutsideDays={false}
          disabled={{ after: today }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
