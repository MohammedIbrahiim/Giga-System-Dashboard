import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TableColumn } from '../../models/models';
import { formatBase64Image } from '../../shared/utils/file-base64.util';

@Component({
  selector: 'app-shared-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCardModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './shared-table.component.html',
  styleUrls: ['./shared-table.component.scss'],
})
export class SharedTableComponent implements AfterViewInit, OnChanges {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() title?: string;
  @Input() pageSize = 10;
  @Input() pageSizeOptions = [5, 10, 25];
  @Input() showActions = false;
  @Input() serverSide = false;
  @Input() totalElements = 0;
  @Input() loading = false;

  @Output() editItem = new EventEmitter<any>();
  @Output() deleteItem = new EventEmitter<any>();
  @Output() pageChange = new EventEmitter<{ pageIndex: number; pageSize: number }>();
  @Output() sortChange = new EventEmitter<{ active: string; direction: string }>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<any>([]);

  ngAfterViewInit(): void {
    if (!this.serverSide) {
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    } else {
      this.paginator.length = this.totalElements;
      this.paginator.page.subscribe((event: PageEvent) => {
        this.pageChange.emit({ pageIndex: event.pageIndex, pageSize: event.pageSize });
      });
      this.sort.sortChange.subscribe((sort: Sort) => {
        this.paginator.pageIndex = 0;
        this.sortChange.emit({ active: sort.active, direction: sort.direction });
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.displayedColumns = this.columns.map(c => c.key);
    if (this.showActions) this.displayedColumns.push('actions');
    this.dataSource.data = this.data;

    if (this.serverSide && this.paginator && 'totalElements' in changes) {
      this.paginator.length = this.totalElements;
    }
  }

  getBadgeClass(value: string): string {
    return value?.toLowerCase().replace(/\s+/g, '-') ?? '';
  }

  readonly formatBase64Image = formatBase64Image;
}
