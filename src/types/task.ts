import { Timestamp } from "firebase/firestore";

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date | Timestamp | null;
  assignee?: string | null;
  priority?: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed";
  projectId: string;
  createdAt: Date | Timestamp;
  createdBy: string;
}

export interface FirestoreTaskData {
  title?: string;
  description?: string;
  dueDate?: Timestamp | null;
  assignee?: string | null;
  priority?: "low" | "medium" | "high";
  status?: "pending" | "in-progress" | "completed";
  projectId?: string;
  createdAt?: Timestamp;
  createdBy?: string;
}
