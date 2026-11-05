import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Post {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  date: string;
  readTime: string;
  tags: string[];

  author: {
    name: string;
    avatar: string;
    role: string;
  };
}

interface ArticleBlock {
  type: 'heading' | 'paragraph';
  text: string;
}

@Component({
  selector: 'app-blog-details',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './blog-details.html',
  styleUrl: './blog-details.css',
})
export class BlogDetails implements OnInit {
  post = signal<Post | null>(null);
  blocks = signal<ArticleBlock[]>([]);

  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    void this.loadArticle();
  }

  async loadArticle(): Promise<void> {
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

      // المقال الثابت المطلوب في التكليف.
      const article = data.posts.find((post) => post.id === 1);

      if (!article) {
        throw new Error('Article not found');
      }

      this.post.set(article);

      // تحويل عناوين وفقرات المقال إلى عناصر قابلة للعرض.
      const blocks: ArticleBlock[] = article.content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          if (line.startsWith('## ')) {
            return {
              type: 'heading',
              text: line.slice(3),
            };
          }

          return {
            type: 'paragraph',
            text: line,
          };
        });

      this.blocks.set(blocks);
    } catch (error) {
      console.error('Failed to load article:', error);

      this.error.set(
        'تعذر تحميل المقال. تأكد من وجود ملف public/data/posts.json.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`));
  }
}