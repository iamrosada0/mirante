// hooks/useCreateTask.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { taskSchema } from "@/lib/zodSchemas";
import { User } from "@/types";

export function useCreateTask(projectId: string | null, user: User) {
  const createTask = async ({
    title,
    description,
    dueDate,
    assignee,
    priority,
  }: {
    title: string;
    description: string;
    dueDate: string;
    assignee: string | null;
    priority: "low" | "medium" | "high";
  }) => {
    const result = taskSchema.safeParse({
      title,
      description,
      dueDate,
      assignee,
      priority,
      projectId,
    });

    if (!result.success) {
      const errors = result.error.issues.reduce(
        (acc, issue) => {
          acc[issue.path[0]] = issue.message;
          return acc;
        },
        {} as Record<string, string>
      );
      throw { validationErrors: errors };
    }

    if (!projectId || !user) {
      throw new Error("Invalid user or project");
    }

    const taskRef = await addDoc(collection(db, "tasks"), {
      title: title.trim(),
      description: description.trim(),
      projectId,
      status: "pending",
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      assignee: assignee || null,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
    });

    if (assignee) {
      const projectDoc = await getDoc(doc(db, "projects", projectId));
      const projectTitle = projectDoc.exists()
        ? projectDoc.data().title
        : "Unknown Project";

      await addDoc(collection(db, "notifications"), {
        userId: assignee,
        message: `You have been assigned to task "${title}" in project "${projectTitle}" by ${user.displayName || "Anonymous"}.`,
        taskId: taskRef.id,
        projectId,
        read: false,
        createdAt: serverTimestamp(),
        type: "assignment",
      });
    }

    return taskRef.id;
  };

  return { createTask };
}
