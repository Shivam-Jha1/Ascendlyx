import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-ai-coach',
  standalone: true,
  templateUrl: './ai-coach.component.html',
  styleUrls: ['./ai-coach.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiCoachComponent {
  message = input<string | null>(null);
  isStale = input<boolean>(false);
  isLoading = input<boolean>(false);
}
