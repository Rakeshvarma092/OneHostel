import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { AppConfirmDialogComponent, ConfirmDialogData } from '../components/confirm-dialog/app-confirm-dialog.component';

/**
 * Single entry point for confirmation dialogs on sensitive actions
 * (suspend, delete, cancel, deactivate, ...). Emits `true` only when the
 * user explicitly confirms; backdrop click / escape / Cancel all emit `false`.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  constructor(private dialog: MatDialog) {}

  confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open(AppConfirmDialogComponent, {
        width: '440px',
        maxWidth: '92vw',
        data,
        autoFocus: false,
        panelClass: 'app-confirm-dialog-panel',
      })
      .afterClosed()
      .pipe(map((result) => !!result));
  }
}
