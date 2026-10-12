import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="app-footer text-caption">
      &copy; {{ year }} OneHostel. All rights reserved.
    </footer>
  `,
  styles: [
    `
      .app-footer {
        height: var(--footer-height);
        display: flex;
        align-items: center;
        justify-content: center;
        border-top: 1px solid var(--color-border);
      }
    `,
  ],
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
