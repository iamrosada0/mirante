import { Timestamp } from "firebase/firestore";

export interface Task {
  id: string;
  title: string;
  description?: string; // Optional
  dueDate?: Date | Timestamp | null; // Optional, can be Date, Timestamp, or null
  assignee?: string | null; // Optional, can be string or null
  priority?: "low" | "medium" | "high"; // Optional
  status: "pending" | "in-progress" | "completed"; // Assuming these are fixed statuses
  projectId: string;
  createdAt: Date | Timestamp; // Can be Date or Timestamp
  createdBy: string; // Made strictly string as it should always be present for a created task
}

// You might also consider a more flexible interface for data directly from Firestore
// before conversion, if you need to handle undefined fields explicitly
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
