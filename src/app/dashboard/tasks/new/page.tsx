"use client";
import { useState, useEffect } from "react";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import { User, onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface NewTaskProps {
  projectId?: string;
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

export default function NewTask({
  projectId: propProjectId,
}: NewTaskProps = {}) {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
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
  const searchParams = useSearchParams();
  const queryProjectId = searchParams.get("projectId");
  const projectId = propProjectId || queryProjectId;

  // Fetch user, project, and members
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
          // Verify user exists in Firestore
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await auth.signOut();
            setError("User not found in database. Please register first.");
            setTimeout(() => router.push("/auth/register"), 2000);
            setUserLoading(false);
            return;
          }

          // Verify project exists and user is a member
          if (!projectId) {
            setError("No project ID provided. Redirecting to dashboard...");
            setTimeout(() => router.push("/dashboard"), 2000);
            setUserLoading(false);
            return;
          }

          const projectDocRef = doc(db, "projects", projectId);
          const projectDoc = await getDoc(projectDocRef);
          if (!projectDoc.exists()) {
            setError("Project not found. Redirecting to dashboard...");
            setTimeout(() => router.push("/dashboard"), 2000);
            setUserLoading(false);
            return;
          }

          const projectData = projectDoc.data();
          if (!projectData.members.includes(currentUser.uid)) {
            setError("You are not a member of this project.");
            setTimeout(() => router.push("/dashboard"), 2000);
            setUserLoading(false);
            return;
          }

          // Fetch project members
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
          setTimeout(() => router.push("/dashboard"), 2000);
        } finally {
          setUserLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [router, projectId]);

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
    if (!projectId) {
      setError("Invalid project ID. Please select a project.");
      return;
    }
    if (!user) {
      setError("No user is logged in.");
      return;
    }

    setIsSubmitting(true);
    try {
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

      // Notify assignee if assigned
      if (assignee) {
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        const projectTitle = projectDoc.exists()
          ? projectDoc.data().title
          : "Unknown Project";

        await addDoc(collection(db, "notifications"), {
          userId: assignee,
          message: `You have been assigned to task "${title.trim()}" in project "${projectTitle}" by ${user.displayName || "Anonymous"}.`,
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
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
    <Dialog
      open={open}
      onOpenChange={(open) =>
        !open && setTimeout(() => router.push(`/dashboard/${projectId}`), 100)
      }
    >
      <DialogTrigger asChild>
        <Button className="hidden">Add Task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
