"use client";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task } from "@/types/task";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface DroppableColumnProps {
  status: string;
  tasks: Task[];
  children: React.ReactNode;
}

export function DroppableColumn({
  status,
  tasks,
  children,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  useEffect(() => {
    if (isOver) {
      console.log(`Task is being dragged over column: ${status}`);
    }
  }, [isOver, status]);

  return (
    <Card
      ref={setNodeRef}
      className={`bg-white shadow-xl rounded-lg flex flex-col ${isOver ? "bg-blue-50" : ""}`}
    >
      <CardHeader className="border-b border-gray-200 pb-4 mb-4 bg-gray-50 rounded-t-lg">
        <CardTitle className="text-xl font-bold text-gray-700 flex items-center justify-between">
          {status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, " ")}
          <span className="ml-2 text-gray-500 text-sm font-normal px-2 py-1 bg-gray-100 rounded-full">
            {tasks.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-[650px] p-4 flex-grow">
        <SortableContext
          items={tasks.map((task) => {
            console.log(`Task ID for ${status} column: ${task.id}`);
            return task.id;
          })}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-gray-500 italic">
              No tasks in this column. Drag and drop here!
            </p>
          ) : (
            children
          )}
        </SortableContext>
      </CardContent>
    </Card>
  );
}
