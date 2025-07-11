export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignee: string;
  status: "pending" | "in-progress" | "completed" | "delayed";
  dueDate?: Date;
  priority: number;
}
