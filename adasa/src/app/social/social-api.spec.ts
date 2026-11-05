import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialApi } from './social-api';

describe('SocialApi authentication boundary', () => {
  let api: SocialApi;
  const navigateByUrl = vi.fn();
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [SocialApi, { provide: Router, useValue: { navigateByUrl } }] });
    api = TestBed.inject(SocialApi);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
  it('signs in without a bearer header and stores the nested token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { token: 'test-token', user: { _id: 'me', name: 'Tester' } } })));
    vi.stubGlobal('fetch', fetchMock);
    await api.authenticate('signin', { login: 'tester', password: 'test' });
    expect(api.token()).toBe('test-token');
    expect(sessionStorage.getItem('adasa-social-token')).toBe('test-token');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(api.user()?._id).toBe('me');
  });
  it('sends the bearer token only to the configured API', async () => {
    api.setToken('test-token');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { user: { _id: 'me' } } })));
    vi.stubGlobal('fetch', fetchMock);
    await api.profile();
    expect(fetchMock.mock.calls[0][0]).toBe('https://route-posts.routemisr.com/users/profile-data');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
  });
  it('leaves multipart Content-Type to the browser', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: {} })));
    vi.stubGlobal('fetch', fetchMock);
    await api.request('/posts', 'POST', new FormData());
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });
  it('clears a revoked token on 401 and redirects to login', async () => {
    api.setToken('expired');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(api.profile()).rejects.toThrow('انتهت الجلسة');
    expect(api.token()).toBe('');
    expect(sessionStorage.getItem('adasa-social-token')).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });
  it('retains the session on a permission error and exposes the API error', async () => {
    api.setToken('valid');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, message: 'Forbidden' }), { status: 403 })));
    await expect(api.request('/posts/other', 'DELETE')).rejects.toThrow('Forbidden');
    expect(api.token()).toBe('valid');
  });
  it('turns a network failure into a retryable message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api.profile()).rejects.toThrow('تعذر الاتصال');
  });
});
