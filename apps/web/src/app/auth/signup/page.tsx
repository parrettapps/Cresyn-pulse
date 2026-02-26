'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signUp } from '../../../lib/auth-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

/* ------------------------------------------------------------------ */
/* Schema                                                                */
/* ------------------------------------------------------------------ */

const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Enter your full name (at least 2 characters)')
      .max(100),
    email: z.string().email('Enter a valid email address'),
    orgName: z
      .string()
      .min(2, 'Organization name must be at least 2 characters')
      .max(100),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

/* ------------------------------------------------------------------ */
/* Page                                                                  */
/* ------------------------------------------------------------------ */

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugPreview, setSlugPreview] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  // Derive slug from org name in real time
  const orgName = watch('orgName', '');
  useEffect(() => {
    setSlugPreview(generateSlug(orgName));
  }, [orgName]);

  async function onSubmit(values: SignupFormValues) {
    setServerError(null);
    const tenantSlug = generateSlug(values.orgName);

    if (!tenantSlug) {
      setServerError('Organization name is too short to generate a valid workspace URL.');
      return;
    }

    // ── Step 1: Create the Better Auth account ─────────────────
    const signUpResult = await signUp.email({
      email: values.email,
      password: values.password,
      name: values.fullName,
    });

    if (signUpResult.error) {
      const msg = signUpResult.error.message ?? 'Failed to create account';
      // Surface duplicate-email errors more clearly
      setServerError(
        msg.toLowerCase().includes('already')
          ? `An account with ${values.email} already exists. Try signing in instead.`
          : msg,
      );
      return;
    }

    // ── Step 2: Provision tenant via our API ────────────────────
    // The BA session cookie is set automatically by signUp.email().
    // We send it with credentials: 'include' to POST the provision endpoint.
    const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    const provisionRes = await fetch(`${API_URL}/api/v1/onboarding/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        fullName: values.fullName,
        tenantName: values.orgName,
        tenantSlug,
      }),
    });

    if (!provisionRes.ok) {
      let detail = 'Failed to set up your workspace. Please try again.';
      try {
        const body = (await provisionRes.json()) as { detail?: string };
        if (body.detail) detail = body.detail;
      } catch {
        // ignore JSON parse error
      }

      if (provisionRes.status === 409 && detail.toLowerCase().includes('url')) {
        setServerError(
          `The workspace URL "${tenantSlug}" is already taken. Try a slightly different organization name.`,
        );
      } else {
        setServerError(detail);
      }
      return;
    }

    // ── Done — send into the app ────────────────────────────────
    router.push('/app');
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      {/* Brand mark */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-lg">
          <span className="text-xl font-bold text-white">CP</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Create your workspace</h1>
          <p className="mt-1 text-sm text-neutral-500">
            14-day free trial · No credit card required
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white px-8 py-8 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Full name */}
          <Input
            id="fullName"
            label="Full name"
            autoComplete="name"
            placeholder="Kyle Parrett"
            error={errors.fullName?.message}
            {...register('fullName')}
          />

          {/* Work email */}
          <Input
            id="email"
            type="email"
            label="Work email"
            autoComplete="email"
            placeholder="you@company.com"
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Org name + live slug preview */}
          <Input
            id="orgName"
            label="Organization name"
            placeholder="Acme Corp"
            error={errors.orgName?.message}
            hint={
              slugPreview
                ? `Workspace URL: cresyn.com/${slugPreview}`
                : "Your team's unique workspace address"
            }
            {...register('orgName')}
          />

          {/* Divider */}
          <div className="my-1 h-px bg-neutral-100" />

          {/* Password */}
          <Input
            id="password"
            type="password"
            label="Password"
            autoComplete="new-password"
            placeholder="12+ characters"
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Confirm password */}
          <Input
            id="confirmPassword"
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            placeholder="••••••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          {/* Server-side error */}
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-1 w-full"
            loading={isSubmitting}
          >
            Create workspace
          </Button>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-sm text-neutral-400">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
