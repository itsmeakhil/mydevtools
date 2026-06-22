import { parseISO } from "date-fns/parseISO";
import { isValid } from "date-fns/isValid";
import { parse } from "date-fns/parse";

export function safeParseDate(dateString: string | undefined): Date | null {
  if (!dateString) return null;

  try {
    const isoDate = parseISO(dateString);
    if (isValid(isoDate)) return isoDate;
  } catch {
    // not ISO
  }

  try {
    const parsedDate = parse(dateString, "dd MMM yyyy, hh:mm a", new Date());
    if (isValid(parsedDate)) return parsedDate;
  } catch {
    // not that format
  }

  try {
    const datePart = dateString.split(",")[0]?.trim();
    if (datePart) {
      const parsedDate = parse(datePart, "dd MMM yyyy", new Date());
      if (isValid(parsedDate)) return parsedDate;
    }
  } catch {
    // fall through
  }

  try {
    const date = new Date(dateString);
    if (isValid(date)) return date;
  } catch {
    // not a date
  }

  return null;
}
