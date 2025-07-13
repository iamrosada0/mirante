"use client";
import { useState, useEffect, useCallback } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp, // Make sure Timestamp is imported for type checks
} from "firebase/firestore";
import { User, onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// IMPORT THE SHARED TASK INTERFACE
import { Task } from "@/types/task"; // <--- THIS IS CRUCIAL
import { createNotification } from "@/lib";

// No need to define Task interface here, it's imported

interface EditTaskProps {
  task: Task; // Uses the imported Task interface
  open: boolean;
  setOpen: (open: boolean) => void;
}

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
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Invalid credentials. Please check your email and password.";
      default:
        return error.message || "An unexpected error occurred.";
    }
  }
  return "An unexpected error occurred.";
};

export function EditTask({ task, open, setOpen }: EditTaskProps) {
  // Robust initialization of dueDate:
  // 1. Check if task.dueDate exists.
  // 2. If it's a Firebase Timestamp, convert it to a Date.
  // 3. If it's already a Date, use it.
  // 4. If it's null/undefined, set initialDate to null.
  const initialDueDateObj: Date | null = task.dueDate
    ? task.dueDate instanceof Timestamp
      ? task.dueDate.toDate()
      : task.dueDate instanceof Date
        ? task.dueDate
        : null
    : null;

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState<string>(
    initialDueDateObj && !isNaN(initialDueDateObj.getTime())
      ? initialDueDateObj.toISOString().split("T")[0]
      : ""
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
  const [error, setError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [dueDateError, setDueDateError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const router = useRouter();

  // Debugging log for component mount/render
  useEffect(() => {
    console.log("EditTask component mounted/rendered. Dialog open:", open);
    console.log("Initial Task Data received:", task);
  }, [open, task]); // Added task to dependencies to re-log if task prop changes

  // Fetch user and project members
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser: User | null) => {
        setUserLoading(true);
        setError("");

        if (!currentUser) {
          setError("No user is logged in. Redirecting to login...");
          setTimeout(() => router.push("/auth/login"), 2000);
          setUserLoading(false);
          return;
        }

        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await auth.signOut();
            setError("User not found in database. Please register first.");
            setTimeout(() => router.push("/auth/register"), 2000);
            setUserLoading(false);
            return;
          }

          // Verify user is the creator
          if (currentUser.uid !== task.createdBy) {
            setError("Only the task creator can edit this task.");
            setTimeout(() => setOpen(false), 2000);
            setUserLoading(false);
            return;
          }

          // Fetch project members
          const projectDocRef = doc(db, "projects", task.projectId);
          const projectDoc = await getDoc(projectDocRef);
          if (!projectDoc.exists()) {
            setError("Project not found.");
            setTimeout(() => setOpen(false), 2000);
            setUserLoading(false);
            return;
          }

          const projectData = projectDoc.data() as ProjectData;
          const memberUids = projectData.members || [];
          const memberPromises = memberUids.map(async (uid: string) => {
            const userMemberDoc = await getDoc(doc(db, "users", uid));
            return {
              uid,
              displayName: userMemberDoc.exists()
                ? ((userMemberDoc.data() as UserData).displayName ?? "Unknown")
                : "Unknown",
            };
          });
          const membersData = await Promise.all(memberPromises);
          setMembers(membersData);

          setUser(currentUser);
        } catch (err: unknown) {
          setError(getFriendlyErrorMessage(err));
          console.error("Error fetching data for EditTask:", err);
          setTimeout(() => setOpen(false), 2000);
        } finally {
          setUserLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [router, task.createdBy, task.projectId, setOpen, task]); // Added 'task' to dependencies

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setTitleError("");
      setDueDateError("");

      // Validate inputs
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
        now.setHours(0, 0, 0, 0); // Zero out time for comparison

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

        // Notify assignee if changed
        //  if (assignee && assignee !== task.assignee && assignee !== user.uid) {
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
      } catch (err: unknown) {
        setError(getFriendlyErrorMessage(err));
        console.error("Error updating task:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      title,
      description,
      dueDate,
      assignee,
      priority,
      user,
      task.assignee,
      task.id,
      task.projectId,
      setOpen,
    ]
  );

  // Handle task deletion
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
      const projectTitle = projectDoc.exists()
        ? (projectDoc.data() as ProjectData).title
        : "Unknown Project";
      const projectData = projectDoc.data() as ProjectData;

      // Notify project members about deletion
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
      console.error("Error deleting task:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, task.createdBy, task.id, task.projectId, task.title, setOpen]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="ml-2">Loading user and project data...</p>
      </div>
    );
  }

  // Only show full-screen error if the dialog is not open or user is loading
  // Otherwise, errors within the form are displayed.
  if (error && (!open || userLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-center text-lg p-4">{error}</p>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-[425px] p-6"
        data-dnd-ignore="true" // <--- ADD THIS ATTRIBUTE HERE
      >
        <DialogHeader>
          <DialogTitle>Edit Task: {task.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="Task Title"
              value={title}
              onChange={(e) => {
                console.log("Title input:", e.target.value); // Debug input
                setTitle(e.target.value);
              }}
              aria-invalid={!!titleError}
              aria-describedby={titleError ? "title-error" : undefined}
              disabled={isSubmitting}
            />
            {titleError && (
              <p id="title-error" className="text-red-500 text-sm">
                {titleError}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description"
              value={description}
              onChange={(e) => {
                console.log("Description input:", e.target.value); // Debug input
                setDescription(e.target.value);
              }}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => {
                console.log("Due date input:", e.target.value); // Debug input
                setDueDate(e.target.value);
              }}
              disabled={isSubmitting}
            />
            {dueDateError && (
              <p id="dueDate-error" className="text-red-500 text-sm">
                {dueDateError}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Select
              onValueChange={(value) =>
                setAssignee(value === "Unassigned" ? null : value)
              }
              value={assignee || "Unassigned"}
              disabled={isSubmitting} // Disable during submission
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unassigned">Unassigned</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.uid} value={member.uid}>
                    {member.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              onValueChange={(value: "low" | "medium" | "high") =>
                setPriority(value)
              }
              value={priority}
              disabled={isSubmitting} // Disable during submission
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting || user?.uid !== task.createdBy} // Disable delete if not creator or submitting
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Task"
              )}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
