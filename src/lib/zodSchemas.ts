import { z } from "zod"; // Import Zod

// Define Zod schema for task validation
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
