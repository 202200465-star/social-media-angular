import { socialGuard } from './social/social-api';
import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { Blog } from './pages/blog/blog';
import { BlogDetails } from './pages/blog-details/blog-details';
import { NotFound } from './pages/not-found/not-found';


export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: Home,
    title: 'عدسة | الرئيسية',
  },
  {
    path: 'blog',
    component: Blog,
    title: 'عدسة | المدونة',
  },
  {
    path: 'blog-details',
    component: BlogDetails,
    title: 'عدسة | تفاصيل المقال',
  },
  { path: 'login', loadComponent: () => import('./social/auth').then(m => m.SocialAuth), title: 'عدسة | تسجيل الدخول' },
  { path: 'signup', loadComponent: () => import('./social/auth').then(m => m.SocialAuth), data: { signup: true }, title: 'عدسة | حساب جديد' },
  { path: 'community', canActivate: [socialGuard], loadComponent: () => import('./social/community').then(m => m.Community), data: { mode: 'feed' }, title: 'عدسة | المجتمع' },
  { path: 'community/profile', canActivate: [socialGuard], loadComponent: () => import('./social/community').then(m => m.Community), data: { mode: 'profile' }, title: 'عدسة | حسابي' },
  { path: 'community/password', canActivate: [socialGuard], loadComponent: () => import('./social/community').then(m => m.Community), data: { mode: 'password' }, title: 'عدسة | كلمة المرور' },
  { path: 'community/posts/:id', canActivate: [socialGuard], loadComponent: () => import('./social/community').then(m => m.Community), data: { mode: 'detail' }, title: 'عدسة | المنشور' },
  {
    path: '**',
    component: NotFound,
    title: 'عدسة | الصفحة غير موجودة',
  },
];