import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  message = signal('');

  subscribe(event: Event): void {
    event.preventDefault();

    this.message.set(
      'الاشتراك تجريبي؛ لم يتم إرسال أو حفظ بريدك.'
    );
  }
}