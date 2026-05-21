import { ApiService, EventDescriptionGenerateRequest } from '../services/api.service';
import { FormGroup } from '@angular/forms';
import { isoFromDateTimeLocal } from './search-params';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export function generateDescriptionSuggestion(
  api: ApiService,
  form: FormGroup,
): Observable<string> {
  const body: EventDescriptionGenerateRequest = {
    existing_description: form.get('description')?.value || '',
    event_name: form.get('name')?.value || undefined,
    start_time: isoFromDateTimeLocal(form.get('start_time')?.value) || undefined,
    end_time: isoFromDateTimeLocal(form.get('end_time')?.value) || undefined,
    place: form.get('place')?.value || undefined,
    organizer_group_id: form.get('organizer_group_id')?.value || undefined,
  };

  return api
    .generateEventDescription(body)
    .pipe(
      map(
        (resp: any) =>
          (resp as any)?.data?.suggested_description ?? (resp as any)?.suggested_description ?? '',
      ),
    );
}
