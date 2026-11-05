import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { SocialApi, SocialPost, Comment, User } from './social-api';

@Component({selector: 'app-community', standalone: true, imports: [FormsModule, RouterLink, DatePipe], templateUrl: './community.html', styleUrl: './social.css'})
export class Community {
  api = inject(SocialApi); private route = inject(ActivatedRoute); private router = inject(Router);
  mode = signal('feed'); posts = signal<SocialPost[]>([]); comments = signal<Comment[]>([]);
  loading = signal(true); moreBusy = signal(false); busy = signal(false); error = signal(''); notice = signal('');
  nextPage = signal<number | null>(null); nextComments = signal<number | null>(null);
  postId = ''; draft = ''; file: File | null = null; editing = signal<string | null>(null);
  editBody = ''; editFile: File | null = null;
  commentText = ''; editingComment = signal<string | null>(null); editComment = '';
  password = ''; newPassword = ''; confirmPassword = '';
  private generation = 0;
  constructor() {
    combineLatest([this.route.data, this.route.paramMap]).pipe(takeUntilDestroyed()).subscribe(([data, params]) => {
      this.mode.set(data['mode'] || 'feed'); this.postId = params.get('id') || '';
      this.editing.set(null); this.editingComment.set(null); this.notice.set('');
      void this.load();
    });
  }
  async load() {
    const gen = ++this.generation;
    this.loading.set(true); this.error.set(''); this.posts.set([]); this.comments.set([]);
    this.nextPage.set(null); this.nextComments.set(null);
    try {
      await this.api.profile();
      if (gen !== this.generation) return;
      if (this.mode() === 'password') return;
      if (this.mode() === 'detail') {
        const id = encodeURIComponent(this.postId);
        const [post, comments] = await Promise.all([
          this.api.request<{ post: SocialPost }>(`/posts/${id}`),
          this.api.request<{ comments: Comment[] }>(`/posts/${id}/comments?page=1&limit=10`),
        ]);
        if (gen !== this.generation) return;
        if (!post.data.post) throw new Error('المنشور غير موجود.');
        this.posts.set([post.data.post]); this.comments.set(comments.data.comments || []);
        this.nextComments.set(comments.meta?.pagination?.nextPage ?? null);
      } else {
        const result = await this.api.request<{ posts: SocialPost[] }>(this.feedPath(1));
        if (gen !== this.generation) return;
        this.posts.set(result.data.posts || []); this.nextPage.set(result.meta?.pagination?.nextPage ?? null);
      }
    } catch (error) { if (gen === this.generation) this.fail(error); }
    finally { if (gen === this.generation) this.loading.set(false); }
  }
  private feedPath(page: number) { return `/posts/feed?only=${this.mode() === 'profile' ? 'me' : 'all'}&page=${page}&limit=10`; }
  async more(comments = false) {
    const page = comments ? this.nextComments() : this.nextPage();
    if (!page || this.moreBusy()) return;
    const gen = this.generation;
    this.moreBusy.set(true); this.error.set('');
    try {
      if (comments) {
        const res = await this.api.request<{ comments: Comment[] }>(`/posts/${encodeURIComponent(this.postId)}/comments?page=${page}&limit=10`);
        if (gen !== this.generation) return;
        this.comments.update(old => [...old, ...res.data.comments.filter(c => !old.some(x => x._id === c._id))]);
        this.nextComments.set(res.meta?.pagination?.nextPage ?? null);
      } else {
        const res = await this.api.request<{ posts: SocialPost[] }>(this.feedPath(page));
        if (gen !== this.generation) return;
        this.posts.update(old => [...old, ...res.data.posts.filter(p => !old.some(x => x._id === p._id))]);
        this.nextPage.set(res.meta?.pagination?.nextPage ?? null);
      }
    } catch (error) { this.fail(error); } finally { this.moreBusy.set(false); }
  }
  own(user: User | string | undefined): boolean { return !!user && (typeof user === 'string' ? user : user._id) === this.api.user()?._id; }
  pick(event: Event, edit = false) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      this.error.set('اختر صورة JPG أو PNG أو WebP بحجم أقل من 5 MB.'); input.value = ''; return;
    }
    if (edit) this.editFile = file; else this.file = file;
  }
  async publish(form: NgForm, input: HTMLInputElement) {
    if (!this.draft.trim() && !this.file) { this.error.set('اكتب منشورًا أو اختر صورة.'); return; }
    await this.mutate(async () => {
      const body = new FormData();
      if (this.draft.trim()) body.set('body', this.draft.trim());
      if (this.file) body.set('image', this.file);
      body.set('privacy', 'public');
      await this.api.request('/posts', 'POST', body);
      form.resetForm(); this.draft = ''; this.file = null; input.value = '';
      await this.load(); this.notice.set('تم نشر المنشور.');
    });
  }
  startEdit(post: SocialPost) { this.editing.set(post._id); this.editBody = post.body || ''; this.editFile = null; }
  async savePost(post: SocialPost) {
    if (!this.editBody.trim() && !this.editFile && !post.image) { this.error.set('المنشور لا يمكن أن يكون فارغًا.'); return; }
    await this.mutate(async () => {
      const body = new FormData(); body.set('body', this.editBody.trim());
      if (this.editFile) body.set('image', this.editFile);
      await this.api.request(`/posts/${encodeURIComponent(post._id)}`, 'PUT', body);
      this.editing.set(null); this.editFile = null; await this.load(); this.notice.set('تم تعديل المنشور.');
    });
  }
  async deletePost(post: SocialPost) {
    if (!confirm('هل تريد حذف هذا المنشور؟')) return;
    await this.mutate(async () => {
      await this.api.request(`/posts/${encodeURIComponent(post._id)}`, 'DELETE');
      if (this.mode() === 'detail') await this.router.navigateByUrl('/community');
      else { await this.load(); this.notice.set('تم حذف المنشور.'); }
    });
  }
  async addComment() {
    if (!this.commentText.trim()) return;
    await this.mutate(async () => {
      await this.api.request(`/posts/${encodeURIComponent(this.postId)}/comments`, 'POST', { content: this.commentText.trim() });
      this.commentText = ''; await this.load(); this.notice.set('تمت إضافة التعليق.');
    });
  }
  async saveComment(comment: Comment) {
    if (!this.editComment.trim()) return;
    await this.mutate(async () => {
      await this.api.request(`/posts/${encodeURIComponent(this.postId)}/comments/${encodeURIComponent(comment._id)}`, 'PUT', { content: this.editComment.trim() });
      this.editingComment.set(null); await this.load(); this.notice.set('تم تعديل التعليق.');
    });
  }
  async deleteComment(comment: Comment) {
    if (!confirm('هل تريد حذف هذا التعليق؟')) return;
    await this.mutate(async () => {
      await this.api.request(`/posts/${encodeURIComponent(this.postId)}/comments/${encodeURIComponent(comment._id)}`, 'DELETE');
      await this.load(); this.notice.set('تم حذف التعليق.');
    });
  }
  async changePassword(form: NgForm) {
    if (form.invalid || this.newPassword !== this.confirmPassword) { this.error.set('راجع كلمات المرور وتطابق التأكيد.'); return; }
    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[#?!@$%^&*-]).{8,}$/.test(this.newPassword)) {
      this.error.set('كلمة المرور الجديدة تحتاج 8 أحرف على الأقل، وحرفًا كبيرًا وصغيرًا ورقمًا ورمزًا مثل @.'); return;
    }
    await this.mutate(async () => {
      const res = await this.api.request<{ token?: string }>('/users/change-password', 'PATCH', { password: this.password, newPassword: this.newPassword });
      form.resetForm(); this.password = ''; this.newPassword = ''; this.confirmPassword = '';
      if (res.data.token) this.api.setToken(res.data.token);
      else { this.api.logout(); return; }
      this.notice.set('تم تغيير كلمة المرور بنجاح.');
    });
  }
  private async mutate(action: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.notice.set('');
    try { await action(); } catch (error) { this.fail(error); } finally { this.busy.set(false); }
  }
  private fail(error: unknown) { this.error.set(error instanceof Error ? error.message : 'حدث خطأ. حاول مرة أخرى.'); }
}
