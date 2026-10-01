/**
 * Mirrors the backend enums in `backend/app/Enums`. Values must stay identical
 * to the API (and `test_data.json`); they are the strings sent over the wire.
 */
export enum ProjectStatus {
  Planning = 'Planning',
  InProgress = 'In Progress',
  OnHold = 'On Hold',
  Completed = 'Completed',
}

export enum ProjectPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum ProjectSortField {
  ClientName = 'clientName',
  ProjectName = 'projectName',
  Status = 'status',
  Priority = 'priority',
  StartDate = 'startDate',
  DueDate = 'dueDate',
}

export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

/** Declared order of each enum, used for dropdowns. */
export const PROJECT_STATUSES: readonly ProjectStatus[] = Object.values(ProjectStatus);
export const PROJECT_PRIORITIES: readonly ProjectPriority[] = Object.values(ProjectPriority);

/** Field limits shared with the backend (`Project::*_MAX_LENGTH`, `ProjectRequest`). */
export const PROJECT_LIMITS = {
  clientName: 150,
  projectName: 150,
  description: 2000,
  search: 100,
} as const;

/** A project as returned by the API. Dates are `YYYY-MM-DD` strings. */
export interface Project {
  id: number;
  clientName: string;
  projectName: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string | null;
  dueDate: string | null;
}

/** Body for POST /projects and PUT /projects/:id (PUT is a full replacement). */
export type ProjectInput = Omit<Project, 'id'>;

/** Whitelisted query parameters for GET /projects. */
export interface ProjectQuery {
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  sort?: ProjectSortField;
  direction?: SortDirection;
}

/** Narrows an untrusted string (e.g. a URL query param) to an enum member. */
export function toEnumValue<T extends string>(
  values: readonly T[],
  value: string | null | undefined,
): T | undefined {
  return values.find((candidate) => candidate === value);
}
