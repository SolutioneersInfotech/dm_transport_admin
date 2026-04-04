import { useQuery } from "@tanstack/react-query";
import { fetchDriverCount, fetchDrivers } from "./driverAPI";

export function useDriversQuery({ page = 1, limit = 100, search = "" } = {}) {
  return useQuery({
    queryKey: ["drivers", page, limit, search],
    queryFn: () => fetchDrivers({ page, limit, search }),
  });
}


export function useDriverCountQuery({ search = "", status = "all", category = "all" } = {}) {
  return useQuery({
    queryKey: ["driver-count", search, status, category],
    queryFn: () => fetchDriverCount({ search, status, category }),
  });
}
