"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { projectSchema } from "@/lib/zodSchemas";
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

  const [formState, setFormState] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(true);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setError("");

    if (!user) {
      setError("No user is logged in.");
      return;
    }

    const result = projectSchema.safeParse({
      ...formState,
      userId: user.uid,
      members,
    });

    if (!result.success) {
      const errors = result.error.format();
      const flatErrors: Record<string, string> = {};
      if (errors.title?._errors) flatErrors.title = errors.title._errors[0];
      if (errors.startDate?._errors)
        flatErrors.startDate = errors.startDate._errors[0];
      if (errors.endDate?._errors)
        flatErrors.endDate = errors.endDate._errors[0];
      if (errors.description?._errors)
        flatErrors.description = errors.description._errors[0];
      setValidationErrors(flatErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const projectRef = await addDoc(collection(db, "projects"), {
        title: formState.title.trim(),
        description: formState.description.trim(),
        startDate: new Date(formState.startDate),
        endDate: formState.endDate ? new Date(formState.endDate) : null,
        members,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      for (const memberId of members) {
        if (memberId !== user.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: memberId,
            message: `You have been added to the project "${formState.title.trim()}" by ${user.displayName || "Anonymous"}.`,
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
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              placeholder="Project Title"
              value={formState.title}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, title: e.target.value }))
              }
              disabled={isSubmitting}
            />
            {validationErrors.title && (
              <p className="text-red-500 text-sm">{validationErrors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description"
              value={formState.description}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              disabled={isSubmitting}
            />
            {validationErrors.description && (
              <p className="text-red-500 text-sm">
                {validationErrors.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formState.startDate}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, startDate: e.target.value }))
              }
              disabled={isSubmitting}
            />
            {validationErrors.startDate && (
              <p className="text-red-500 text-sm">
                {validationErrors.startDate}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date (Optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={formState.endDate}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, endDate: e.target.value }))
              }
              disabled={isSubmitting}
            />
            {validationErrors.endDate && (
              <p className="text-red-500 text-sm">{validationErrors.endDate}</p>
            )}
          </div>

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
