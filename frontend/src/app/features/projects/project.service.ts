import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_URL } from '../../core/api-url';
import { DataResponse } from '../../models/api';
import { Project, ProjectInput, ProjectQuery } from '../../models/project';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_URL)}/projects`;

  list(query: ProjectQuery = {}): Observable<Project[]> {
    return this.http
      .get<DataResponse<Project[]>>(this.baseUrl, { params: toParams(query) })
      .pipe(map((response) => response.data));
  }

  get(id: number): Observable<Project> {
    return this.http
      .get<DataResponse<Project>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  create(input: ProjectInput): Observable<Project> {
    return this.http
      .post<DataResponse<Project>>(this.baseUrl, input)
      .pipe(map((response) => response.data));
  }

  update(id: number, input: ProjectInput): Observable<Project> {
    return this.http
      .put<DataResponse<Project>>(`${this.baseUrl}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

/** Sends only the filters that are set, so the API applies its defaults. */
function toParams(query: ProjectQuery): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(query)) {
    const text = typeof value === 'string' ? value.trim() : '';

    if (text !== '') {
      params = params.set(key, text);
    }
  }

  return params;
}
