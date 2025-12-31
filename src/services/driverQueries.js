import { useQuery } from "@tanstack/react-query";
import { fetchDrivers } from "./driverAPI";

export function useDriversQuery() {
  return useQuery({
    queryKey: ["drivers"],
    queryFn: fetchDrivers,
  });
}
