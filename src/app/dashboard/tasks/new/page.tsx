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
  const [error, setError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProjectId = searchParams.get("projectId");
  const projectId = propProjectId || queryProjectId;

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
          setUser(currentUser);
        } catch (err: unknown) {
          setError(getFriendlyErrorMessage(err));
          setTimeout(() => router.push("/auth/login"), 2000);
        } finally {
          setUserLoading(false);
        }
      }
    );
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTitleError("");
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
      console.log("Saving task with projectId:", projectId); // Debug log
      await addDoc(collection(db, "tasks"), {
        title: title.trim(),
        description: description.trim(),
        projectId,
        status: "pending",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
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
