"use client";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
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

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const taskData = snapshot.docs
        .filter((doc) => doc.data().projectId === projectId)
        .map((doc) => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(taskData);
    });
    return () => unsubscribe();
  }, [projectId]);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId !== destination.droppableId) {
      const task = tasks.find((t) => t.id === draggableId);
      if (task) {
        await updateDoc(doc(db, "tasks", task.id), {
          status: destination.droppableId,
        });
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
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["pending", "in-progress", "completed"].map((status) => (
            <Droppable key={status} droppableId={status}>
              {(provided) => (
                <Card {...provided.droppableProps} ref={provided.innerRef}>
                  <CardHeader>
                    <CardTitle>{status.charAt(0).toUpperCase() + status.slice(1)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tasks
                      .filter((task) => task.status === status)
                      .map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-2"
                            >
                              <CardContent>
                                <p>{task.title}</p>
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              ))}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}