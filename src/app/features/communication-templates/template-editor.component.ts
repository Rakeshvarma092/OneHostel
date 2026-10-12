import { Component, DestroyRef, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  COMMUNICATION_CHANNELS,
  CommunicationChannel,
  CommunicationTemplateRow,
  TEMPLATE_TRIGGERS,
  TEMPLATE_VARIABLES,
} from './communication-template.models';
import { CommunicationTemplateService } from './communication-template.service';
import { UnsavedChangesAware } from '../../core/guards/unsaved-changes.guard';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';

const SMS_SEGMENT_LENGTH = 160;
const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const LIST_URL = '/communication-templates';

export type TemplateEditorMode = 'add' | 'edit' | 'view';

/**
 * Full-page screen for creating, editing and viewing a communication template.
 * The mode comes from the route's `data.mode`; edit/view read the template by `:id`.
 */
@Component({
  selector: 'app-template-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  template: `
    <div class="editor-page">
      <!-- Page title/subtitle are shown in the layout's secondary header -->
      <form [formGroup]="templateForm" (ngSubmit)="onSubmit()" id="templateEditorForm" class="editor-layout">
        <!-- Left Column: Form -->
        <div class="editor-main">
          <!-- Template Details -->
          <section class="editor-card">
            <div class="editor-toolbar">
              <button type="button" class="back-link" (click)="onCancel()">
                <mat-icon>arrow_back</mat-icon>
                Back to List
              </button>

              <div class="editor-toolbar__right">
                <div class="status-toggle-box">
                  <span class="status-toggle-label">Status</span>
                  <mat-slide-toggle formControlName="isActive" color="primary" aria-label="Template status"></mat-slide-toggle>
                  <span class="status-toggle-text" [class.status-toggle-text--on]="templateForm.get('isActive')?.value">
                    {{ templateForm.get('isActive')?.value ? 'Active' : 'Inactive' }}
                  </span>
                </div>

                @if (isView) {
                  <button type="button" class="btn-primary" (click)="onSwitchToEdit()">
                    <mat-icon>edit</mat-icon>
                    <span>Edit Template</span>
                  </button>
                }
              </div>
            </div>

            <div class="editor-card__header">
              <div class="editor-card__icon"><mat-icon>description</mat-icon></div>
              <div>
                <h2 class="section-title">Template Details</h2>
                <p class="section-subtitle">Basic information that identifies this template</p>
              </div>
            </div>

            <div class="fields-grid">
              <!-- Template ID -->
              <div class="field-group">
                <label class="field-label">
                  <span class="label-text">Template ID</span>
                  <span class="auto-badge"><mat-icon class="badge-icon">auto_awesome</mat-icon> Auto-generated</span>
                </label>
                <mat-form-field appearance="outline" class="full-width readonly-field">
                  <input matInput formControlName="templateId" readonly />
                  <mat-icon matSuffix class="suffix-lock">lock</mat-icon>
                </mat-form-field>
              </div>

              <!-- Template Name -->
              <div class="field-group">
                <label class="field-label">
                  <span class="label-text">Template Name <span class="required-star">*</span></span>
                </label>
                <mat-form-field appearance="outline" class="full-width">
                  <input matInput formControlName="templateName" placeholder="Enter Template Name" />
                  <mat-error *ngIf="templateForm.get('templateName')?.hasError('required')">
                    Template Name is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Communication Channel -->
              <div class="field-group">
                <label class="field-label">
                  <span class="label-text">Communication Channel <span class="required-star">*</span></span>
                </label>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-select formControlName="channel" placeholder="-Select-">
                    <mat-option *ngFor="let ch of channels" [value]="ch.value">{{ ch.value }}</mat-option>
                  </mat-select>
                  <mat-error *ngIf="templateForm.get('channel')?.hasError('required')">
                    Channel is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Event / Trigger -->
              <div class="field-group">
                <label class="field-label">
                  <span class="label-text">Event / Trigger <span class="required-star">*</span></span>
                </label>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-select formControlName="trigger" placeholder="-Select-">
                    <mat-option *ngFor="let t of triggers" [value]="t">{{ t }}</mat-option>
                  </mat-select>
                  <mat-error *ngIf="templateForm.get('trigger')?.hasError('required')">
                    Event / Trigger is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Subject (Email) / Title (Push); hidden for SMS -->
              <div class="field-group" *ngIf="hasSubject">
                <label class="field-label">
                  <span class="label-text">
                    {{ channel === 'Push Notification' ? 'Title' : 'Subject' }} <span class="required-star">*</span>
                  </span>
                </label>
                <mat-form-field appearance="outline" class="full-width">
                  <input
                    #subjectInput
                    matInput
                    formControlName="subject"
                    [placeholder]="channel === 'Push Notification' ? 'Enter Notification Title' : 'Enter Email Subject'"
                    (focus)="activeField = 'subject'"
                  />
                  <mat-error *ngIf="templateForm.get('subject')?.hasError('required')">
                    {{ channel === 'Push Notification' ? 'Title' : 'Subject' }} is required
                  </mat-error>
                </mat-form-field>
              </div>
            </div>
          </section>

          <!-- Message Content -->
          <section class="editor-card">
            <div class="editor-card__header">
              <div class="editor-card__icon"><mat-icon>edit_note</mat-icon></div>
              <div>
                <h2 class="section-title">Message Content</h2>
                <p class="section-subtitle">
                  {{ isView ? 'The message sent for this event' : 'Click a variable to insert it at the cursor' }}
                </p>
              </div>
            </div>

            <div class="variable-chips" *ngIf="!isView">
              <button
                *ngFor="let v of variables"
                type="button"
                class="variable-chip"
                [matTooltip]="v.label"
                (mousedown)="$event.preventDefault()"
                (click)="insertVariable(v.key)"
              >
                {{ '{{' + v.key + '}}' }}
              </button>
            </div>

            <!-- Message Body -->
            <div class="field-group">
              <label class="field-label">
                <span class="label-text">Message Body <span class="required-star">*</span></span>
                <span class="char-count" *ngIf="channel === 'SMS'" [class.char-count--over]="bodyLength > smsSegmentLength">
                  {{ bodyLength }} / {{ smsSegmentLength }}
                  <ng-container *ngIf="smsSegments > 1">({{ smsSegments }} SMS)</ng-container>
                </span>
              </label>
              <mat-form-field appearance="outline" class="full-width textarea-field">
                <textarea
                  #bodyInput
                  matInput
                  formControlName="body"
                  [rows]="channel === 'Email' ? 12 : 6"
                  placeholder="Enter Message Body"
                  (focus)="activeField = 'body'"
                ></textarea>
                <mat-error *ngIf="templateForm.get('body')?.hasError('required')">
                  Message Body is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="unknown-vars" *ngIf="unknownVariables.length > 0">
              <mat-icon>warning_amber</mat-icon>
              <span>Unknown variable{{ unknownVariables.length > 1 ? 's' : '' }}: {{ unknownVariables.join(', ') }}</span>
            </div>
          </section>
        </div>

        <!-- Right Column: Live Preview -->
        <aside class="editor-side">
          <section class="editor-card editor-card--sticky">
            <div class="editor-card__header">
              <div class="editor-card__icon editor-card__icon--teal"><mat-icon>preview</mat-icon></div>
              <div>
                <h2 class="section-title">Live Preview</h2>
                <p class="section-subtitle">Rendered with sample values</p>
              </div>
            </div>

            <div class="preview-card" [ngClass]="'preview-card--' + channelClass">
              <div class="preview-card__meta">
                <mat-icon>{{ channelIcon }}</mat-icon>
                <span>{{ channel || 'Channel' }}</span>
              </div>
              <div class="preview-card__subject" *ngIf="hasSubject">
                {{ renderPreview(templateForm.get('subject')?.value) || (channel === 'Push Notification' ? 'Title' : 'Subject') }}
              </div>
              <div class="preview-card__body">{{ renderPreview(templateForm.get('body')?.value) || 'Message body will appear here.' }}</div>
            </div>

            <div class="sample-values">
              <h3 class="sample-values__title">Sample values</h3>
              <dl>
                @for (v of variables; track v.key) {
                  <div class="sample-values__row">
                    <dt>{{ '{{' + v.key + '}}' }}</dt>
                    <dd>{{ v.sample }}</dd>
                  </div>
                }
              </dl>
            </div>
          </section>
        </aside>
      </form>

      <!-- Sticky Action Bar -->
      <div class="editor-actions">
        <button type="button" class="btn-secondary" (click)="onCancel()">
          {{ isView ? 'Close' : 'Cancel' }}
        </button>
        @if (!isView) {
          <button type="submit" form="templateEditorForm" class="btn-primary" [disabled]="templateForm.invalid">
            <span>{{ mode === 'edit' ? 'Update' : 'Submit' }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .editor-page {
      padding: 10px 0 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Toolbar */
    .editor-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      min-height: 36px;
      margin: -4px 0 -2px;
    }

    .editor-toolbar__right {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-left: auto;
    }

    .status-toggle-label {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      align-self: flex-start;
      padding: 4px 0;
      background: none;
      border: none;
      color: #334155;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        transition: transform 0.15s ease;
      }

      &:hover {
        color: #0f172a;
      }

      &:hover mat-icon {
        transform: translateX(-3px);
      }
    }

    /* Two-column layout */
    .editor-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 380px;
      gap: 20px;
      align-items: start;
    }

    .editor-main {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    @media (max-width: 1100px) {
      .editor-layout {
        grid-template-columns: 1fr;
      }

      .editor-card--sticky {
        position: static !important;
      }
    }

    .editor-card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(15, 34, 74, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.03);
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .editor-card--sticky {
      position: sticky;
      top: 16px;
    }

    .editor-card__header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f1f5f9;
    }

    .editor-card__icon {
      width: 38px;
      height: 38px;
      flex-shrink: 0;
      border-radius: 10px;
      background: #eff6ff;
      color: #0057e7;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .editor-card__icon--teal {
      background: #e6f7f5;
      color: #0d9488;
    }

    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .section-subtitle {
      font-size: 12.5px;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    .fields-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px 16px;
    }

    /* Compact fields for the Template Details card only */
    .fields-grid {
      .field-label {
        font-size: 12.5px;
        margin-bottom: 4px;
      }

      .full-width ::ng-deep {
        .mat-mdc-text-field-wrapper {
          height: 36px !important;
          padding: 0 12px !important;
        }

        .mat-mdc-form-field-flex {
          height: 36px !important;
        }

        .mat-mdc-form-field-infix {
          padding: 4px 0 !important;
          font-size: 13px;
        }

        input.mat-mdc-input-element,
        .mat-mdc-select-value {
          font-size: 13px;
        }
      }

      .readonly-field .suffix-lock {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    @media (max-width: 900px) {
      .fields-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .fields-grid {
        grid-template-columns: 1fr;
      }

      .editor-card {
        padding: 18px 16px;
      }
    }

    .field-group {
      display: flex;
      flex-direction: column;
    }

    .field-label {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .label-text {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .required-star {
      color: #ef4444;
      font-weight: 700;
      margin-left: 2px;
    }

    .auto-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      font-weight: 600;
      color: #0284c7;
      background: #e0f2fe;
      padding: 2px 8px;
      border-radius: 12px;

      .badge-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }
    }

    .full-width {
      width: 100%;

      ::ng-deep {
        .mat-mdc-text-field-wrapper {
          background-color: #ffffff !important;
          border-radius: 8px !important;
          padding: 0 14px !important;
          height: 44px !important;
        }

        .mat-mdc-form-field-flex {
          height: 44px !important;
          align-items: center !important;
        }

        .mat-mdc-form-field-infix {
          padding: 6px 0 !important;
          min-height: 0 !important;
          border-top: none !important;
          display: flex;
          align-items: center;
          font-size: 14px;
        }

        .mat-mdc-form-field-subscript-wrapper {
          margin-top: 2px;
        }

        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: #cbd5e1 !important;
          border-width: 1px !important;
        }

        .mat-mdc-select-trigger {
          display: flex;
          align-items: center;
          height: 100%;
        }

        .mat-mdc-select-value {
          font-size: 14px;
          color: #0f172a;
        }

        input.mat-mdc-input-element,
        textarea.mat-mdc-input-element {
          font-size: 14px;
          color: #0f172a;
        }
      }
    }

    .textarea-field {
      ::ng-deep {
        .mat-mdc-text-field-wrapper,
        .mat-mdc-form-field-flex {
          height: auto !important;
        }

        .mat-mdc-form-field-infix {
          padding: 10px 0 !important;
        }

        textarea.mat-mdc-input-element {
          resize: vertical;
          line-height: 1.5;
          font-family: inherit;
        }
      }
    }

    .readonly-field {
      ::ng-deep .mat-mdc-text-field-wrapper {
        background-color: #f8fafc !important;
        cursor: not-allowed;
      }
      input {
        color: #475569 !important;
        font-weight: 600;
      }
      .suffix-lock {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #94a3b8;
      }
    }

    /* Disabled (view mode) fields read as plain values, not greyed-out inputs */
    :host ::ng-deep .mat-mdc-form-field.mat-form-field-disabled {
      .mat-mdc-text-field-wrapper {
        background-color: #f8fafc !important;
      }
      input.mat-mdc-input-element,
      textarea.mat-mdc-input-element,
      .mat-mdc-select-value {
        color: #0f172a !important;
      }
    }

    .status-toggle-box {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-toggle-text {
      min-width: 52px;
      font-size: 13px;
      font-weight: 600;
      color: #e11d48;
    }

    .status-toggle-text--on {
      color: #0d9488;
    }

    .variable-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .variable-chip {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      font-weight: 600;
      color: #0057e7;
      background: #eff6ff;
      border: 1px dashed #93c5fd;
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #dbeafe;
        border-style: solid;
      }
    }

    .char-count {
      font-size: 11.5px;
      font-weight: 600;
      color: #64748b;
    }

    .char-count--over {
      color: #d97706;
    }

    .unknown-vars {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: #b45309;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 8px 12px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    /* Preview */
    .preview-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      padding: 14px 16px;
    }

    .preview-card--sms .preview-card__body {
      background: #e2e8f0;
      border-radius: 14px 14px 14px 4px;
      padding: 10px 12px;
    }

    .preview-card--push {
      background: #ffffff;
      box-shadow: 0 6px 18px rgba(15, 34, 74, 0.08);
    }

    .preview-card__meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 10px;

      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }
    }

    .preview-card__subject {
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }

    .preview-card__body {
      font-size: 13.5px;
      color: #334155;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .sample-values {
      border-top: 1px dashed #e2e8f0;
      padding-top: 12px;

      dl {
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
    }

    .sample-values__title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .sample-values__row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 12px;

      dt {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        color: #0057e7;
      }

      dd {
        margin: 0;
        color: #334155;
        text-align: right;
        word-break: break-all;
      }
    }

    ::ng-deep {
      .mat-mdc-slide-toggle {
        --mdc-switch-selected-track-color: #10b981 !important;
        --mdc-switch-selected-focus-track-color: #10b981 !important;
        --mdc-switch-selected-hover-track-color: #059669 !important;
        --mdc-switch-selected-pressed-track-color: #059669 !important;
        --mdc-switch-selected-handle-color: #ffffff !important;
        --mdc-switch-selected-focus-handle-color: #ffffff !important;
        --mdc-switch-selected-hover-handle-color: #ffffff !important;
        --mdc-switch-selected-pressed-handle-color: #ffffff !important;
        --mdc-switch-selected-icon-color: #10b981 !important;
      }
    }

    /* Sticky Action Bar */
    .editor-actions {
      position: sticky;
      bottom: 0;
      z-index: 5;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 14px 24px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(8px);
      border-radius: 14px 14px 0 0;
      box-shadow: 0 -6px 20px rgba(15, 34, 74, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.03);
    }

    .btn-secondary {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;

      &:hover {
        background: #f1f5f9;
        color: #0f172a;
      }
    }

    .btn-primary {
      background: #0057e7;
      color: #ffffff;
      border: none;
      padding: 9px 20px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0, 87, 231, 0.25);
      transition: all 0.15s;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover:not(:disabled) {
        background: #0045b5;
        box-shadow: 0 6px 16px rgba(0, 87, 231, 0.35);
      }

      &:disabled {
        background: #94a3b8;
        cursor: not-allowed;
        box-shadow: none;
      }
    }
  `],
})
export class TemplateEditorComponent implements UnsavedChangesAware {
  @ViewChild('subjectInput') subjectInput?: ElementRef<HTMLInputElement>;
  @ViewChild('bodyInput') bodyInput?: ElementRef<HTMLTextAreaElement>;

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly templateService = inject(CommunicationTemplateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly channels = COMMUNICATION_CHANNELS;
  readonly triggers = TEMPLATE_TRIGGERS;
  readonly variables = TEMPLATE_VARIABLES;
  readonly smsSegmentLength = SMS_SEGMENT_LENGTH;

  readonly mode: TemplateEditorMode = this.route.snapshot.data['mode'] ?? 'add';
  private readonly template?: CommunicationTemplateRow;

  templateForm!: FormGroup;
  /** Which content field receives a clicked variable chip. */
  activeField: 'subject' | 'body' = 'body';
  /** Set once saved so the leave-guard doesn't prompt on the redirect back to the list. */
  private saved = false;

  constructor() {
    if (this.mode !== 'add') {
      const id = this.route.snapshot.paramMap.get('id') ?? '';
      this.template = this.templateService.getById(id);
      if (!this.template) {
        this.saved = true;
        this.snackBar.open(`Template ${id} was not found`, 'x', { duration: 4000, panelClass: 'app-snackbar--error' });
        this.router.navigateByUrl(LIST_URL);
      }
    }
    this.initForm();
  }

  get isView(): boolean {
    return this.mode === 'view';
  }

  get channel(): CommunicationChannel | '' {
    return this.templateForm.get('channel')?.value ?? '';
  }

  /** SMS has no subject line; Push uses the same field as its title. */
  get hasSubject(): boolean {
    return this.channel === 'Email' || this.channel === 'Push Notification';
  }

  get channelIcon(): string {
    return COMMUNICATION_CHANNELS.find((c) => c.value === this.channel)?.icon ?? 'chat';
  }

  get channelClass(): string {
    if (this.channel === 'SMS') return 'sms';
    if (this.channel === 'Push Notification') return 'push';
    return 'email';
  }

  get bodyLength(): number {
    return (this.templateForm.get('body')?.value ?? '').length;
  }

  get smsSegments(): number {
    return Math.max(1, Math.ceil(this.bodyLength / SMS_SEGMENT_LENGTH));
  }

  get unknownVariables(): string[] {
    const known = new Set(TEMPLATE_VARIABLES.map((v) => v.key));
    const text = `${this.hasSubject ? this.templateForm.get('subject')?.value ?? '' : ''} ${
      this.templateForm.get('body')?.value ?? ''
    }`;
    const unknown = new Set<string>();
    for (const match of text.matchAll(VARIABLE_PATTERN)) {
      if (!known.has(match[1])) unknown.add(`{{${match[1]}}}`);
    }
    return [...unknown];
  }

  private get hasUnsavedChanges(): boolean {
    return !this.saved && !this.isView && this.templateForm.dirty;
  }

  private initForm(): void {
    const existing = this.template;

    this.templateForm = this.fb.group({
      templateId: [existing?.templateId ?? this.templateService.getNextTemplateId()],
      templateName: [existing?.templateName ?? '', [Validators.required]],
      channel: [existing?.channel ?? 'Email', [Validators.required]],
      trigger: [existing?.trigger ?? '', [Validators.required]],
      subject: [existing?.subject ?? ''],
      body: [existing?.body ?? '', [Validators.required]],
      isActive: [existing ? existing.status === 'Active' : true],
    });

    this.updateSubjectValidator();
    this.templateForm
      .get('channel')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateSubjectValidator());

    if (this.isView) this.templateForm.disable({ emitEvent: false });
  }

  private updateSubjectValidator(): void {
    const subject = this.templateForm.get('subject');
    subject?.setValidators(this.hasSubject ? [Validators.required] : []);
    subject?.updateValueAndValidity({ emitEvent: false });
    if (!this.hasSubject) this.activeField = 'body';
  }

  /** The code is no longer entered on screen: "Password Reset" → "PASSWORD_RESET". */
  private toTemplateCode(name: string): string {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  insertVariable(key: string): void {
    const target = this.activeField === 'subject' && this.hasSubject ? 'subject' : 'body';
    const el = target === 'subject' ? this.subjectInput?.nativeElement : this.bodyInput?.nativeElement;
    const control = this.templateForm.get(target);
    if (!control) return;

    const token = `{{${key}}}`;
    const value: string = control.value ?? '';
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    control.setValue(value.slice(0, start) + token + value.slice(end));
    control.markAsDirty();

    if (el) {
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    }
  }

  renderPreview(text: string | null | undefined): string {
    if (!text) return '';
    const samples = new Map(TEMPLATE_VARIABLES.map((v) => [v.key, v.sample]));
    return text.replace(VARIABLE_PATTERN, (whole, key: string) => samples.get(key) ?? whole);
  }

  /** Route guard hook: asks before discarding unsaved edits. */
  confirmLeave(): Observable<boolean> {
    if (!this.hasUnsavedChanges) return of(true);
    return this.confirm.confirm({
      title: 'Leave without saving?',
      message: 'You have unsaved changes to this template. They will be lost.',
      confirmLabel: 'Leave',
      cancelLabel: 'Stay',
      danger: true,
    });
  }

  /** Browser refresh / tab close. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) event.preventDefault();
  }

  onSwitchToEdit(): void {
    if (this.template) this.router.navigate([LIST_URL, this.template.templateId, 'edit']);
  }

  onCancel(): void {
    this.router.navigateByUrl(LIST_URL);
  }

  onSubmit(): void {
    if (this.isView) return;
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    const formVal = this.templateForm.getRawValue();
    const result: CommunicationTemplateRow = {
      templateId: formVal.templateId,
      templateName: formVal.templateName.trim(),
      // Existing templates keep their code so anything keyed on it stays stable.
      templateCode: this.template?.templateCode ?? this.toTemplateCode(formVal.templateName),
      channel: formVal.channel,
      trigger: formVal.trigger,
      subject: this.hasSubject ? formVal.subject.trim() : '',
      body: formVal.body,
      status: formVal.isActive ? 'Active' : 'Inactive',
      lastModified: new Date().toISOString().split('T')[0],
    };

    const isNew = this.templateService.save(result);
    this.saved = true;
    this.snackBar.open(`Template ${isNew ? 'created' : 'updated'} successfully`, 'x', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['app-snackbar--success', 'green-snackbar'],
    });
    this.router.navigateByUrl(LIST_URL);
  }
}
