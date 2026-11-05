import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  date: string;
  readTime: string;
  featured: boolean;
  tags: string[];

  author: {
    name: string;
    avatar: string;
    role: string;
  };
}

interface BlogData {
  posts: Post[];

  categories: {
    name: string;
    count: number;
    color: string;
  }[];
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
})
export class Blog implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  posts = signal<Post[]>([]);
  categories = signal<string[]>([]);

  loading = signal(true);
  error = signal('');

  search = signal('');
  selectedCategory = signal('الكل');
  view = signal<'grid' | 'list'>('grid');

  currentPage = signal(1);
  readonly pageSize = 6;

  // تطبيق البحث والتصنيف معًا.
  filteredPosts = computed(() => {
    const query = this.normalize(this.search().trim());
    const category = this.selectedCategory();

    return this.posts().filter((post) => {
      const matchesCategory =
        category === 'الكل' || post.category === category;

      const searchableText = this.normalize(
        `${post.title} ${post.excerpt} ${post.author.name} ${post.tags.join(' ')}`
      );

      const matchesSearch =
        query === '' || searchableText.includes(query);

      return matchesCategory && matchesSearch;
    });
  });

  // عدد الصفحات بعد تطبيق البحث والفلترة.
  totalPages = computed(() =>
    Math.ceil(this.filteredPosts().length / this.pageSize)
  );

  pageNumbers = computed(() =>
    Array.from(
      { length: this.totalPages() },
      (_, index) => index + 1
    )
  );

  // المقالات المعروضة في الصفحة الحالية.
  visiblePosts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;

    return this.filteredPosts().slice(
      start,
      start + this.pageSize
    );
  });

  private readonly dateFormatter = new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  ngOnInit(): void {
    // متابعة تغيير التصنيف في الرابط، حتى داخل نفس صفحة المدونة.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const category = params.get('category') || 'الكل';

        const validCategory =
          this.categories().length === 0 ||
          category === 'الكل' ||
          this.categories().includes(category);

        this.selectedCategory.set(
          validCategory ? category : 'الكل'
        );

        this.currentPage.set(1);
      });

    void this.loadPosts();
  }

  async loadPosts(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      // تحميل ملف JSON ثابت من public.
      const response = await fetch('data/posts.json');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: BlogData = await response.json();

      if (
        !Array.isArray(data.posts) ||
        !Array.isArray(data.categories)
      ) {
        throw new Error('Invalid JSON structure');
      }

      const categoryNames = data.categories.map(
        (category) => category.name
      );

      this.posts.set(data.posts);
      this.categories.set(categoryNames);

      // التحقق من التصنيف القادم من الرابط بعد تحميل البيانات.
      if (
        this.selectedCategory() !== 'الكل' &&
        !categoryNames.includes(this.selectedCategory())
      ) {
        this.selectedCategory.set('الكل');
      }

      this.currentPage.set(1);
    } catch (error) {
      console.error('Failed to load posts:', error);

      this.error.set(
        'تعذر تحميل المقالات. تأكد أن الملف موجود في public/data/posts.json.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  updateSearch(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.search.set('');
    this.selectedCategory.set('الكل');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);

    document.getElementById('articles')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  formatDate(date: string): string {
    return this.dateFormatter.format(
      new Date(`${date}T12:00:00`)
    );
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/ـ/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي');
  }
}