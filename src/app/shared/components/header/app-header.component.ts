import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';

export interface AppUser {
  name: string;
  email: string;
  avatarUrl?: string;
}

type SearchGroup = 'Recent' | 'Quick Actions' | 'Pages' | 'Account';

interface SearchableItem {
  label: string;
  route: string;
  icon: string;
  group: Exclude<SearchGroup, 'Recent'>;
  description: string;
  /** Extra words that should find this item (synonyms, related terms). */
  keywords?: string[];
}

interface SearchResultGroup {
  name: SearchGroup;
  items: SearchableItem[];
}

/** A label split into plain and matched runs, so matches can be bolded without innerHTML. */
interface LabelPart {
  text: string;
  match: boolean;
}

const RECENT_KEY = 'onehostel_recent_searches';
const MAX_RECENT = 4;
const GROUP_ORDER: SearchGroup[] = ['Recent', 'Quick Actions', 'Pages', 'Account'];

interface AppNotification {
  id: number;
  icon: string;
  title: string;
  time: string;
  unread: boolean;
}

/**
 * Presentational (dumb) component: no services, no routing decisions.
 * The smart container (MainLayoutComponent) owns state and reacts to its
 * outputs — including `navigateTo`, emitted when a global-search result is
 * picked, since actually navigating is the parent's job.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
  ],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent {
  @Input() title = 'OneHostel';
  @Input() user: AppUser | null = null;

  @Output() menuToggle = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() profile = new EventEmitter<void>();
  @Output() changePassword = new EventEmitter<void>();
  /** Emits the route to navigate to when a global-search result is selected. */
  @Output() navigateTo = new EventEmitter<string>();

  /** Up to two initials for the profile menu avatar, e.g. "Super Admin" → "SA". */
  get initials(): string {
    const parts = (this.user?.name || 'Super Admin').trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild(MatAutocompleteTrigger) private searchTrigger?: MatAutocompleteTrigger;

  readonly searchControl = new FormControl('', { nonNullable: true });
  searchFocused = false;

  private readonly searchItems: SearchableItem[] = [
    // Quick actions
    { label: 'Onboard New Hostel', route: '/hostel-onboarding/new', icon: 'domain_add', group: 'Quick Actions', description: 'Add a hostel and its admin', keywords: ['add', 'create', 'new hostel'] },
    { label: 'Create Template', route: '/communication-templates/new', icon: 'post_add', group: 'Quick Actions', description: 'New email, SMS or push template', keywords: ['add', 'new template', 'message'] },
    // Pages
    { label: 'Dashboard', route: '/dashboard', icon: 'home', group: 'Pages', description: 'Overview and key metrics', keywords: ['home', 'overview', 'stats'] },
    { label: 'Onboard Hostel', route: '/hostel-onboarding', icon: 'apartment', group: 'Pages', description: 'All onboarded hostels', keywords: ['hostels', 'institution', 'property'] },
    { label: 'Subscription Plans', route: '/subscription-plans', icon: 'credit_card', group: 'Pages', description: 'Pricing plans and features', keywords: ['pricing', 'plans', 'features'] },
    { label: 'Communication Templates', route: '/communication-templates', icon: 'campaign', group: 'Pages', description: 'Email, SMS and push messages', keywords: ['email', 'sms', 'push', 'notification', 'message'] },
    { label: 'Admin Management', route: '/admins', icon: 'manage_accounts', group: 'Pages', description: 'Hostel admins and residents', keywords: ['users', 'residents', 'students', 'admins', 'user management', 'block', 'lock', 'unlock', 'reset'] },
    { label: 'Subscription & Payment', route: '/subscription-payments', icon: 'payments', group: 'Pages', description: 'Billing, invoices and renewals', keywords: ['billing', 'invoice', 'renewal', 'payment'] },
    { label: 'Reports', route: '/reports', icon: 'bar_chart', group: 'Pages', description: 'Analytics and exports', keywords: ['analytics', 'export', 'charts'] },
    { label: 'Audit Logs', route: '/audit-logs', icon: 'assignment', group: 'Pages', description: 'Who changed what, and when', keywords: ['logs', 'history', 'activity', 'audit'] },
    { label: 'Settings', route: '/settings', icon: 'settings', group: 'Pages', description: 'Platform defaults and security', keywords: ['configuration', 'security', 'gateway', 'smtp', 'branding'] },
    // Account
    { label: 'My Profile', route: '/profile', icon: 'person_outline', group: 'Account', description: 'Your personal details', keywords: ['account', 'photo', 'me'] },
    { label: 'Change Password', route: '/change-password', icon: 'lock_reset', group: 'Account', description: 'Update your sign-in password', keywords: ['password', 'security', 'credentials'] },
  ];

  private recentRoutes: string[] = this.readRecent();

  notifications: AppNotification[] = [
    { id: 1, icon: 'domain_add', title: 'New hostel "Grand Stay Hostel" was onboarded', time: '5 min ago', unread: true },
    { id: 2, icon: 'person_add', title: 'A new admin account was created', time: '2 hours ago', unread: true },
    { id: 3, icon: 'info', title: 'Scheduled maintenance completed successfully', time: 'Yesterday', unread: true },
  ];

  get searchTerm(): string {
    return this.searchControl.value.trim().toLowerCase();
  }

  /**
   * Empty query: recent picks, then everything by group.
   * With a query: matches on label, description or keywords, best matches first.
   */
  get searchGroups(): SearchResultGroup[] {
    const term = this.searchTerm;
    const groups = new Map<SearchGroup, SearchableItem[]>();
    const add = (group: SearchGroup, item: SearchableItem) => groups.set(group, [...(groups.get(group) ?? []), item]);

    if (!term) {
      const recent = this.recentRoutes
        .map((route) => this.searchItems.find((i) => i.route === route))
        .filter((i): i is SearchableItem => !!i);
      recent.forEach((item) => add('Recent', item));
      this.searchItems.filter((i) => !recent.includes(i)).forEach((item) => add(item.group, item));
    } else {
      this.searchItems
        .map((item) => ({ item, score: this.score(item, term) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .forEach((r) => add(r.item.group, r.item));
    }

    return GROUP_ORDER.filter((g) => groups.has(g)).map((name) => ({ name, items: groups.get(name)! }));
  }

  get hasRecent(): boolean {
    return this.recentRoutes.length > 0;
  }

  get hasSearchResults(): boolean {
    return this.searchGroups.length > 0;
  }

  /** 0 = no match. Label start > word start in label > anywhere in label > description/keywords. */
  private score(item: SearchableItem, term: string): number {
    const label = item.label.toLowerCase();
    if (label.startsWith(term)) return 4;
    if (label.split(/[\s&]+/).some((w) => w.startsWith(term))) return 3;
    if (label.includes(term)) return 2;
    const extra = [item.description, ...(item.keywords ?? [])].join(' ').toLowerCase();
    return extra.includes(term) ? 1 : 0;
  }

  labelParts(label: string): LabelPart[] {
    const term = this.searchTerm;
    const at = term ? label.toLowerCase().indexOf(term) : -1;
    if (at < 0) return [{ text: label, match: false }];
    return [
      { text: label.slice(0, at), match: false },
      { text: label.slice(at, at + term.length), match: true },
      { text: label.slice(at + term.length), match: false },
    ].filter((p) => p.text);
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchInput?.nativeElement.focus();
  }

  clearRecent(event: MouseEvent): void {
    event.stopPropagation();
    this.recentRoutes = [];
    this.writeRecent();
  }

  /** Ctrl/⌘ + K or "/" focuses search from anywhere (except while typing in another field). */
  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    const isShortcut = (event.key === 'k' || event.key === 'K') && (event.ctrlKey || event.metaKey);

    if (isShortcut || (event.key === '/' && !typing)) {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
      this.searchInput?.nativeElement.select();
    }
  }

  /** Esc closes the results and leaves the field, so keyboard users can get back to the page. */
  onSearchEscape(): void {
    this.searchTrigger?.closePanel();
    this.searchInput?.nativeElement.blur();
  }

  private readRecent(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENT) : [];
    } catch {
      return [];
    }
  }

  private writeRecent(): void {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(this.recentRoutes));
    } catch {
      // Recent searches are a convenience only.
    }
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => n.unread).length;
  }

  onSearchSelect(event: MatAutocompleteSelectedEvent): void {
    const route = event.option.value as string;
    this.recentRoutes = [route, ...this.recentRoutes.filter((r) => r !== route)].slice(0, MAX_RECENT);
    this.writeRecent();
    this.navigateTo.emit(route);
    this.searchControl.setValue('');
    this.searchInput?.nativeElement.blur();
  }

  displaySearchLabel = (route: string): string => {
    return this.searchItems.find((item) => item.route === route)?.label ?? '';
  };

  markAllRead(): void {
    this.notifications = this.notifications.map((n) => ({ ...n, unread: false }));
  }

  isFullscreen = false;

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen can be denied (e.g. iframe without the `allowfullscreen` attribute) — fail silently.
      });
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
  }
}
