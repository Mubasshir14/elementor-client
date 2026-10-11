import { AuthCard } from '@/features/auth/AuthCard';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-brand-50 px-4 py-10">
      <AuthCard mode="register" />
    </main>
  );
}
