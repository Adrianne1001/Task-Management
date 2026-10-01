import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
}

/** Generic yes/no dialog. Focus starts on Cancel so Enter never destroys data by accident. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="title">
      <span class="title__icon" aria-hidden="true"><mat-icon>warning_amber</mat-icon></span>
      {{ data.title }}
    </h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false" cdkFocusInitial>Cancel</button>
      <button mat-flat-button class="danger-button" [mat-dialog-close]="true">
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .title__icon {
      display: grid;
      flex: none;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }

    p {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

/** Opens the dialog and emits `true` only when the user confirms. */
export function confirmAction(dialog: MatDialog, data: ConfirmDialogData): Observable<boolean> {
  return dialog
    .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data, width: '420px' })
    .afterClosed()
    .pipe(map((confirmed) => confirmed === true));
}
