import { ApiService, EventDescriptionGenerateRequest } from '../services/api.service';
import { isoFromDateTimeLocal } from './search-params';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface EventDescriptionFormValues {
  description?: string;
  name?: string;
  start_time?: string;
  end_time?: string;
  place?: string;
  organizer_group_id?: string;
}

export function buildDescriptionRequest(
  values: EventDescriptionFormValues,
): EventDescriptionGenerateRequest {
  const body: EventDescriptionGenerateRequest = {
    existing_description: values.description || '',
    event_name: values.name || undefined,
    start_time: isoFromDateTimeLocal(values.start_time) || undefined,
    end_time: isoFromDateTimeLocal(values.end_time) || undefined,
    place: values.place || undefined,
    organizer_group_id: values.organizer_group_id || undefined,
  };

  return body;
}

export function generateDescriptionSuggestion(
  api: ApiService,
  values: EventDescriptionFormValues,
): Observable<string> {
  const body = buildDescriptionRequest(values);

  return api
    .generateEventDescription(body)
    .pipe(
      map(
        (resp: any) =>
          (resp as any)?.data?.suggested_description ?? (resp as any)?.suggested_description ?? '',
      ),
    );
}
