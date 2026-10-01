import { Project, ProjectStatus } from '../models/project';
import { fromApiDate, isBeforeDay } from './dates';

/** How close an open project is to its due date. */
export enum DueState {
  Overdue = 'overdue',
  DueSoon = 'due-soon',
}

export const DUE_SOON_DAYS = 7;
export const AVATAR_TONES = 6;

/**
 * Overdue when the due date is before today, "due soon" within the next
 * {@link DUE_SOON_DAYS} days. Completed projects and projects without a due
 * date are never flagged.
 */
export function dueState(project: Project, today: Date = new Date()): DueState | null {
  const due = fromApiDate(project.dueDate);

  if (!due || project.status === ProjectStatus.Completed) {
    return null;
  }

  if (isBeforeDay(due, today)) {
    return DueState.Overdue;
  }

  const soon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + DUE_SOON_DAYS);

  return isBeforeDay(soon, due) ? null : DueState.DueSoon;
}

/** Stable colour (0 … AVATAR_TONES-1) per client, so the same client always looks the same. */
export function avatarTone(name: string): number {
  let hash = 0;

  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }

  return Math.abs(hash) % AVATAR_TONES;
}

/** First letter of the first two words: "Acme Corporation" -> "AC". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}
