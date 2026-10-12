import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ThemePalette } from '@angular/material/core';

export type AppButtonVariant = 'primary' | 'secondary' | 'stroked' | 'text' | 'icon';

/**
 * Single reusable button for the whole app, wrapping Material's button directives
 * so every feature gets consistent variants, loading state, and icon placement
 * without repeating mat-raised-button / mat-stroked-button / mat-button everywhere.
 */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [NgTemplateOutlet, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './app-button.component.html',
  styleUrl: './app-button.component.scss',
})
export class AppButtonComponent {
  @Input() variant: AppButtonVariant = 'primary';
  @Input() color: ThemePalette = 'primary';
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() ariaLabel?: string;

  @Output() clicked = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent): void {
    if (this.disabled || this.loading) {
      return;
    }
    this.clicked.emit(event);
  }
}
