import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  readonly sidebarOpen = signal(true);

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  setSidebar(open: boolean): void {
    this.sidebarOpen.set(open);
  }
}
