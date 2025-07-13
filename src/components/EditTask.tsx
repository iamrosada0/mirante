"use client";
import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  // getDocs,
} from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import { User, onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  // DialogTrigger,
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
import { Task } from "@/types/task";

interface EditTaskProps {
  task: Task;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const getFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    switch (code) {
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      default:
        return error.message || "An unexpected error occurred.";
    }
  }
  return "An unexpected error occurred.";
};

export function EditTask({ task, open, setOpen }: EditTaskProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.toISOString().split("T")[0] : ""
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

          const projectData = projectDoc.data();
          const memberUids = projectData.members || [];
          const memberPromises = memberUids.map(async (uid: string) => {
            const userDoc = await getDoc(doc(db, "users", uid));
            return {
              uid,
              displayName: userDoc.exists()
                ? userDoc.data().displayName
                : "Unknown",
            };
          });
          const membersData = await Promise.all(memberPromises);
          setMembers(membersData);

          setUser(currentUser);
        } catch (err: unknown) {
          setError(getFriendlyErrorMessage(err));
          setTimeout(() => setOpen(false), 2000);
        } finally {
          setUserLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [router, task, setOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (assignee && assignee !== task.assignee && assignee !== user.uid) {
        const projectDoc = await getDoc(doc(db, "projects", task.projectId));
        const projectTitle = projectDoc.exists()
          ? projectDoc.data().title
          : "Unknown Project";

        await addDoc(collection(db, "notifications"), {
          userId: assignee,
          message: `You have been assigned to task "${title.trim()}" in project "${projectTitle}" by ${user.displayName || "Anonymous"}.`,
          taskId: task.id,
          projectId: task.projectId,
          read: false,
          createdAt: serverTimestamp(),
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
  };

  const handleDelete = async () => {
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
        ? projectDoc.data().title
        : "Unknown Project";

      // Notify project members about deletion
      const projectData = projectDoc.data();
      const memberUids = projectData?.members || [];
      for (const memberId of memberUids) {
        if (memberId !== user.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: memberId,
            message: `Task "${task.title}" in project "${projectTitle}" was deleted by ${user.displayName || "Anonymous"}.`,
            taskId: task.id,
            projectId: task.projectId,
            read: false,
            createdAt: serverTimestamp(),
            type: "task_deleted",
          });
        }
      }

      await deleteDoc(doc(db, "tasks", task.id));
      setOpen(false);
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err));
      console.error("Error deleting task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  //DEPOIS DEVO VER ISSO (REMOVER OU MELHORAR)
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="Task Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
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
              onValueChange={setAssignee}
              value={assignee || "Unassigned"}
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
              disabled={isSubmitting}
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
