'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@cairn/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError } from '../../lib/api-error';
import { browserApiFetch } from '../../lib/api-client-browser';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  password: z.string().min(8, 'Must be at least 8 characters'),
  householdName: z.string().min(1, 'Household name is required'),
});

type SignupInput = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await browserApiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      router.push('/dashboard/overview');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your household</CardTitle>
        <CardDescription>
          Start noticing what's about to go wrong, before it does.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" autoComplete="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="householdName">Household name</Label>
            <Input
              id="householdName"
              placeholder="The Smiths"
              {...register('householdName')}
            />
            {errors.householdName && (
              <p className="text-sm text-destructive">
                {errors.householdName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
