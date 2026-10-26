import { z } from 'zod';

export const AssignReviewerSchema = z.object({
  applicationId: z.string(),
  reviewerId: z.string(),
});

export const RequestClarificationSchema = z.object({
  applicationId: z.string(),
  notes: z.string().min(3),
});

export const InternalNoteSchema = z.object({
  applicationId: z.string(),
  note: z.string().min(1),
});
