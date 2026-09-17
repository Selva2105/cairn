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
import {
  Check,
  KeyRound,
  Mail,
  MessageSquare,
  ShieldCheck,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { browserApiFetch } from '../../../../lib/api-client-browser';
import { CountryPhoneInput } from '../../../../components/country-phone-input';
import { ApiError } from '../../../../lib/api-error';

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  whatsappConfigured: boolean;
}

/* ── Name Form ───────────────────────────────────────────────────── */
const nameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});
type NameForm = z.infer<typeof nameSchema>;

function ProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: initialName },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await browserApiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      toast.success('Display name updated');
      router.refresh();
    } catch {
      toast.error('Failed to update name');
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-sm font-medium">
          Display name
        </Label>
        <Input id="name" {...register('name')} className="h-9" />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!isDirty}
          className="gap-1.5 shadow-none"
        >
          <Check className="h-3.5 w-3.5" />
          Save name
        </Button>
      </div>
    </form>
  );
}

/* ── Phone Form ──────────────────────────────────────────────────── */
const phoneSchema = z.object({
  phone: z
    .string()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      'Enter a valid phone number (e.g. +14155552671)',
    ),
});
type PhoneForm = z.infer<typeof phoneSchema>;

function PhoneForm({ currentPhone }: { currentPhone: string | null }) {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: currentPhone ?? '' },
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    try {
      await browserApiFetch('/users/me/phone', {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      toast.success('WhatsApp number saved');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Failed to save phone number',
      );
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {currentPhone ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>
            Linked: <strong className="font-mono">{currentPhone}</strong>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>
            No phone linked — save your number below to enable WhatsApp bot.
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-sm font-medium">
          WhatsApp number
        </Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Controller
              control={control}
              name="phone"
              render={({ field: { value, onChange } }) => (
                <CountryPhoneInput
                  id="phone"
                  value={value}
                  onChange={(val) => onChange(val ?? '')}
                  disabled={saving}
                />
              )}
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="shrink-0 shadow-none gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone.message}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Used to receive WhatsApp alerts and to interact with the Cairn
          assistant.
        </p>
      </div>
    </form>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */
export function AccountClient({ profile }: { profile: UserProfileData }) {
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="rounded-xl border border-border shadow-none">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Profile
                </CardTitle>
                <CardDescription className="text-xs">
                  Update your display name shown across the app.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <ProfileForm initialName={profile.name} />

            {/* Read-only Email */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <Label className="text-sm font-medium">Email address</Label>
              <div className="flex items-center gap-2 h-9 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{profile.email}</span>
                {profile.emailVerifiedAt ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-500 font-medium">
                    Unverified
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp / Phone Card */}
        <Card className="rounded-xl border border-border shadow-none">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  WhatsApp number
                </CardTitle>
                <CardDescription className="text-xs">
                  Link your phone to receive alerts and interact via WhatsApp.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <PhoneForm currentPhone={profile.phone} />
          </CardContent>
        </Card>
      </div>

      {/* Account Info */}
      <Card className="rounded-xl border border-border shadow-none">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Account details
              </CardTitle>
              <CardDescription className="text-xs">
                Read-only information about your account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                User ID
              </dt>
              <dd className="text-xs font-mono text-foreground truncate">
                {profile.id}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Member since
              </dt>
              <dd className="text-xs text-foreground">{memberSince}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                WhatsApp Bot
              </dt>
              <dd className="text-xs text-foreground">
                {profile.whatsappConfigured
                  ? profile.phone
                    ? '✅ Connected'
                    : '⚠️ Phone not linked'
                  : '🔴 Server not configured'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
