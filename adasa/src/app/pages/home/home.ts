import { Component, computed, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Post {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  featured: boolean;
  date: string;
  readTime: string;

  author: {
    name: string;
    avatar: string;
    role: string;
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  posts = signal<Post[]>([]);
  loading = signal(true);
  error = signal('');
  newsletterMessage = signal('');

  featuredPosts = computed(() =>
    this.posts().filter((post) => post.featured).slice(0, 3)
  );

  // أحدث المقالات غير الموجودة في قسم المقالات المختارة.
  latestPosts = computed(() => {
    const featuredIds = new Set(
      this.featuredPosts().map((post) => post.id)
    );

    return this.posts()
      .filter((post) => !featuredIds.has(post.id))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  });

  categories = computed(() => {
    const names = [...new Set(this.posts().map((post) => post.category))];

    return names.map((name) => ({
      name,
      count: this.posts().filter((post) => post.category === name).length,
    }));
  });

  authorsCount = computed(() =>
    new Set(this.posts().map((post) => post.author.name)).size
  );

  ngOnInit(): void {
    void this.loadPosts();
  }

  async loadPosts(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const response = await fetch('data/posts.json');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: { posts: Post[] } = await response.json();

      if (!Array.isArray(data.posts)) {
        throw new Error('Invalid posts data');
      }

      this.posts.set(data.posts);
    } catch (error) {
      console.error(error);
      this.error.set('تعذر تحميل المقالات. تحقق من ملف posts.json.');
    } finally {
      this.loading.set(false);
    }
  }

  subscribe(event: Event): void {
    event.preventDefault();

    this.newsletterMessage.set(
      'شكرًا لاهتمامك! الاشتراك هنا تجريبي، ولم يتم إرسال أو حفظ بريدك.'
    );
  }
}