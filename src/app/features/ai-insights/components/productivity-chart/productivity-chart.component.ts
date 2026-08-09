import {
  Component,
  ChangeDetectionStrategy,
  input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  effect,
} from '@angular/core';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  ChartOptions,
} from 'chart.js';
import { ProductivityDayPoint } from '../../../../core/models/insights.models';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

@Component({
  selector: 'app-productivity-chart',
  standalone: true,
  templateUrl: './productivity-chart.component.html',
  styleUrls: ['./productivity-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductivityChartComponent implements AfterViewInit, OnDestroy {
  days = input<ProductivityDayPoint[]>([]);
  isLoading = input<boolean>(false);

  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const days = this.days();
      if (this.chart) {
        this.updateChart(days);
      }
    });
  }

  ngAfterViewInit(): void {
    // Canvas is always in DOM, so canvasRef is always defined here
    this.buildChart(this.days());
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private buildChart(days: ProductivityDayPoint[]): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const todayIdx = days.findIndex(d => d.is_today);

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(108,99,255,0.85)');
    gradient.addColorStop(1, 'rgba(0,194,255,0.6)');

    const backgroundColors = days.map((_, i) =>
      i === todayIdx ? '#00C2FF' : gradient,
    );

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days.map(d => d.day_name),
        datasets: [
          {
            data: days.map(d => d.productivity_score),
            backgroundColor: backgroundColors,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 32,
          },
        ],
      },
      options: this.chartOptions(todayIdx),
    });
  }

  private updateChart(days: ProductivityDayPoint[]): void {
    if (!this.chart) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const todayIdx = days.findIndex(d => d.is_today);
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(108,99,255,0.85)');
    gradient.addColorStop(1, 'rgba(0,194,255,0.6)');

    this.chart.data.labels = days.map(d => d.day_name);
    this.chart.data.datasets[0].data = days.map(d => d.productivity_score);
    this.chart.data.datasets[0].backgroundColor = days.map((_, i) =>
      i === todayIdx ? '#00C2FF' : gradient,
    );
    this.chart.options = this.chartOptions(todayIdx);
    this.chart.update();
  }

  private chartOptions(todayIdx: number): ChartOptions<'bar'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17,17,17,0.95)',
          titleColor: '#F5F5F5',
          bodyColor: '#888888',
          borderColor: 'rgba(108,99,255,0.3)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: items => {
              const d = this.days()[items[0].dataIndex];
              return d ? d.day_name : '';
            },
            label: item => {
              const d = this.days()[item.dataIndex];
              if (!d) return '';
              return ` Score: ${item.raw} | Habits: ${d.habits_completed}/${d.habits_total}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: (ctx2) =>
              ctx2.index === todayIdx ? '#00C2FF' : '#888888',
            font: { size: 12, family: 'Inter' },
          },
        },
        y: {
          display: false,
          min: 0,
          max: 100,
        },
      },
    };
  }
}
