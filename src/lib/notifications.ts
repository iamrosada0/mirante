import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { serverTimestamp } from "firebase/firestore";

interface NotificationData {
  userId: string;
  message: string;
  taskId: string;
  projectId: string;
  type: "assignment" | "comment" | "dueDate" | "project_deleted";
}

export async function createNotification(data: NotificationData) {
  try {
    await addDoc(collection(db, "notifications"), {
      ...data,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}
