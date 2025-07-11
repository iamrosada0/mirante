"use client";
import { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface TaskBoardProps {
  projectId: string;
}

export default function TaskBoard({ projectId }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Novo estado para carregamento

  useEffect(() => {
    if (!projectId) {
      setError("Invalid project ID.");
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
            return {
              id: doc.id,
              title: data.title || "",
              description: data.description || "",
              status: data.status || "pending",
              projectId: data.projectId || "",
              createdAt: data.createdAt?.toDate
                ? data.createdAt.toDate()
                : data.createdAt || new Date(),
            } as Task;
          });
          setTasks(taskData);
          console.log("Fetched tasks:", taskData);
          setError(null);
        } catch (err: unknown) {
          console.error("Error processing Firestore snapshot:", err);
          setError("Failed to load tasks.");
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setError("Failed to subscribe to tasks.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (source.droppableId !== destination.droppableId) {
      const task = tasks.find((t) => t.id === draggableId);
      if (task) {
        try {
          await updateDoc(doc(db, "tasks", task.id), {
            status: destination.droppableId,
          });
        } catch (err: unknown) {
          console.error("Error updating task status:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Failed to update task status. Please try again."
          );
        }
      }
    }
  };

  if (isLoading) {
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <Link href={`/dashboard/tasks/new?projectId=${projectId}`}>
          <Button>Add Task</Button>
        </Link>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["pending", "in-progress", "completed"].map((status) => (
            <Droppable key={status} droppableId={status}>
              {(provided) => (
                <Card
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="min-h-[200px]"
                >
                  <CardHeader>
                    <CardTitle>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tasks.filter((task) => task.status === status).length ===
                    0 ? (
                      <p className="text-muted-foreground text-sm">
                        No tasks in this column.
                      </p>
                    ) : (
                      tasks
                        .filter((task) => task.status === status)
                        .map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="mb-2 p-4"
                              >
                                <CardContent className="p-0">
                                  <p className="font-medium">{task.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {task.description || "No description"}
                                  </p>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))
                    )}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
