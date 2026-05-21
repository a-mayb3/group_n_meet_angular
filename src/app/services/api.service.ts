import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  success: boolean;
}

export interface EventDescriptionGenerateRequest {
  existing_description: string;
  event_name?: string;
  start_time?: string;
  end_time?: string;
  place?: string;
  organizer_group_id?: string;
}

export interface EventDescriptionGenerateResponse {
  suggested_description: string;
}

/**
 * Explicit options shape that forces the 'body' observe overload on HttpClient
 */
type BodyOptions = {
  params?: HttpParams | { [key: string]: string | string[] };
  withCredentials?: boolean;
  observe: 'body';
};

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}

  /**
   * GET request
   */
  get<T = any>(
    endpoint: string,
    params?: HttpParams | { [key: string]: string | string[] },
  ): Observable<ApiResponse<T>> {
    const options: BodyOptions = { params, withCredentials: true, observe: 'body' };
    return this.http.get<ApiResponse<T>>(`${environment.apiUrl}${endpoint}`, options);
  }

  /**
   * POST request
   */
  post<T = any>(
    endpoint: string,
    body: any,
    params?: HttpParams | { [key: string]: string | string[] },
  ): Observable<ApiResponse<T>> {
    const options: BodyOptions = { params, withCredentials: true, observe: 'body' };
    return this.http.post<ApiResponse<T>>(`${environment.apiUrl}${endpoint}`, body, options);
  }

  /**
   * PUT request
   */
  put<T = any>(
    endpoint: string,
    body: any,
    params?: HttpParams | { [key: string]: string | string[] },
  ): Observable<ApiResponse<T>> {
    const options: BodyOptions = { params, withCredentials: true, observe: 'body' };
    return this.http.put<ApiResponse<T>>(`${environment.apiUrl}${endpoint}`, body, options);
  }

  /**
   * PATCH request
   */
  patch<T = any>(
    endpoint: string,
    body: any,
    params?: HttpParams | { [key: string]: string | string[] },
  ): Observable<ApiResponse<T>> {
    const options: BodyOptions = { params, withCredentials: true, observe: 'body' };
    return this.http.patch<ApiResponse<T>>(`${environment.apiUrl}${endpoint}`, body, options);
  }

  generateEventDescription(
    body: EventDescriptionGenerateRequest,
  ): Observable<ApiResponse<EventDescriptionGenerateResponse>> {
    const options: BodyOptions = { withCredentials: true, observe: 'body' };
    return this.http.post<ApiResponse<EventDescriptionGenerateResponse>>(
      `${environment.apiUrl}/events/generate-description`,
      body,
      options,
    );
  }

  /**
   * DELETE request
   */
  delete<T = any>(
    endpoint: string,
    params?: HttpParams | { [key: string]: string | string[] },
  ): Observable<ApiResponse<T>> {
    const options: BodyOptions = { params, withCredentials: true, observe: 'body' };
    return this.http.delete<ApiResponse<T>>(`${environment.apiUrl}${endpoint}`, options);
  }
}
