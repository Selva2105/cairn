'use client';

import React from 'react';
import PhoneInput, { type Country } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';

interface CountryPhoneInputProps {
  value?: string;
  onChange: (val: string | undefined) => void;
  defaultCountry?: Country;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function CountryPhoneInput({
  value,
  onChange,
  defaultCountry = 'US',
  disabled = false,
  placeholder = 'Enter phone number...',
  id,
  className = '',
}: CountryPhoneInputProps) {
  const phoneInputProps: Record<string, unknown> = {
    international: true,
    withCountryCallingCode: true,
    defaultCountry,
    flags,
    onChange,
    disabled,
    placeholder,
    className: 'flex items-center gap-2',
    numberInputProps: {
      className:
        'h-10 flex-1 rounded-lg border border-border bg-white dark:bg-stone-900 px-3 text-sm text-foreground shadow-none placeholder:text-muted-foreground/50 focus:border-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50',
    },
  };

  if (value !== undefined) {
    phoneInputProps.value = value;
  }
  if (id !== undefined) {
    phoneInputProps.id = id;
  }

  return (
    <div className={`country-phone-input-wrapper ${className}`}>
      {/* @ts-expect-error - exactOptionalPropertyTypes compatibility with react-phone-number-input */}
      <PhoneInput {...phoneInputProps} />
    </div>
  );
}
