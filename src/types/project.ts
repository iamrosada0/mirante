export type ProjectMemberRole = "owner" | "admin" | "viewer";

export interface ProjectMember {
  uid: string; // Firebase UID
  role: ProjectMemberRole;
}
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  assigneeUid?: string;
  dueDate?: string; // ISO
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  members: ProjectMember[];
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}
