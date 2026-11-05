import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export interface User { _id: string; name: string; email?: string; username?: string; photo?: string; gender?: string; dateOfBirth?: string; }
export interface SocialPost { _id: string; body?: string; image?: string; user: User; createdAt: string; commentsCount?: number; }
export interface Comment { _id: string; content: string; image?: string; commentCreator: User; createdAt: string; }
export interface ApiResponse<T> { success: boolean; message: string; data: T; meta?: { pagination?: { nextPage?: number | null; totalPages?: number; } }; }

@Injectable({ providedIn: 'root' })
export class SocialApi {
  readonly base = 'https://route-posts.routemisr.com';
  readonly token = signal(sessionStorage.getItem('adasa-social-token') || '');
  readonly user = signal<User | null>(null);
  private readonly router = inject(Router);

  async request<T>(path: string, method = 'GET', body?: object | FormData, auth = true): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (auth && this.token()) headers['Authorization'] = `Bearer ${this.token()}`;
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(this.base + path, {
        method, headers, signal: controller.signal,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });
      if (response.status === 401 && auth) {
        this.logout();
        throw new Error('انتهت الجلسة. سجّل الدخول مرة أخرى.');
      }
      const result = await response.json();
      if (!response.ok || !result.success) {
        const details = Array.isArray(result.errors) ? result.errors.filter((x: unknown) => typeof x === 'string').join('، ') : '';
        throw new Error([result.message, details].filter(Boolean).join(' — ') || 'تعذر تنفيذ الطلب.');
      }
      return result;
    } catch (error) {
      if (error instanceof TypeError || (error instanceof DOMException && error.name === 'AbortError')) {
        throw new Error('تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجددًا.');
      }
      throw error;
    } finally { clearTimeout(timer); }
  }

  async authenticate(mode: 'signup' | 'signin', payload: object) {
    const result = await this.request<{ token: string; user: User }>(`/users/${mode}`, 'POST', payload, false);
    if (!result.data.token) throw new Error('لم يُرجع الخادم رمز تسجيل الدخول.');
    this.setToken(result.data.token);
    this.user.set(result.data.user);
  }
  setToken(token: string) { sessionStorage.setItem('adasa-social-token', token); this.token.set(token); }
  async profile() {
    const result = await this.request<{ user: User }>('/users/profile-data');
    this.user.set(result.data.user);
    return result.data.user;
  }
  logout() {
    sessionStorage.removeItem('adasa-social-token');
    this.token.set(''); this.user.set(null);
    void this.router.navigateByUrl('/login');
  }
}

export const socialGuard: CanActivateFn = (_route, state) => {
  const api = inject(SocialApi);
  return api.token() ? true : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
