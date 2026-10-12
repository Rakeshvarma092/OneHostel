import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="secondary-header" [class.secondary-header--with-subtitle]="subtitle">
      <div class="secondary-header__titles">
        <h1 class="secondary-header__title">{{ pageTitle }}</h1>
        @if (subtitle) {
          <p class="secondary-header__subtitle">{{ subtitle }}</p>
        }
      </div>
      <div class="secondary-header__breadcrumb">
        <span class="breadcrumb-item breadcrumb-item--link">Home</span>
        <span class="breadcrumb-separator">></span>
        <span class="breadcrumb-item breadcrumb-item--active">{{ pageTitle }}</span>
      </div>
    </div>
  `,
  styles: [`
    .secondary-header {
      height: 48px;
      background: #f8fafc;
      border-bottom: 1px solid #eef2f6;
      display: flex;
      align-items: center;
      padding: 0 28px;
      gap: 16px;
      box-sizing: border-box;
    }

    .secondary-header--with-subtitle {
      height: auto;
      min-height: 48px;
      padding: 10px 28px;
    }

    .secondary-header__titles {
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      padding-right: 16px;

      &::after {
        content: '';
        position: absolute;
        right: 0;
        top: 3px;
        bottom: 3px;
        width: 1px;
        background: #cbd5e1;
      }
    }

    .secondary-header__title {
      margin: 0;
      font-size: 14.5px;
      font-weight: 700;
      color: #0b1e48;
    }

    .secondary-header__subtitle {
      margin: 2px 0 0;
      font-size: 12px;
      color: #64748b;
    }

    .secondary-header__breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
    }

    .breadcrumb-item {
      color: #64748b;
    }

    .breadcrumb-separator {
      color: #94a3b8;
      font-size: 11px;
    }

    .breadcrumb-item--active {
      color: #94a3b8;
    }
  `],
})
export class BreadcrumbComponent {
  @Input() pageTitle = 'Institution';
  @Input() subtitle?: string;
}
