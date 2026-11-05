import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SocialApi } from './social-api';

@Component({
  selector: 'app-social-auth', standalone: true, imports: [FormsModule, RouterLink],
  templateUrl: './auth.html', styleUrl: './social.css',
})
export class SocialAuth {
  api = inject(SocialApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  signup = signal(false); busy = signal(false); error = signal('');
  today = new Date().toISOString().slice(0, 10);
  values = { name: '', username: '', email: '', login: '', password: '', rePassword: '', gender: '', dateOfBirth: '' };
  constructor() {
    this.route.data.pipe(takeUntilDestroyed()).subscribe(data => { this.signup.set(!!data['signup']); this.error.set(''); });
  }
  async submit(form: NgForm) {
    if (this.busy()) return;
    this.error.set('');
    if (form.invalid) { form.control.markAllAsTouched(); this.error.set('راجع الحقول المطلوبة وصيغة البريد الإلكتروني.'); return; }
    if (this.signup()) {
      if (this.values.password !== this.values.rePassword) { this.error.set('كلمتا المرور غير متطابقتين.'); return; }
      if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[#?!@$%^&*-]).{8,}$/.test(this.values.password)) {
        this.error.set('استخدم 8 أحرف على الأقل، وحرفًا كبيرًا وصغيرًا ورقمًا ورمزًا مثل @.'); return;
      }
      if (this.values.dateOfBirth > this.today) { this.error.set('تاريخ الميلاد لا يمكن أن يكون في المستقبل.'); return; }
    }
    this.busy.set(true);
    try {
      const v = this.values;
      const payload = this.signup() ? {
        name: v.name.trim(), email: v.email.trim(), ...(v.username.trim() ? { username: v.username.trim() } : {}),
        password: v.password, rePassword: v.rePassword, gender: v.gender, dateOfBirth: v.dateOfBirth,
      } : { login: v.login.trim(), password: v.password };
      await this.api.authenticate(this.signup() ? 'signup' : 'signin', payload);
      this.values.password = ''; this.values.rePassword = '';
      const target = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(target && /^\/community(?:\/|\?|$)/.test(target) ? target : '/community');
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'تعذر تسجيل الدخول.'); }
    finally { this.busy.set(false); }
  }
}
