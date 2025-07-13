// hooks/useEditTask.ts
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { User, onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Task } from "@/types/task";

interface ProjectData {
  title: string;
  members: string[];
}

interface UserData {
  displayName: string;
}

const getFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    switch (code) {
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      case "permission-denied":
        return "You do not have permission to perform this action.";
      default:
        return error.message || "An unexpected error occurred.";
    }
  }
  return "An unexpected error occurred.";
};

export function useEditTask(task: Task, setOpen: (open: boolean) => void) {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [members, setMembers] = useState<
    { uid: string; displayName: string }[]
  >([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

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
          setError("User not found. Redirecting to register...");
          setTimeout(() => router.push("/auth/register"), 2000);
          return;
        }

        if (currentUser.uid !== task.createdBy) {
          setError("Only the task creator can edit this task.");
          setTimeout(() => setOpen(false), 2000);
          return;
        }

        const projectDoc = await getDoc(doc(db, "projects", task.projectId));
        if (!projectDoc.exists()) {
          setError("Project not found.");
          setTimeout(() => setOpen(false), 2000);
          return;
        }

        const projectData = projectDoc.data() as ProjectData;
        const memberUids = projectData.members || [];
        const memberData = await Promise.all(
          memberUids.map(async (uid) => {
            const memberDoc = await getDoc(doc(db, "users", uid));
            return {
              uid,
              displayName: memberDoc.exists()
                ? (memberDoc.data() as UserData).displayName || "Unknown"
                : "Unknown",
            };
          })
        );

        setUser(currentUser);
        setMembers(memberData);
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
        setTimeout(() => setOpen(false), 2000);
      } finally {
        setUserLoading(false);
      }
    });

    return () => unsubscribe();
  }, [task, router, setOpen]);

  const updateTask = useCallback(
    async (fields: Partial<Task>) => {
      if (!user) throw new Error("No user logged in");

      await updateDoc(doc(db, "tasks", task.id), {
        ...fields,
        updatedAt: serverTimestamp(),
      });
    },
    [task.id, user]
  );

  const deleteTask = useCallback(async () => {
    if (!user) throw new Error("No user logged in");

    const projectDoc = await getDoc(doc(db, "projects", task.projectId));
    const projectData = projectDoc.data() as ProjectData;
    const projectTitle = projectData?.title ?? "Unknown Project";

    await Promise.all(
      (projectData?.members || [])
        .filter((id) => id !== user.uid)
        .map((id) =>
          addDoc(collection(db, "notifications"), {
            userId: id,
            message: `Task "${task.title}" in project "${projectTitle}" was deleted by ${user.displayName || "Anonymous"}.`,
            taskId: task.id,
            projectId: task.projectId,
            read: false,
            createdAt: serverTimestamp(),
            type: "task_deleted",
          })
        )
    );

    await deleteDoc(doc(db, "tasks", task.id));
  }, [task, user]);

  return {
    user,
    members,
    error,
    isSubmitting,
    userLoading,
    setError,
    setIsSubmitting,
    updateTask,
    deleteTask,
  };
}
