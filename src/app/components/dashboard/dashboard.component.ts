import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartData } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { NewsService } from '../../core/services/news.service';
import { QuoteRequestService } from '../../core/services/quote-request.service';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { TableColumn } from '../../models/models';
import { SharedTableComponent } from '../shared-table/shared-table.component';
import { ProductSliderComponent } from '../../shared/components/product-slider/product-slider.component';
import { SliderItem } from '../../shared/models/slider-item.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgChartsModule, MatCardModule, MatIconModule, SharedTableComponent, ProductSliderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly svc = inject(DashboardService);
  private readonly newsService = inject(NewsService);
  private readonly quoteService = inject(QuoteRequestService);

  readonly sliderItems: SliderItem[] = [
    {
      id: 1,
      imageUrl: 'assets/images/slider/product-1.jpg',
      category: 'Electronics',
      groupName: 'Smart Devices',
      title: 'Wireless Noise-Cancelling Headphones',
      brandName: 'SoundCore',
      brandLogoUrl: 'assets/images/brands/soundcore.png',
    },
    {
      id: 2,
      imageUrl: 'assets/images/slider/product-2.jpg',
      category: 'Wearables',
      groupName: 'Fitness Tech',
      title: 'Pro Sport Smartwatch Series X',
      brandName: 'FitPulse',
      brandLogoUrl: 'assets/images/brands/fitpulse.png',
    },
    {
      id: 3,
      imageUrl: 'assets/images/slider/product-3.jpg',
      category: 'Audio',
      groupName: 'Home Audio',
      title: 'Portable Bluetooth Speaker 360°',
      brandName: 'BassWave',
      brandLogoUrl: 'assets/images/brands/basswave.png',
    },
    {
      id: 4,
      imageUrl: 'assets/images/slider/product-4.jpg',
      category: 'Accessories',
      groupName: 'Mobile Gear',
      title: 'MagSafe Fast Charging Stand',
      brandName: 'ChargeMate',
      brandLogoUrl: 'assets/images/brands/chargemate.png',
    },
    {
      id: 5,
      imageUrl: 'assets/images/slider/product-5.jpg',
      category: 'Cameras',
      groupName: 'Action Cams',
      title: '4K Action Camera Ultra Wide',
      brandName: 'VisionX',
      brandLogoUrl: 'assets/images/brands/visionx.png',
    },
    {
      id: 6,
      imageUrl: 'assets/images/slider/product-6.jpg',
      category: 'Computing',
      groupName: 'Peripherals',
      title: 'Mechanical RGB Gaming Keyboard',
      brandName: 'KeyForge',
      brandLogoUrl: 'assets/images/brands/keyforge.png',
    },
  ];

  private readonly _summary = signal<DashboardSummary | null>(null);

  protected readonly stats = computed(() => ({
    totalNews: this._summary()?.totalNews ?? 0,
    totalProducts: this._summary()?.totalProducts ?? 0,
    totalProjects: this._summary()?.totalProjects ?? 0,
    activeProjects: this._summary()?.activeProjects ?? 0,
  }));

  // Same data source as the News page — most recent 5, sorted by date descending
  protected readonly recentNews = signal<any[]>([]);

  readonly recentNewsColumns: TableColumn[] = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'date', label: 'Date' },
    { key: 'category', label: 'Category', type: 'badge' },
  ];

  quoteRequestsChartData: ChartData<'bar'> = {
    labels: ['New', 'Reviewed', 'Contacted', 'Closed'],
    datasets: [{
      data: [0, 0, 0, 0],
      label: 'Quote Requests',
      backgroundColor: ['#1d4ed8', '#7c3aed', '#15803d', '#616161'],
      borderRadius: 4,
    }],
  };

  readonly quoteRequestsChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Sales Units',
      backgroundColor: [
        'rgba(99,102,241,0.8)', 'rgba(33,150,243,0.8)', 'rgba(0,188,212,0.8)',
        'rgba(76,175,80,0.8)', 'rgba(255,152,0,0.8)', 'rgba(156,39,176,0.8)', 'rgba(233,30,99,0.8)',
      ],
      borderRadius: 4,
    }],
  };

  readonly barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  readonly doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  readonly doughnutChartData = signal<ChartData<'doughnut'>>({
    labels: ['Completed', 'In Progress', 'Planning', 'On Hold'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#9e9e9e'],
      hoverOffset: 8,
    }],
  });

  ngOnInit(): void {
    forkJoin({
      summary: this.svc.getSummary(),
      // Same endpoint + sort as the News page — guarantees identical rows
      recentNews: this.newsService.getNews({ page: 0, size: 5, sortBy: 'publishDate', sortDir: 'desc' }),
      projectStatus: this.svc.getProjectStatus(),
      quoteStats: this.quoteService.getStats(),
      weeklySales: this.svc.getWeeklySales(),
    }).subscribe({
      next: ({ summary, recentNews, projectStatus, quoteStats, weeklySales }) => {

        this._summary.set(summary);

        // Map to the same display shape used in the News page
        this.recentNews.set(recentNews.content.map(n => ({
          title: n.title,
          author: n.author,
          date: n.publishDate,
          category: n.category,
        })));

        const sm: Record<string, number> = {};
        projectStatus.forEach(i => (sm[i.status] = i.count));
        this.doughnutChartData.set({
          labels: ['Completed', 'In Progress', 'Planning', 'On Hold'],
          datasets: [{
            data: [sm['COMPLETED'] ?? 0, sm['IN_PROGRESS'] ?? 0, sm['PLANNING'] ?? 0, sm['ON_HOLD'] ?? 0],
            backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#9e9e9e'],
            hoverOffset: 8,
          }],
        });

        this.quoteRequestsChartData = {
          labels: ['New', 'Reviewed', 'Contacted', 'Closed'],
          datasets: [{
            data: [quoteStats.newCount, quoteStats.reviewed, quoteStats.contacted, quoteStats.closed],
            label: 'Quote Requests',
            backgroundColor: ['#1d4ed8', '#7c3aed', '#15803d', '#616161'],
            borderRadius: 4,
          }],
        };

        this.barChartData = {
          labels: weeklySales.map(d => d.day),
          datasets: [{
            data: weeklySales.map(d => d.units),
            label: 'Sales Units',
            backgroundColor: [
              'rgba(99,102,241,0.8)', 'rgba(33,150,243,0.8)', 'rgba(0,188,212,0.8)',
              'rgba(76,175,80,0.8)', 'rgba(255,152,0,0.8)', 'rgba(156,39,176,0.8)', 'rgba(233,30,99,0.8)',
            ],
            borderRadius: 4,
          }],
        };
      },
      error: () => {},
    });
  }
}
