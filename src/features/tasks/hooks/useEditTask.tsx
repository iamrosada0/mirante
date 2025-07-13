// hooks/useEditTask.ts
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { createNotification } from "@/lib";
import { getFriendlyErrorMessage } from "@/lib/firebaseErrors";
import { Task } from "@/types/task";

interface ProjectData {
  title: string;
  members: string[];
}
interface UserData {
  displayName: string;
}

export function useEditTask(task: Task, setOpen: (open: boolean) => void) {
  const router = useRouter();

  const initialDueDate =
    task.dueDate instanceof Timestamp
      ? task.dueDate.toDate()
      : task.dueDate instanceof Date
        ? task.dueDate
        : null;

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(
    initialDueDate ? initialDueDate.toISOString().split("T")[0] : ""
  );
  const [assignee, setAssignee] = useState<string | null>(
    task.assignee || null
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    task.priority || "medium"
  );
  const [members, setMembers] = useState<
    { uid: string; displayName: string }[]
  >([]);
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [dueDateError, setDueDateError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUserLoading(true);
      setError("");

      if (!currentUser) {
        setError("No user is logged in. Redirecting to login...");
        setTimeout(() => router.push("/auth/login"), 2000);
        setUserLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (!userDoc.exists()) {
          await auth.signOut();
          setError("User not found in database. Please register.");
          setTimeout(() => router.push("/auth/register"), 2000);
          setUserLoading(false);
          return;
        }

        if (currentUser.uid !== task.createdBy) {
          setError("Only the task creator can edit this task.");
          setTimeout(() => setOpen(false), 2000);
          setUserLoading(false);
          return;
        }

        const projectDoc = await getDoc(doc(db, "projects", task.projectId));
        if (!projectDoc.exists()) {
          setError("Project not found.");
          setTimeout(() => setOpen(false), 2000);
          setUserLoading(false);
          return;
        }

        const data = projectDoc.data() as ProjectData;
        const memberUids = data.members || [];

        const memberData = await Promise.all(
          memberUids.map(async (uid) => {
            const userDoc = await getDoc(doc(db, "users", uid));
            return {
              uid,
              displayName: userDoc.exists()
                ? ((userDoc.data() as UserData).displayName ?? "Unknown")
                : "Unknown",
            };
          })
        );
        setMembers(memberData);
        setUser(currentUser);
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
        setTimeout(() => setOpen(false), 2000);
      } finally {
        setUserLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, setOpen, task]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setTitleError("");
      setDueDateError("");

      if (!title.trim()) {
        setTitleError("Task title is required.");
        return;
      }

      if (title.length > 100) {
        setTitleError("Task title must be 100 characters or less.");
        return;
      }

      if (description.length > 500) {
        setError("Description must be 500 characters or less.");
        return;
      }

      if (dueDate) {
        const due = new Date(dueDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (isNaN(due.getTime())) {
          setDueDateError("Invalid due date.");
          return;
        }
        if (due < now) {
          setDueDateError("Due date cannot be in the past.");
          return;
        }
      }

      if (!user) {
        setError("No user is logged in.");
        return;
      }

      setIsSubmitting(true);
      try {
        await updateDoc(doc(db, "tasks", task.id), {
          title: title.trim(),
          description: description.trim(),
          assignee: assignee || null,
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
          updatedAt: serverTimestamp(),
        });

        if (assignee) {
          const projectDoc = await getDoc(doc(db, "projects", task.projectId));
          const projectTitle = projectDoc.exists()
            ? projectDoc.data().title
            : "Unknown Project";

          await createNotification({
            userId: assignee,
            message: `Você foi atribuído à tarefa "${title.trim()}" no projeto "${projectTitle}".`,
            taskId: task.id,
            projectId: task.projectId,
            type: "assignment",
          });
        }

        setOpen(false);
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [title, description, dueDate, assignee, priority, user, task, setOpen]
  );

  const handleDelete = useCallback(async () => {
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
      const data = projectDoc.data() as ProjectData;
      const projectTitle = data?.title || "Unknown Project";

      const notifications = data.members
        .filter((id) => id !== user.uid)
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
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [user, task, setOpen]);

  return {
    title,
    description,
    dueDate,
    assignee,
    priority,
    members,
    error,
    titleError,
    dueDateError,
    userLoading,
    isSubmitting,
    setTitle,
    setDescription,
    setDueDate,
    setAssignee,
    setPriority,
    handleSubmit,
    handleDelete,
  };
}
