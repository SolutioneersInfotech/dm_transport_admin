import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
} from "date-fns";

export function buildPresets(now = new Date()) {
  const todayEnd = endOfDay(now);
  const todayStart = startOfDay(now);

  const thisMonthFrom = startOfMonth(now);
  const thisMonthTo = endOfMonth(now);

  const lastMonthDate = subMonths(now, 1);
  const lastMonthFrom = startOfMonth(lastMonthDate);
  const lastMonthTo = endOfMonth(lastMonthDate);

  const ytdFrom = startOfYear(now);

  return [
    {
      key: "last7",
      label: "Last 7 days",
      range: { from: startOfDay(subDays(todayStart, 6)), to: todayEnd },
    },
    {
      key: "last30",
      label: "Last 30 days",
      range: { from: startOfDay(subDays(todayStart, 29)), to: todayEnd },
    },
    {
      key: "thisMonth",
      label: "This Month",
      range: { from: startOfDay(thisMonthFrom), to: endOfDay(thisMonthTo) },
    },
    {
      key: "lastMonth",
      label: "Last Month",
      range: { from: startOfDay(lastMonthFrom), to: endOfDay(lastMonthTo) },
    },
    {
      key: "ytd",
      label: "YTD",
      range: { from: startOfDay(ytdFrom), to: todayEnd },
    },
    {
      key: "clear",
      label: "Clear",
      range: { from: undefined, to: undefined },
    },
  ];
}
