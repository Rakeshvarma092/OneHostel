import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStatus, HostelAdmin, adminFullName } from '../admin-management/admin.models';
import { AdminService } from '../admin-management/admin.service';
import { AdminDetailPanelComponent, AdminPanelTab } from '../admin-management/admin-detail-panel.component';
import { Resident, residentFullName } from './resident.models';
import { ResidentService } from './resident.service';
import { isOnboardedHostel } from '../hostel-onboarding/onboarded-hostels';
import { RESIDENT_STATUS_TONE, ResidentDetailPanelComponent } from './resident-detail-panel.component';
import { AppEmptyStateComponent } from '../../shared/components/empty-state/app-empty-state.component';
import { AppPaginationComponent } from '../../shared/components/pagination/app-pagination.component';

const ALL = 'All';
const PAGE_SIZE = 10;

export type UserRole = 'Admin' | 'Resident';

/** One row in a hostel card: either a hostel Admin or an Resident (resident). */
interface UserRow {
  id: string;
  name: string;
  role: UserRole;
  hostelName: string;
  /** End users only: "101 / A". */
  roomBed: string | null;
  lastLogin?: string;
  status: string;
  tone: string;
  /** Extra text the search box matches (username, room). */
  searchText: string;
}

interface HostelGroup {
  hostel: string;
  rows: UserRow[];
  total: number;
  admins: number;
  residents: number;
}

const ADMIN_STATUS_TONE: Record<AdminStatus, 'success' | 'neutral' | 'danger'> = {
  Active: 'success',
  Inactive: 'neutral',
  Locked: 'danger',
};

/**
 * Every user of each onboarded hostel — its Admins and Residents (residents) —
 * listed together under one card per hostel. Admins share data (and the view
 * panel) with the admin-management feature folder.
 */
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    AdminDetailPanelComponent,
    ResidentDetailPanelComponent,
    AppEmptyStateComponent,
    AppPaginationComponent,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent {
  search = '';
  hostelFilter = ALL;
  roleFilter: UserRole | 'All' = ALL;
  statusFilter = ALL;
  currentPage = 0;

  readonly roles: UserRole[] = ['Admin', 'Resident'];
  readonly statusOptions = ['Active', 'Inactive', 'Locked', 'Blocked'];

  /** Shown above the empty state, in the same order as the table. */
  readonly headers = ['ID', 'Name', 'Role', 'Room / Bed', 'Last Login', 'Status', 'Actions'];

  /** Hostel cards the user has opened. Cards start closed. */
  private expanded = new Set<string>();

  adminPanelOpen = false;
  selectedAdminId?: string;
  adminPanelTab: AdminPanelTab = 'details';
  residentPanelOpen = false;
  selectedResidentId?: string;

  constructor(
    private adminService: AdminService,
    private residentService: ResidentService,
  ) {}

  // ---- Rows (onboarded hostels only) ------------------------------------------

  private get allRows(): UserRow[] {
    const admins: UserRow[] = this.adminService.admins
      .filter((a) => isOnboardedHostel(a.hostelId))
      .map((a: HostelAdmin) => ({
        id: a.adminId,
        name: adminFullName(a),
        role: 'Admin',
        hostelName: a.hostelName,
        roomBed: null,
        lastLogin: a.lastLogin,
        status: a.status,
        tone: ADMIN_STATUS_TONE[a.status],
        searchText: a.username,
      }));

    const residents: UserRow[] = this.residentService.residents
      .filter((r) => isOnboardedHostel(r.hostelId))
      .map((r: Resident) => ({
        id: r.residentId,
        name: residentFullName(r),
        role: 'Resident',
        hostelName: r.hostelName,
        roomBed: `${r.roomNo} / ${r.bedNo}`,
        lastLogin: r.lastLogin,
        status: r.status,
        tone: RESIDENT_STATUS_TONE[r.status],
        searchText: `${r.roomNo} ${r.email}`,
      }));

    return [...admins, ...residents];
  }

  get hostelOptions(): string[] {
    return [...new Set(this.allRows.map((r) => r.hostelName))].sort();
  }

  // ---- Filters ---------------------------------------------------------------

  get hasFilters(): boolean {
    return !!this.search || this.hostelFilter !== ALL || this.roleFilter !== ALL || this.statusFilter !== ALL;
  }

  resetFilters(): void {
    this.search = '';
    this.hostelFilter = ALL;
    this.roleFilter = ALL;
    this.statusFilter = ALL;
    this.currentPage = 0;
  }

  private get filteredRows(): UserRow[] {
    const term = this.search.trim().toLowerCase();
    return this.allRows.filter((r) => {
      if (this.hostelFilter !== ALL && r.hostelName !== this.hostelFilter) return false;
      if (this.roleFilter !== ALL && r.role !== this.roleFilter) return false;
      if (this.statusFilter !== ALL && r.status !== this.statusFilter) return false;
      return !term || [r.id, r.name, r.searchText].some((v) => v.toLowerCase().includes(term));
    });
  }

  // ---- Grouping (one card per hostel) ---------------------------------------

  /** All matching users in display order: hostels A–Z; inside each, Admins first, then Residents, each by ID. */
  private get sortedRows(): UserRow[] {
    return [...this.filteredRows].sort(
      (a, b) =>
        a.hostelName.localeCompare(b.hostelName) ||
        (a.role === b.role ? a.id.localeCompare(b.id) : a.role === 'Admin' ? -1 : 1),
    );
  }

  /** Every matching hostel as a card (all its users), hostels A–Z. */
  private get allGroups(): HostelGroup[] {
    const map = new Map<string, UserRow[]>();
    this.sortedRows.forEach((r) => map.set(r.hostelName, [...(map.get(r.hostelName) ?? []), r]));
    return [...map.entries()].map(([hostel, rows]) => ({
      hostel,
      rows,
      total: rows.length,
      admins: rows.filter((r) => r.role === 'Admin').length,
      residents: rows.filter((r) => r.role === 'Resident').length,
    }));
  }

  /** Paging counts hostel cards, not users. */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.allGroups.length / PAGE_SIZE));
  }

  /** Clamps the page so it stays valid after a filter change shrinks the result set. */
  get safePage(): number {
    return Math.min(this.currentPage, this.totalPages - 1);
  }

  setPage(page: number): void {
    this.currentPage = Math.min(Math.max(0, page), this.totalPages - 1);
  }

  /** The current page of hostel cards (10 per page); each card holds all of its hostel's users. */
  get groups(): HostelGroup[] {
    const start = this.safePage * PAGE_SIZE;
    return this.allGroups.slice(start, start + PAGE_SIZE);
  }

  isCollapsed(hostel: string): boolean {
    return !this.expanded.has(hostel);
  }

  toggleGroup(hostel: string): void {
    this.expanded.has(hostel) ? this.expanded.delete(hostel) : this.expanded.add(hostel);
  }

  // ---- Panels ----------------------------------------------------------------


  view(row: UserRow): void {
    if (row.role === 'Admin') {
      this.selectedAdminId = row.id;
      this.adminPanelTab = 'details';
      this.adminPanelOpen = true;
    } else {
      this.selectedResidentId = row.id;
      this.residentPanelOpen = true;
    }
  }
}
