'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Button } from './button';
import { Calendar } from './calendar';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A single control combining a Calendar (date) and a time input, behind a Popover trigger --
 * shadcn doesn't ship a date-time picker out of the box, so this composes it from the primitives
 * it does ship. Selecting a day preserves whatever time-of-day was already set (defaulting to
 * midnight), and changing the time preserves whatever day was already picked (defaulting to
 * today), so the two controls never clobber each other.
 */
function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick a date and time',
  disabled,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  function handleDaySelect(day: Date | undefined) {
    if (!day) {
      onChange(undefined);
      return;
    }
    const next = new Date(day);
    if (value) {
      next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    } else {
      next.setHours(0, 0, 0, 0);
    }
    onChange(next);
  }

  function handleTimeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const [hours, minutes] = event.target.value.split(':').map(Number);
    const base = value ? new Date(value) : new Date();
    base.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    onChange(base);
  }

  const timeValue = value
    ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? format(value, 'PPP p') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDaySelect}
          autoFocus
        />
        <div className="border-t border-border/50 bg-card/40 backdrop-blur-sm p-3">
          <Input type="time" value={timeValue} onChange={handleTimeChange} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
DateTimePicker.displayName = 'DateTimePicker';

export { DateTimePicker };
