export interface DashboardSummary {
  totalNews: number;
  totalProducts: number;
  totalProjects: number;
  activeProjects: number;
}

export interface RecentNewsItem {
  id: number;
  title: string;
  author: string;
  publishDate: string;
  category: string;
}

export interface ProjectStatusChartItem {
  status: string;
  count: number;
}

export interface WeeklySalesItem {
  day: string;
  units: number;
}
