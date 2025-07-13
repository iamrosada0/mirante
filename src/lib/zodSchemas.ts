import { z } from "zod";

export const taskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required.")
    .max(100, "Task title must be 100 characters or less.")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less.")
    .optional()
    .default(""),
  dueDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true; // Allow empty dueDate
        const due = new Date(val);
        return !isNaN(due.getTime()) && due >= new Date();
      },
      { message: "Due date must be a valid date and not in the past." }
    ),
  assignee: z.string().nullable(),
  priority: z.enum(["low", "medium", "high"]),
  projectId: z.string().min(1, "Project ID is required."),
});

export const projectSchema = z
  .object({
    title: z
      .string()
      .min(1, "Project title is required.")
      .max(100, "Project title must be 100 characters or less."),
    description: z
      .string()
      .max(500, "Description must be 500 characters or less.")
      .optional(),
    startDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
      message: "Invalid start date.",
    }),
    endDate: z
      .string()
      .optional()
      .refine((date) => !date || !isNaN(new Date(date).getTime()), {
        message: "Invalid end date.",
      }),
    members: z.array(z.string()),
    userId: z.string(),
  })
  .refine(
    (data) =>
      !data.endDate || new Date(data.endDate) >= new Date(data.startDate),
    {
      message: "End date cannot be before start date.",
      path: ["endDate"],
    }
  );
