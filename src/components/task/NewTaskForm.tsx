/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useProjectAccess } from "@/features/projects/hooks/useProjectAccess";
import { useCreateTask } from "@/features/tasks/hooks/useCreateTask";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export default function NewTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const { user, userLoading, error, members } = useProjectAccess(projectId);
  const { createTask } = useCreateTask(projectId, user);

  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setValidationErrors({});
    setIsSubmitting(true);
    try {
      await createTask({ title, description, dueDate, assignee, priority });
      setOpen(false);
      setTimeout(() => router.push(`/dashboard/${projectId}`), 100);
    } catch (err: any) {
      if (err?.validationErrors) setValidationErrors(err.validationErrors);
      else setSubmitError(err?.message || "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && router.push(`/dashboard/${projectId}`)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {validationErrors.title && (
              <p className="text-red-500 text-sm">{validationErrors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {validationErrors.description && (
              <p className="text-red-500 text-sm">
                {validationErrors.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
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
              onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}
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

          {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
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
