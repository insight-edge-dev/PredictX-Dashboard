import { API_BASE } from './config';

function getStoredKey(): string {
  return sessionStorage.getItem('predictx_admin_token') ?? '';
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key':  getStoredKey(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  get:    <T>(path: string)                   => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown)    => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown)    => request<T>('PUT',    path, body),
  delete: <T>(path: string)                   => request<T>('DELETE', path),
};

/** Uploads a banner image as multipart/form-data and returns its Cloudinary URL + public ID. */
export async function uploadBannerImage(file: File): Promise<{ url: string; publicId: string }> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API_BASE}/admin/banners/upload`, {
    method: 'POST',
    headers: { 'x-admin-key': getStoredKey() },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Upload failed');
  }
  return res.json();
}
