"use client";
import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  DndContext,
  closestCorners,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Notifications } from "@/components/Notifications";
import { DraggableTask } from "./DraggableTask";
import { DroppableColumn } from "./DroppableColumn";

interface TaskBoardProps {
  projectId: string;
}

export default function TaskBoard({ projectId }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
    filter: (event: { target: HTMLElement }) => {
      let target: HTMLElement | null = event.target as HTMLElement;
      while (target && target !== document.body) {
        if (target.hasAttribute("data-dnd-ignore")) {
          console.log(
            "Dnd-kit ignoring event due to data-dnd-ignore attribute:",
            target
          );
          return false;
        }
        target = target.parentElement;
      }
      return true;
    },
  });

  const sensors = useSensors(pointerSensor, useSensor(KeyboardSensor));

  useEffect(() => {
    if (!projectId) {
      setError("Invalid project ID provided.");
      setIsLoading(false);
      return;
    }

    const tasksQuery = query(
      collection(db, "tasks"),
      where("projectId", "==", projectId)
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        try {
          const taskData = snapshot.docs.map((doc) => {
            const data = doc.data();
            console.log(`Task fetched: ID=${doc.id}, Status=${data.status}`);
            return {
              id: doc.id,
              title: data.title || "Untitled Task",
              description: data.description || "",
              status: data.status || "pending",
              projectId: data.projectId || "",
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt.toDate()
                  : data.createdAt || new Date(),
              createdBy: data.createdBy || "",
              assignee: data.assignee || null,
              priority: data.priority || "medium",
              dueDate:
                data.dueDate instanceof Timestamp
                  ? data.dueDate.toDate()
                  : null,
            } as Task;
          });
          setTasks(taskData);
          console.log(
            `Updated tasks state: ${taskData.length} tasks for project ${projectId}`
          );
          setError(null);
        } catch (err: unknown) {
          console.error("Error processing Firestore snapshot:", err);
          setError("Failed to load tasks. Please try again.");
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setError(
          "Failed to subscribe to task updates. Please check your connection."
        );
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      console.log("No valid drop target (over is null).");
      return;
    }

    const activeTaskId = String(active.id);
    const newStatus = String(over.id) as
      | "pending"
      | "in-progress"
      | "completed";

    const validStatuses = ["pending", "in-progress", "completed"] as const;
    if (!validStatuses.includes(newStatus)) {
      console.warn(
        `Invalid drop target ID: ${newStatus}. Valid statuses: ${validStatuses}`
      );
      return;
    }

    const taskBeingDragged = tasks.find((task) => task.id === activeTaskId);
    if (!taskBeingDragged) {
      console.warn(`Task with ID ${activeTaskId} not found in tasks state.`);
      return;
    }

    console.log(
      `Dragging task "${taskBeingDragged.title}" (ID: ${activeTaskId}) from "${taskBeingDragged.status}" to "${newStatus}"`
    );

    if (taskBeingDragged.status === newStatus) {
      console.log("Task dropped in its current column. No update needed.");
      return;
    }

    try {
      const taskRef = doc(db, "tasks", activeTaskId);
      await updateDoc(taskRef, { status: newStatus });
      console.log(
        `Successfully updated task ${activeTaskId} to status: ${newStatus}`
      );

      // Update local state immediately to reflect the change
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === activeTaskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (err: unknown) {
      console.error("Error updating task status:", err);
      setError(
        err instanceof Error
          ? `Failed to update task: ${err.message}`
          : "Failed to update task status. Please try again."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <p className="mt-4 text-lg text-gray-700">Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50">
        <p className="text-xl font-semibold text-red-700">{error}</p>
        <p className="mt-2 text-red-600">
          Please refresh the page or contact support.
        </p>
      </div>
    );
  }

  const statuses = ["pending", "in-progress", "completed"] as const;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Notifications />
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-800">Project Tasks</h2>
        <Link href={`/dashboard/tasks/new?projectId=${projectId}`}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
            Add New Task
          </Button>
        </Link>
      </div>

      <DndContext
        collisionDetection={closestCorners}
        onDragEnd={onDragEnd}
        sensors={sensors}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statuses.map((status) => {
            const columnTasks = tasks.filter((task) => task.status === status);
            return (
              <DroppableColumn key={status} status={status} tasks={columnTasks}>
                {columnTasks.map((task) => (
                  <DraggableTask key={task.id} task={task} />
                ))}
              </DroppableColumn>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
