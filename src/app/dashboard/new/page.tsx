"use client";
import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// Map Firebase error codes to user-friendly messages
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

export default function NewProject() {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<
    { uid: string; displayName: string }[]
  >([]);
  const [error, setError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [dateError, setDateError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const router = useRouter();

  // Fetch available users and verify logged-in user
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
          setMembers([currentUser.uid]); // Automatically add the creator to members

          // Fetch all users for member selection
          const usersSnapshot = await getDocs(collection(db, "users"));
          const usersData = usersSnapshot.docs.map((doc) => ({
            uid: doc.id,
            displayName: doc.data().displayName || "Unknown",
          }));
          setAvailableUsers(usersData);
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

  // Validate and submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTitleError("");
    setDateError("");

    // Validate inputs
    if (!title.trim()) {
      setTitleError("Project title is required.");
      return;
    }
    if (title.length > 100) {
      setTitleError("Project title must be 100 characters or less.");
      return;
    }
    if (description.length > 500) {
      setError("Description must be 500 characters or less.");
      return;
    }
    if (!startDate) {
      setDateError("Start date is required.");
      return;
    }
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      setDateError("Invalid start date.");
      return;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        setDateError("Invalid end date.");
        return;
      }
      if (end < start) {
        setDateError("End date cannot be before start date.");
        return;
      }
    }

    if (!user) {
      setError("No user is logged in.");
      return;
    }

    setIsSubmitting(true);
    try {
      const projectRef = await addDoc(collection(db, "projects"), {
        title: title.trim(),
        description: description.trim(),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        members,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      // Notify all members except the creator
      for (const memberId of members) {
        if (memberId !== user.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: memberId,
            message: `You have been added to the project "${title.trim()}" by ${user.displayName || "Anonymous"}.`,
            projectId: projectRef.id,
            taskId: null,
            read: false,
            createdAt: serverTimestamp(),
            type: "project_member_added",
          });
        }
      }

      setOpen(false);
      setTimeout(() => router.push("/dashboard"), 100);
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle member selection
  const handleMemberChange = (uid: string) => {
    if (uid === user?.uid) return; // Prevent removing the creator
    setMembers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
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
        !open && setTimeout(() => router.push("/dashboard"), 100)
      }
    >
      <DialogTrigger asChild>
        <Button className="hidden">Create Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              placeholder="Project Title"
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
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date (Optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isSubmitting}
            />
            {dateError && (
              <p id="date-error" className="text-red-500 text-sm">
                {dateError}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Members</Label>
            <div className="space-y-2">
              {availableUsers.map((availableUser) => (
                <div
                  key={availableUser.uid}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    id={availableUser.uid}
                    checked={members.includes(availableUser.uid)}
                    onChange={() => handleMemberChange(availableUser.uid)}
                    disabled={availableUser.uid === user?.uid || isSubmitting}
                  />
                  <Label htmlFor={availableUser.uid}>
                    {availableUser.displayName}
                  </Label>
                </div>
              ))}
            </div>
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
