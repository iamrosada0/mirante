import { useState, useCallback } from "react";
import {
  doc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { Task } from "@/types/task";
import { User } from "firebase/auth";

interface TaskData {
  title: string;
  description: string;
  dueDate: string;
  assignee: string | null;
  priority: "low" | "medium" | "high";
}

interface ProjectData {
  title: string;
  members: string[];
}

export function useTaskActions(task: Task, setOpen: (open: boolean) => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (data: TaskData, user: User | null) => {
      if (!user) {
        setError("No user is logged in.");
        return;
      }

      setIsSubmitting(true);
      try {
        await updateDoc(doc(db, "tasks", task.id), {
          title: data.title.trim(),
          description: data.description.trim(),
          assignee: data.assignee || null,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          updatedAt: serverTimestamp(),
        });

        if (
          data.assignee &&
          data.assignee !== task.assignee &&
          data.assignee !== user.uid
        ) {
          const projectDoc = await getDoc(doc(db, "projects", task.projectId));
          const projectTitle = projectDoc.exists()
            ? projectDoc.data().title
            : "Unknown Project";
          await createNotification({
            userId: data.assignee,
            message: `Você foi atribuído à tarefa "${data.title.trim()}" no projeto "${projectTitle}".`,
            taskId: task.id,
            projectId: task.projectId,
            type: "assignment",
          });
        }

        setOpen(false);
      } catch (err: unknown) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [task.id, task.assignee, task.projectId, setOpen]
  );

  const handleDelete = useCallback(
    async (user: User | null) => {
      if (!user) {
        setError("No user is logged in.");
        return;
      }

      if (user.uid !== task.createdBy) {
        setError("Only the task creator can delete this task.");
        return;
      }

      setIsSubmitting(true);
      try {
        const projectDoc = await getDoc(doc(db, "projects", task.projectId));
        const projectTitle = projectDoc.exists()
          ? (projectDoc.data() as ProjectData).title
          : "Unknown Project";
        const projectData = projectDoc.data() as ProjectData;

        const memberUids = projectData?.members || [];
        const notifications = memberUids
          .filter((memberId) => memberId !== user.uid)
          .map((memberId) =>
            addDoc(collection(db, "notifications"), {
              userId: memberId,
              message: `Task "${task.title}" in project "${projectTitle}" was deleted by ${user.displayName || "Anonymous"}.`,
              taskId: task.id,
              projectId: task.projectId,
              read: false,
              createdAt: serverTimestamp(),
              type: "task_deleted",
            })
          );

        await Promise.all(notifications);
        await deleteDoc(doc(db, "tasks", task.id));
        setOpen(false);
      } catch (err: unknown) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [task.createdBy, task.id, task.projectId, task.title, setOpen]
  );

  return { handleSubmit, handleDelete, isSubmitting, error };
}
