import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  ProjectSortField,
  SortDirection,
  toEnumValue,
} from './project';

// Values are copied from the backend enums / test_data.json on purpose: if
// either side changes, this test fails instead of the API rejecting requests.
describe('project enums', () => {
  it('match the backend status values in declared order', () => {
    expect(PROJECT_STATUSES).toEqual(['Planning', 'In Progress', 'On Hold', 'Completed']);
  });

  it('match the backend priority values in declared order', () => {
    expect(PROJECT_PRIORITIES).toEqual(['Low', 'Medium', 'High']);
  });

  it('match the backend sort fields and directions', () => {
    expect(Object.values(ProjectSortField)).toEqual([
      'clientName',
      'projectName',
      'status',
      'priority',
      'startDate',
      'dueDate',
    ]);
    expect(Object.values(SortDirection)).toEqual(['asc', 'desc']);
  });
});

describe('toEnumValue', () => {
  it('returns the matching member', () => {
    expect(toEnumValue(PROJECT_STATUSES, 'On Hold')).toBe('On Hold');
  });

  it('rejects unknown, differently cased and missing values', () => {
    expect(toEnumValue(PROJECT_STATUSES, 'Archived')).toBeUndefined();
    expect(toEnumValue(PROJECT_STATUSES, 'on hold')).toBeUndefined();
    expect(toEnumValue(PROJECT_STATUSES, null)).toBeUndefined();
  });
});
