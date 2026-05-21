export interface SearchFilters {
  name?: string;
  organizer_group_name?: string;
  place?: string;
  start_time_from?: string;
  start_time_to?: string;
  end_time_from?: string;
  end_time_to?: string;
}

export function formatLocalDateTime(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return `${value}:00`;
  }
  return value;
}

export function isoFromDateTimeLocal(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    // Accepts 'YYYY-MM-DDTHH:mm' or full ISO; normalize to ISO
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}

export function buildSearchParams(filters: SearchFilters): { [key: string]: string } {
  const params: { [key: string]: string } = {};
  if (filters.name) params['name'] = filters.name;
  if (filters.organizer_group_name) params['organizer_group_name'] = filters.organizer_group_name;
  if (filters.place) params['place'] = filters.place;
  const sFrom = formatLocalDateTime(filters.start_time_from);
  if (sFrom) params['start_time_from'] = sFrom;
  const sTo = formatLocalDateTime(filters.start_time_to);
  if (sTo) params['start_time_to'] = sTo;
  const eFrom = formatLocalDateTime(filters.end_time_from);
  if (eFrom) params['end_time_from'] = eFrom;
  const eTo = formatLocalDateTime(filters.end_time_to);
  if (eTo) params['end_time_to'] = eTo;
  return params;
}
