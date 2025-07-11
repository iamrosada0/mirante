// src/types/project.ts
export interface Project {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  members: string[];
  createdBy: string;
  createdAt: Date;
}
