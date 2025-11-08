import dayjs from 'dayjs';

export const toIso = (d: string | Date) => dayjs(d).toISOString();

export const isWithinRange = (iso: string, startIso: string, endIso: string) =>
  dayjs(iso).isAfter(dayjs(startIso).subtract(1, 'millisecond')) &&
  dayjs(iso).isBefore(dayjs(endIso).add(1, 'millisecond'));
