"use client";
import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure this path is correct for your Firebase config
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task } from "@/types/task"; // Ensure this path is correct for your Task type definition
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  DndContext,
  closestCorners, // Changed from closestCenter to closestCorners for better droppable detection
  DragEndEvent,
  useDroppable, // <--- NEW: Import useDroppable
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskBoardProps {
  projectId: string;
}

/**
 * DraggableTask Component
 * Represents an individual task card that can be dragged.
 */
interface DraggableTaskProps {
  task: Task;
}

function DraggableTask({ task }: DraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id }); // The ID for dnd-kit should be unique for the draggable item

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    boxShadow: isDragging
      ? "0 4px 8px rgba(0, 0, 0, 0.15)"
      : "0 1px 3px rgba(0, 0, 0, 0.05)",
    backgroundColor: "white",
    borderRadius: "0.5rem",
    cursor: "grab",
    opacity: isDragging ? 0.8 : 1,
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
        <p className="font-medium text-gray-800 text-base">{task.title}</p>
        <p className="text-sm text-muted-foreground text-gray-600 mt-1">
          {task.description || "No description provided."}
        </p>
      </CardContent>
    </div>
  );
}

/**
 * DroppableColumn Component
 * Represents a Kanban column (pending, in-progress, completed) that tasks can be dropped into.
 */
interface DroppableColumnProps {
  status: string;
  tasks: Task[];
  children: React.ReactNode;
}

function DroppableColumn({ status, tasks, children }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status, // This is the ID of the droppable area (the column's status)
  });

  return (
    <Card
      ref={setNodeRef}
      className="bg-white shadow-xl rounded-lg flex flex-col"
    >
      <CardHeader className="border-b border-gray-200 pb-4 mb-4 bg-gray-50 rounded-t-lg">
        <CardTitle className="text-xl font-bold text-gray-700 flex items-center justify-between">
          {status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, " ")}
          <span className="ml-2 text-gray-500 text-sm font-normal px-2 py-1 bg-gray-100 rounded-full">
            {tasks.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-[150px] p-4 flex-grow">
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-gray-500 italic">
              No tasks in this column. Drag and drop here!
            </p>
          ) : (
            children // Render the DraggableTask components passed as children
          )}
        </SortableContext>
      </CardContent>
    </Card>
  );
}

/**
 * TaskBoard Component
 * Displays a Kanban-style board for tasks associated with a project.
 * Allows dragging tasks between status columns.
 */
export default function TaskBoard({ projectId }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Effect to fetch tasks from Firestore
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

    // Set up real-time listener for tasks
    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        try {
          const taskData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || "Untitled Task",
              description: data.description || "",
              status: data.status || "pending", // Default status if not present
              projectId: data.projectId || "",
              createdAt: data.createdAt?.toDate
                ? data.createdAt.toDate()
                : data.createdAt || new Date(),
            } as Task;
          });
          setTasks(taskData);
          console.log(
            "Fetched tasks for project:",
            projectId,
            taskData.length,
            "tasks"
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

  // Handler for when a drag operation ends
  // const onDragEnd = async (event: DragEndEvent) => {
  //   const { active, over } = event;

  //   if (!over) {
  //     console.log("Task dropped outside any valid column.");
  //     return;
  //   }

  //   const activeTaskId = String(active.id);
  //   // CRITICAL: Ensure `over.id` refers to the column's status, not a task ID.
  //   // By using `useDroppable` on the column, `over.id` will correctly be the column's ID.
  //   const newStatus = String(over.id);

  //   const taskBeingDragged = tasks.find((task) => task.id === activeTaskId);

  //   if (taskBeingDragged) {
  //     if (taskBeingDragged.status !== newStatus) {
  //       console.log(
  //         `Attempting to move task "${taskBeingDragged.title}" (ID: ${activeTaskId}) from "${taskBeingDragged.status}" to "${newStatus}"`
  //       );
  //       try {
  //         await updateDoc(doc(db, "tasks", taskBeingDragged.id), {
  //           status: newStatus,
  //         });
  //         console.log(
  //           `Successfully updated task ID ${activeTaskId} to status: ${newStatus}`
  //         );
  //       } catch (err: unknown) {
  //         console.error("Error updating task status in Firestore:", err);
  //         setError(
  //           err instanceof Error
  //             ? `Failed to update task status: ${err.message}`
  //             : "Failed to update task status. Please try again."
  //         );
  //       }
  //     } else {
  //       console.log(
  //         `Task "${taskBeingDragged.title}" dropped within its original column (${newStatus}). No status change.`
  //       );
  //     }
  //   } else {
  //     console.warn(
  //       `Dragged task with ID ${activeTaskId} not found in the current state. This might indicate a data sync issue.`
  //     );
  //   }
  // };
  // ... (inside TaskBoard component)

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      console.log("Task dropped outside any valid column.");
      return;
    }

    const activeTaskId = String(active.id);
    const newStatus = String(over.id);

    // Define your valid statuses
    const validStatuses = ["pending", "in-progress", "completed"];

    // *** NEW: Check if the newStatus is a valid column status ***
    if (!validStatuses.includes(newStatus)) {
      console.warn(
        `Dropped on an invalid target ID: ${newStatus}. Not updating task status.`
      );
      return; // Exit if the target is not a recognized column
    }

    const taskBeingDragged = tasks.find((task) => task.id === activeTaskId);

    if (taskBeingDragged) {
      if (taskBeingDragged.status !== newStatus) {
        console.log(
          `Attempting to move task "${taskBeingDragged.title}" (ID: ${activeTaskId}) from "${taskBeingDragged.status}" to "${newStatus}"`
        );
        try {
          await updateDoc(doc(db, "tasks", taskBeingDragged.id), {
            status: newStatus,
          });
          console.log(
            `Successfully updated task ID ${activeTaskId} to status: ${newStatus}`
          );
        } catch (err: unknown) {
          console.error("Error updating task status in Firestore:", err);
          setError(
            err instanceof Error
              ? `Failed to update task status: ${err.message}`
              : "Failed to update task status. Please try again."
          );
        }
      } else {
        console.log(
          `Task "${taskBeingDragged.title}" dropped within its original column (${newStatus}). No status change.`
        );
      }
    } else {
      console.warn(
        `Dragged task with ID ${activeTaskId} not found in the current state. This might indicate a data sync issue.`
      );
    }
  };
  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
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

  const statuses = ["pending", "in-progress", "completed"];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-800">Project Tasks</h2>
        <Link href={`/dashboard/tasks/new?projectId=${projectId}`}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
            Add New Task
          </Button>
        </Link>
      </div>
      <DndContext collisionDetection={closestCorners} onDragEnd={onDragEnd}>
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
