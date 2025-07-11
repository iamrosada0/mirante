export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in-progress" | "completed";
  projectId: string;
  createdAt: Date;
  createdBy?: string;
  assignee?: string; // Tornar opcional
  priority?: string; // Tornar opcional (ou o tipo correto, ex.: "low" | "medium" | "high")
}
