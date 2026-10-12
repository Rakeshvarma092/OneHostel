import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  hasSubmenu?: boolean;
}

export interface NavSection {
  sectionTitle?: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  /** When true, shrinks to an icon-only rail (labels shown as tooltips instead). */
  @Input() collapsed = false;

  readonly navSections: NavSection[] = [
    {
      items: [
        { label: 'Dashboard', icon: 'home', route: '/dashboard' },
        { label: 'Onboard Hostel', icon: 'apartment', route: '/hostel-onboarding' },
        { label: 'Subscription Plans', icon: 'credit_card', route: '/subscription-plans' },
        { label: 'Communication Templates', icon: 'campaign', route: '/communication-templates' },
        { label: 'Admin Management', icon: 'manage_accounts', route: '/admins' },
        { label: 'Subscription & Payment', icon: 'payments', route: '/subscription-payments' },
        { label: 'Reports', icon: 'bar_chart', route: '/reports' },
        { label: 'Audit Logs', icon: 'assignment', route: '/audit-logs' },
        { label: 'Settings', icon: 'settings', route: '/settings' },
      ],
    },
  ];
}
