// components/EditTask.tsx
"use client";

import { useEditTask } from "@/hooks/useEditTask";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Task } from "@/types/task";

interface EditTaskProps {
  task: Task;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function EditTask({ task, open, setOpen }: EditTaskProps) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    dueDate,
    setDueDate,
    assignee,
    setAssignee,
    priority,
    setPriority,
    members,
    titleError,
    dueDateError,
    error,
    isSubmitting,
    userLoading,
    handleSubmit,
    handleDelete,
  } = useEditTask(task, setOpen);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="ml-2">Loading user and project data...</p>
      </div>
    );
  }

  if (error && !open) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-center text-lg p-4">{error}</p>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px] p-6" data-dnd-ignore="true">
        <DialogHeader>
          <DialogTitle>Edit Task: {task.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
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
              onValueChange={(value) =>
                setAssignee(value === "Unassigned" ? null : value)
              }
              value={assignee || "Unassigned"}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
