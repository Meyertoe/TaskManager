import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Auth } from './auth';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(Auth).token;
  const url = new URL(request.url, window.location.origin);
  if (token && url.origin === 'http://localhost:5218' &&
      (url.pathname === '/api/tasks' || url.pathname.startsWith('/api/tasks/'))) {
    request = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(request);
};
