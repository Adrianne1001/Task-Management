import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  Project,
  ProjectInput,
  ProjectPriority,
  ProjectSortField,
  ProjectStatus,
  SortDirection,
} from '../../models/project';
import { ProjectService } from './project.service';

const PROJECT: Project = {
  id: 1,
  clientName: 'Acme Corp',
  projectName: 'Website Redesign',
  description: 'Redesign the corporate website.',
  status: ProjectStatus.InProgress,
  priority: ProjectPriority.High,
  startDate: '2026-03-01',
  dueDate: '2026-05-15',
};

const { id: _id, ...INPUT } = PROJECT;

describe('ProjectService', () => {
  let service: ProjectService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists projects, unwrapping the data envelope', () => {
    let result: Project[] | undefined;
    service.list().subscribe((projects) => (result = projects));

    const request = http.expectOne('/api/projects');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ data: [PROJECT] });

    expect(result).toEqual([PROJECT]);
  });

  it('sends only the filters that are set, trimmed', () => {
    service
      .list({
        search: '  acme ',
        status: ProjectStatus.OnHold,
        priority: undefined,
        sort: ProjectSortField.DueDate,
        direction: SortDirection.Desc,
      })
      .subscribe();

    const request = http.expectOne((req) => req.url === '/api/projects');
    expect(request.request.params.toString()).toBe(
      'search=acme&status=On%20Hold&sort=dueDate&direction=desc',
    );
    request.flush({ data: [] });
  });

  it('omits a whitespace-only search', () => {
    service.list({ search: '   ' }).subscribe();

    const request = http.expectOne((req) => req.url === '/api/projects');
    expect(request.request.params.has('search')).toBe(false);
    request.flush({ data: [] });
  });

  it('gets one project', () => {
    let result: Project | undefined;
    service.get(1).subscribe((project) => (result = project));

    http.expectOne({ method: 'GET', url: '/api/projects/1' }).flush({ data: PROJECT });

    expect(result).toEqual(PROJECT);
  });

  it('creates a project with POST', () => {
    let result: Project | undefined;
    service.create(INPUT).subscribe((project) => (result = project));

    const request = http.expectOne({ method: 'POST', url: '/api/projects' });
    expect(request.request.body).toEqual(INPUT satisfies ProjectInput);
    request.flush({ data: PROJECT }, { status: 201, statusText: 'Created' });

    expect(result).toEqual(PROJECT);
  });

  it('replaces a project with PUT', () => {
    service.update(1, INPUT).subscribe();

    const request = http.expectOne({ method: 'PUT', url: '/api/projects/1' });
    expect(request.request.body).toEqual(INPUT);
    request.flush({ data: PROJECT });
  });

  it('deletes a project', () => {
    let completed = false;
    service.delete(1).subscribe({ complete: () => (completed = true) });

    http
      .expectOne({ method: 'DELETE', url: '/api/projects/1' })
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });
});
