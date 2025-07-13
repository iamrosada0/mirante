"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MemberCheckbox } from "./MemberCheckbox";
import { useNewProject } from "@/hooks/useNewProject";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function NewProjectForm() {
  const {
    user,
    userLoading,
    error,
    availableUsers,
    members,
    setMembers,
    setError,
  } = useNewProject();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [titleError, setTitleError] = useState("");
  const [dateError, setDateError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(true);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError("");
    setDateError("");
    setError("");

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err: unknown) {
      setError("Something went wrong while saving the project.");
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
          {/* Title */}
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              disabled={isSubmitting}
            />
          </div>

          {/* Start & End Date */}
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

          {/* Members */}
          <div className="space-y-2">
            <Label>Members</Label>
            <div className="space-y-2">
              {availableUsers.map((userOption) => (
                <MemberCheckbox
                  key={userOption.uid}
                  uid={userOption.uid}
                  displayName={userOption.displayName}
                  checked={members.includes(userOption.uid)}
                  onChange={() => {
                    if (userOption.uid === user?.uid) return;
                    setMembers((prev) =>
                      prev.includes(userOption.uid)
                        ? prev.filter((id) => id !== userOption.uid)
                        : [...prev, userOption.uid]
                    );
                  }}
                  disabled={userOption.uid === user?.uid || isSubmitting}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
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
