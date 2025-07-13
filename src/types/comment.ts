import { Timestamp } from "firebase/firestore";

export interface Comment {
  id: string;
  content: string;
  createdBy: string;
  createdAt: Date | Timestamp;
  projectId: string;
  taskId?: string;
  authorName?: string; // Adicionado para exibir o nome do autor
}
