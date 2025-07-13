import { useState } from "react";

export function useTaskForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  return {
    formData: { title, description, dueDate, assignee, priority },
    setTitle,
    setDescription,
    setDueDate,
    setAssignee,
    setPriority,
  };
}
