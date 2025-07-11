export interface Comment {
  id: string;
  projectId: string;
  taskId?: string;
  userId: string;
  content: string;
  createdAt: Date;
}
