import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ProjectPriority, ProjectStatus } from '../../models/project';

const STATUS_TONES: Record<ProjectStatus, string> = {
  [ProjectStatus.Planning]: 'neutral',
  [ProjectStatus.InProgress]: 'info',
  [ProjectStatus.OnHold]: 'warning',
  [ProjectStatus.Completed]: 'success',
};

const PRIORITY_TONES: Record<ProjectPriority, string> = {
  [ProjectPriority.Low]: 'neutral',
  [ProjectPriority.Medium]: 'warning',
  [ProjectPriority.High]: 'danger',
};

/** The label is always shown as text, so colour is never the only signal. */
@Component({
  selector: 'app-status-badge',
  template: `<span [class]="'badge badge--' + tone()">{{ status() }}</span>`,
  styleUrl: './badges.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly status = input.required<ProjectStatus>();
  protected readonly tone = computed(() => STATUS_TONES[this.status()]);
}

@Component({
  selector: 'app-priority-badge',
  template: `<span [class]="'badge badge--' + tone()">{{ priority() }}</span>`,
  styleUrl: './badges.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityBadge {
  readonly priority = input.required<ProjectPriority>();
  protected readonly tone = computed(() => PRIORITY_TONES[this.priority()]);
}
