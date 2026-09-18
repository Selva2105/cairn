'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DateTimePicker, Input, Label } from '@cairn/ui';
import { Paperclip, Pencil, Trash2, Upload, X } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError } from '../../../lib/api-error';
import { browserApiFetch } from '../../../lib/api-client-browser';
import {
  documentFileUrl,
  formatFileSize,
  type DocumentRow,
} from './documents-client';

const MAX_DOCUMENT_FILE_BYTES = 15 * 1024 * 1024; // matches apps/api's DocumentsController limit

const editSchema = z.object({
  type: z.string().min(1, 'Document type is required'),
  label: z.string().min(1, 'Label is required').max(120),
  expiresOn: z.date({ message: 'Expiry date and time are required' }),
  notes: z.string().max(500).optional(),
});

type EditInput = z.infer<typeof editSchema>;

export function DocumentEditModal({
  householdId,
  documentTypes,
  document,
  onClose,
}: {
  householdId: string;
  documentTypes: string[];
  document: DocumentRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  // Tracked separately from the form: the file upload/remove calls are their own immediate
  // requests, not part of the "Save changes" PATCH.
  const [currentFile, setCurrentFile] = useState<{
    name: string;
    size: number | null;
  } | null>(
    document.fileUrl
      ? { name: document.fileName ?? 'Attachment', size: document.fileSize }
      : null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditInput>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      type: document.type,
      label: document.label,
      expiresOn: new Date(document.expiresOn),
      notes: document.notes ?? '',
    },
  });

  const uploadFile = async (file: File) => {
    if (file.size > MAX_DOCUMENT_FILE_BYTES) {
      toast.error(
        `File is too large (max ${formatFileSize(MAX_DOCUMENT_FILE_BYTES)})`,
      );
      return;
    }
    setFileBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await browserApiFetch(
        `/households/${householdId}/documents/${document.id}/file`,
        { method: 'POST', body: formData },
      );
      setCurrentFile({ name: file.name, size: file.size });
      toast.success('File attached');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to upload file',
      );
    } finally {
      setFileBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = async () => {
    setFileBusy(true);
    try {
      await browserApiFetch(
        `/households/${householdId}/documents/${document.id}/file`,
        { method: 'DELETE' },
      );
      setCurrentFile(null);
      toast.success('File removed');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to remove file',
      );
    } finally {
      setFileBusy(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await browserApiFetch(
        `/households/${householdId}/documents/${document.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...values,
            expiresOn: values.expiresOn.toISOString(),
          }),
        },
      );
      toast.success('Document updated');
      router.refresh();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update document',
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-border bg-card/95 backdrop-blur-xl p-6 animate-in zoom-in-95 duration-200 flex flex-col gap-5"
      >
        <div className="flex items-start justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Edit document
              </h3>
              <p className="text-xs text-muted-foreground">
                Update details or push out the expiry after a renewal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-type" className="text-sm font-medium">
              Document type
            </Label>
            <select
              id="edit-type"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-foreground/40 focus-visible:ring-1 focus-visible:ring-foreground/20"
              {...register('type')}
            >
              {documentTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                  className="bg-popover text-popover-foreground"
                >
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-expiresOn" className="text-sm font-medium">
              Expires on
            </Label>
            <Controller
              name="expiresOn"
              control={control}
              render={({ field }) => (
                <DateTimePicker value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.expiresOn && (
              <p className="text-xs font-medium text-destructive">
                {errors.expiresOn.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-label" className="text-sm font-medium">
              Label
            </Label>
            <Input id="edit-label" {...register('label')} />
            {errors.label && (
              <p className="text-xs font-medium text-destructive">
                {errors.label.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes" className="text-sm font-medium">
              Notes (optional)
            </Label>
            <Input id="edit-notes" {...register('notes')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Attached file</Label>
          {currentFile ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 p-3">
              <a
                href={documentFileUrl(householdId, document.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline min-w-0"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{currentFile.name}</span>
                {currentFile.size !== null && (
                  <span className="text-muted-foreground shrink-0">
                    ({formatFileSize(currentFile.size)})
                  </span>
                )}
              </a>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={fileBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 px-2 text-xs"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={fileBusy}
                  onClick={removeFile}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={fileBusy}
              onClick={() => fileInputRef.current?.click()}
              className="w-full justify-center border-dashed"
            >
              <Upload className="mr-2 h-4 w-4" />
              {fileBusy ? 'Uploading...' : 'Attach a PDF or image'}
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            PDF or image, up to {formatFileSize(MAX_DOCUMENT_FILE_BYTES)}. Only
            members of your household can view it.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
