import { queryOptions } from "@tanstack/react-query";
import { getAvailability, getBooking, getTicketTypes } from "./museum.functions";

export const ticketTypesQuery = () =>
  queryOptions({
    queryKey: ["ticket-types"],
    queryFn: () => getTicketTypes(),
    staleTime: 5 * 60_000,
  });

export const availabilityQuery = (date: string) =>
  queryOptions({
    queryKey: ["availability", date],
    queryFn: () => getAvailability({ data: { date } }),
    staleTime: 15_000,
  });

export const bookingQuery = (code: string) =>
  queryOptions({
    queryKey: ["booking", code.toUpperCase()],
    queryFn: () => getBooking({ data: { code } }),
  });
