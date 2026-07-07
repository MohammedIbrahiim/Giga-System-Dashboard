import { Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SliderItem } from '../../models/slider-item.model';

type CardState = 'active' | 'prev' | 'next' | 'hidden';

@Component({
  selector: 'app-product-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-slider.component.html',
  styleUrls: ['./product-slider.component.scss'],
})
export class ProductSliderComponent {
  @Input() items: SliderItem[] = [];

  activeIndex = 0;

  get total(): number { return this.items.length; }

  prev(): void {
    this.activeIndex = (this.activeIndex - 1 + this.total) % this.total;
  }

  next(): void {
    this.activeIndex = (this.activeIndex + 1) % this.total;
  }

  goTo(index: number): void {
    this.activeIndex = index;
  }

  getCardState(index: number): CardState {
    const total = this.total;
    if (index === this.activeIndex) return 'active';
    if (index === (this.activeIndex - 1 + total) % total) return 'prev';
    if (index === (this.activeIndex + 1) % total) return 'next';
    return 'hidden';
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft') this.prev();
    if (e.key === 'ArrowRight') this.next();
  }
}
