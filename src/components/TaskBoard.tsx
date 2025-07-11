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

interface TaskBoardProps {
  projectId: string;
}

export function TaskBoard({ projectId }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use a Firestore query to filter tasks by projectId on the server side
    const tasksQuery = query(
      collection(db, "tasks"),
      where("projectId", "==", projectId)
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        try {
          const taskData = snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as Task)
          );
          setTasks(taskData);
          setError(null);
        } catch (err) {
          console.error("Error processing Firestore snapshot:", err);
          setError("Failed to load tasks.");
        }
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setError("Failed to subscribe to tasks.");
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return; // No destination, nothing to do

    if (source.droppableId !== destination.droppableId) {
      const task = tasks.find((t) => t.id === draggableId);
      if (task) {
        try {
          await updateDoc(doc(db, "tasks", task.id), {
            status: destination.droppableId,
          });
        } catch (err) {
          console.error("Error updating task status:", err);
          setError("Failed to update task status.");
        }
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <Link href={`/dashboard/tasks/new?projectId=${projectId}`}>
          <Button>Add Task</Button>
        </Link>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
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
                    {tasks
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
                      ))}
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
