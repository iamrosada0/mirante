import { useState, useCallback } from "react";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { taskSchema } from "@/lib/zodSchemas";
import { getFriendlyErrorMessage } from "@/lib/firebaseErrors";
import { User } from "firebase/auth";

interface TaskData {
  title: string;
  description: string;
  dueDate: string;
  assignee: string | null;
  priority: "low" | "medium" | "high";
}

export function useCreateTask(
  projectId: string | null,
  setOpen: (open: boolean) => void
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const router = useRouter();

  const handleCreateTask = useCallback(
    async (data: TaskData, user: User | null) => {
      setError("");
      setValidationErrors({});

      if (!user) {
        setError("No user is logged in.");
        return;
      }

      if (!projectId) {
        setError("Invalid project ID. Please select a project.");
        return;
      }

      const validationResult = taskSchema.safeParse({
        ...data,
        projectId,
      });

      if (!validationResult.success) {
        const errors = validationResult.error.issues.reduce(
          (acc, issue) => ({
            ...acc,
            [issue.path[0]]: issue.message,
          }),
          {} as Record<string, string>
        );
        setValidationErrors(errors);
        return;
      }

      setIsSubmitting(true);
      try {
        const taskRef = await addDoc(collection(db, "tasks"), {
          title: data.title.trim(),
          description: data.description.trim(),
          projectId,
          status: "pending",
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          assignee: data.assignee || null,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        });

        if (data.assignee) {
          const projectDoc = await getDoc(doc(db, "projects", projectId));
          const projectTitle = projectDoc.exists()
            ? projectDoc.data().title
            : "Unknown Project";

          await addDoc(collection(db, "notifications"), {
            userId: data.assignee,
            message: `You have been assigned to task "${data.title.trim()}" in project "${projectTitle}" by ${user.displayName || "Anonymous"}.`,
            taskId: taskRef.id,
            projectId,
            read: false,
            createdAt: serverTimestamp(),
            type: "assignment",
          });
        }

        setOpen(false);
        setTimeout(() => router.push(`/dashboard/${projectId}`), 100);
      } catch (err: unknown) {
        setError(getFriendlyErrorMessage(err));
        console.error("Error saving task:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [projectId, setOpen, router]
  );

  return { handleCreateTask, isSubmitting, error, validationErrors };
}
