import { Injectable, computed, signal } from '@angular/core';
import { NewsArticle, Product, Project } from '../models/models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly _news = signal<NewsArticle[]>([
    { id: 1, title: 'Angular 16 Released', content: 'Angular 16 brings signals and performance improvements to the framework.', author: 'John Doe', date: '2024-01-15', category: 'Technology' },
    { id: 2, title: 'New Product Launch', content: 'We are excited to announce our new product line hitting the market.', author: 'Jane Smith', date: '2024-01-20', category: 'Business' },
    { id: 3, title: 'Q1 Financial Report', content: 'Q1 results show strong growth across all sectors with 20% increase.', author: 'Bob Johnson', date: '2024-01-25', category: 'Finance' },
    { id: 4, title: 'Health & Wellness Guide', content: 'Our new wellness initiative aims to improve team productivity and morale.', author: 'Alice Brown', date: '2024-02-01', category: 'Health' },
  ]);

  private readonly _products = signal<Product[]>([
    { id: 1, name: 'Laptop Pro X1', description: 'High-performance laptop for professionals', price: 1299.99, category: 'Electronics', stock: 45 },
    { id: 2, name: 'Wireless Mouse M200', description: 'Ergonomic wireless mouse with silent clicks', price: 49.99, category: 'Accessories', stock: 120 },
    { id: 3, name: 'Standing Desk Pro', description: 'Motorized adjustable standing desk', price: 599.99, category: 'Furniture', stock: 15 },
    { id: 4, name: '4K Monitor 27"', description: 'Ultra HD IPS display with HDR support', price: 449.99, category: 'Electronics', stock: 30 },
  ]);

  private readonly _projects = signal<Project[]>([
    { id: 1, name: 'Website Redesign', description: 'Complete overhaul of company website with new brand identity', status: 'In Progress', deadline: '2024-03-01', team: 'Frontend', progress: 65 },
    { id: 2, name: 'Mobile App v2', description: 'iOS and Android app with offline support', status: 'Planning', deadline: '2024-06-01', team: 'Mobile', progress: 20 },
    { id: 3, name: 'API Integration', description: 'Third-party payment and analytics API integration', status: 'Completed', deadline: '2024-01-15', team: 'Backend', progress: 100 },
    { id: 4, name: 'Database Migration', description: 'Migrate legacy PostgreSQL to distributed cloud DB', status: 'In Progress', deadline: '2024-04-01', team: 'DevOps', progress: 40 },
  ]);

  readonly news = this._news.asReadonly();
  readonly products = this._products.asReadonly();
  readonly projects = this._projects.asReadonly();

  readonly stats = computed(() => ({
    totalNews: this._news().length,
    totalProducts: this._products().length,
    totalProjects: this._projects().length,
    activeProjects: this._projects().filter(p => p.status === 'In Progress').length,
  }));

  addNews(item: Omit<NewsArticle, 'id'>): void {
    this._news.update(list => [...list, { ...item, id: list.length + 1 }]);
  }

  updateNews(item: NewsArticle): void {
    this._news.update(list => list.map(n => n.id === item.id ? { ...item } : n));
  }

  deleteNews(id: number): void {
    this._news.update(list => list.filter(n => n.id !== id));
  }

  addProduct(item: Omit<Product, 'id'>): void {
    this._products.update(list => [
      ...list,
      { ...item, id: list.length + 1, price: Number(item.price), stock: Number(item.stock) },
    ]);
  }

  updateProduct(item: Product): void {
    this._products.update(list => list.map(p =>
      p.id === item.id ? { ...item, price: Number(item.price), stock: Number(item.stock) } : p
    ));
  }

  deleteProduct(id: number): void {
    this._products.update(list => list.filter(p => p.id !== id));
  }

  addProject(item: Omit<Project, 'id'>): void {
    this._projects.update(list => [
      ...list,
      { ...item, id: list.length + 1, progress: Number(item.progress) },
    ]);
  }

  updateProject(item: Project): void {
    this._projects.update(list => list.map(p =>
      p.id === item.id ? { ...item, progress: Number(item.progress) } : p
    ));
  }

  deleteProject(id: number): void {
    this._projects.update(list => list.filter(p => p.id !== id));
  }
}
