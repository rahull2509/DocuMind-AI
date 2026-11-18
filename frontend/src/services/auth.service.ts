import { apiFetch } from './api';
import { AuthResponse, LoginPayload, RegisterPayload, UserProfile } from '@/types/auth';

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/auth/me');
}
