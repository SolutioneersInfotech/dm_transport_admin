import { useMemo, useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { buildPresets } from "@/lib/dateRangePresets";

export default function DateRangePicker({ value, onChange, showPresets = true }) {
  const [open, setOpen] = useState(false);
  const presets = useMemo(() => buildPresets(new Date()), []);
  const today = useMemo(() => new Date(), []);
  const [tempRange, setTempRange] = useState(value);
  const [hoverDate, setHoverDate] = useState(null);

  useEffect(() => {
    setTempRange(value);
    setHoverDate(null);
  }, [value]);

  const handleSelect = (range) => {
    if (!range?.from) {
      setTempRange(undefined);
      setHoverDate(null);
      return;
    }

    if (range?.from && range?.to) {
      if (!tempRange?.from || tempRange?.to) {
        setTempRange({ from: range.from, to: undefined });
        setHoverDate(null);
        return;
      }
      setTempRange(range);
      setHoverDate(null);
      onChange(range);
      setOpen(false);
      return;
    }

    setTempRange({ from: range.from, to: undefined });
    setHoverDate(null);
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

  const label =
    value?.from && value?.to
      ? `${format(value.from, "MMM dd, yyyy")} - ${format(value.to, "MMM dd, yyyy")}`
      : "Select date range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="w-[260px] bg-[#1d232a] border border-gray-700 rounded-md px-3 py-2 text-left text-gray-300">
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
          onSelect={handleSelect}
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
