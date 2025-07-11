import {
  addDoc,
  collection,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const createProject = async (project: {
  title: string;
  description: string;
  startDate: Date;
  members: string[];
  createdBy: string;
}) => {
  return await addDoc(collection(db, "projects"), {
    ...project,
    createdAt: new Date(),
  });
};

export const updateProject = async (id: string, updates: Partial<unknown>) => {
  await updateDoc(doc(db, "projects", id), updates);
};

export const deleteProject = async (id: string) => {
  await deleteDoc(doc(db, "projects", id));
};

export const createTask = async (task: {
  projectId: string;
  title: string;
  description: string;
  assignee: string;
  status: string;
  priority: number;
}) => {
  return await addDoc(collection(db, "tasks"), {
    ...task,
    createdAt: new Date(),
  });
};

export const updateTask = async (id: string, updates: Partial<unknown>) => {
  await updateDoc(doc(db, "tasks", id), updates);
};
