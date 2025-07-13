"use client";
import { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { CardContent } from "@/components/ui/card";
import { Task } from "@/types/task";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditTask } from "../update/EditTask";
import { TaskAssignee } from "../TaskAssignee";

interface DraggableTaskProps {
  task: Task;
}

export function DraggableTask({ task }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: transform ? 10 : 0,
    boxShadow: transform
      ? "0 4px 8px rgba(0, 0, 0, 0.15)"
      : "0 1px 3px rgba(0, 0, 0, 0.05)",
    backgroundColor: "white",
    borderRadius: "0.5rem",
    cursor: "grab",
    opacity: transform ? 0.8 : 1,
  };

  const handleAction = async (action: string) => {
    if (action === "edit") {
      setEditOpen(true);
    } else if (action === "delete") {
      if (currentUserId !== task.createdBy) {
        console.error("Only the task creator can delete this task.");
        return;
      }
      try {
        const projectDoc = await getDoc(doc(db, "projects", task.projectId));
        const projectTitle = projectDoc.exists()
          ? projectDoc.data().title
          : "Unknown Project";
        const projectData = projectDoc.data();
        const memberUids = projectData?.members || [];

        for (const memberId of memberUids) {
          if (memberId !== currentUserId) {
            await addDoc(collection(db, "notifications"), {
              userId: memberId,
              message: `Task "${task.title}" in project "${projectTitle}" was deleted by ${auth.currentUser?.displayName || "Anonymous"}.`,
              taskId: task.id,
              projectId: task.projectId,
              read: false,
              createdAt: serverTimestamp(),
              type: "task_deleted",
            });
          }
        }

        await deleteDoc(doc(db, "tasks", task.id));
      } catch (err: unknown) {
        console.error("Error deleting task:", err);
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-all duration-200"
    >
      <CardContent className="p-0">
        <div className="flex justify-between items-center mb-2">
          <p className="font-medium text-gray-800 text-base">{task.title}</p>
          {currentUserId && currentUserId === task.createdBy && (
            <Select onValueChange={handleAction}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edit">Edit</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="text-sm text-muted-foreground text-gray-600 mt-1">
          {task.description || "No description provided."}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Assignee: {task.assignee || "Unassigned"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Priority: {task.priority || "Medium"}
        </p>
        {task.dueDate instanceof Date && (
          <p className="text-sm text-muted-foreground mt-1">
            Due: {task.dueDate.toLocaleDateString()}
          </p>
        )}
        <TaskAssignee
          taskId={task.id}
          projectId={task.projectId}
          taskTitle={task.title}
          currentAssignee={task?.assignee}
        />
      </CardContent>
      {currentUserId && currentUserId === task.createdBy && (
        <EditTask task={task} open={editOpen} setOpen={setEditOpen} />
      )}
    </div>
  );
}
