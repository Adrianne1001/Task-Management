import { Project, ProjectPriority, ProjectStatus } from '../models/project';
import { AVATAR_TONES, DueState, avatarTone, dueState, initials } from './project-display';

const TODAY = new Date(2026, 9, 2, 15, 30); // 2 Oct 2026, mid-afternoon

function project(dueDate: string | null, status = ProjectStatus.InProgress): Project {
  return {
    id: 1,
    clientName: 'Acme',
    projectName: 'Site',
    description: null,
    status,
    priority: ProjectPriority.Medium,
    startDate: null,
    dueDate,
  };
}

describe('dueState', () => {
  it('flags open projects whose due date has passed', () => {
    expect(dueState(project('2026-10-01'), TODAY)).toBe(DueState.Overdue);
  });

  it('treats today and the next seven days as due soon', () => {
    expect(dueState(project('2026-10-02'), TODAY)).toBe(DueState.DueSoon);
    expect(dueState(project('2026-10-09'), TODAY)).toBe(DueState.DueSoon);
  });

  it('does not flag projects due later', () => {
    expect(dueState(project('2026-10-10'), TODAY)).toBeNull();
  });

  it('never flags completed projects or projects without a due date', () => {
    expect(dueState(project('2026-01-01', ProjectStatus.Completed), TODAY)).toBeNull();
    expect(dueState(project(null), TODAY)).toBeNull();
  });
});

describe('avatarTone / initials', () => {
  it('gives each client a stable tone in range', () => {
    const tone = avatarTone('Acme Corporation');

    expect(avatarTone('Acme Corporation')).toBe(tone);
    expect(tone).toBeGreaterThanOrEqual(0);
    expect(tone).toBeLessThan(AVATAR_TONES);
  });

  it('builds up to two initials', () => {
    expect(initials('Acme Corporation')).toBe('AC');
    expect(initials('FreshFarm')).toBe('F');
    expect(initials('  Blue Ocean Travel ')).toBe('BO');
    expect(initials('')).toBe('');
  });
});
