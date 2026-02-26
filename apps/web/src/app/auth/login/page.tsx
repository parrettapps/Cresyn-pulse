'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from '../../../lib/auth-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setServerError(null);
    try {
      await signIn.social({ provider: 'google', callbackURL: '/app' });
      // OAuth redirect handles navigation
    } catch {
      setServerError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  }

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    const result = await signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: '/app',
    });

    if (result.error) {
      setServerError(result.error.message ?? 'Invalid email or password');
      return;
    }

    router.push('/app');
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-neutral-50 px-4 py-16">
      {/* Brand mark */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-lg">
          <span className="text-xl font-bold text-white">CP</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Cresyn Pulse</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to your account</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white px-8 py-8 shadow-sm">
        {/* Google SSO */}
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleGoogleSignIn}
          loading={googleLoading}
          type="button"
        >
          {!googleLoading && <GoogleIcon />}
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs font-medium text-neutral-400">or sign in with email</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        {/* Email / password */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="Email address"
            autoComplete="email"
            placeholder="you@cresyn.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            id="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <Button type="submit" size="lg" className="mt-1 w-full" loading={isSubmitting}>
            Sign in
          </Button>
        </form>
      </div>

      {/* Footer — signup CTA + invitation note */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="text-center text-sm text-neutral-500">
          New to Cresyn Pulse?{' '}
          <Link
            href="/auth/signup"
            className="font-semibold text-primary-600 hover:text-primary-500 transition-colors"
          >
            Create a workspace →
          </Link>
        </p>
        <p className="text-center text-xs text-neutral-400">
          Joining an existing team?{' '}
          <a
            href="mailto:admin@cresyn.com"
            className="font-medium text-neutral-500 hover:text-neutral-700 transition-colors underline underline-offset-2"
          >
            Ask your admin for an invite
          </a>
        </p>
      </div>
    </div>
  );
}
