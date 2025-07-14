import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { createNotification } from "@/lib";
import { Project } from "@/types/project";
import { toast } from "react-toastify";

export const fetchProject = async (
  projectId: string
): Promise<Project | null> => {
  if (!projectId) {
    toast.error("ID do projeto inválido.");
    throw new Error("Invalid project ID");
  }

  const docRef = doc(db, "projects", projectId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    toast.error("Projeto não encontrado.");
    throw new Error("Project not found");
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    startDate:
      data.startDate instanceof Timestamp
        ? data.startDate.toDate()
        : data.startDate || new Date(),
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : data.createdAt || new Date(),
  } as Project;
};

export const deleteProject = async (
  project: Project,
  userId: string
): Promise<void> => {
  if (!project || !userId) {
    throw new Error("Projeto ou usuário inválido.");
  }

  const tasksQuery = query(
    collection(db, "tasks"),
    where("projectId", "==", project.id)
  );
  const tasksSnapshot = await getDocs(tasksQuery);
  const deleteTasksPromises = tasksSnapshot.docs.map((taskDoc) =>
    deleteDoc(taskDoc.ref)
  );
  await Promise.all(deleteTasksPromises);

  const members = project.members || [];
  const deleteNotifications = members
    .filter((uid: string) => uid !== userId)
    .map((uid: string) =>
      createNotification({
        userId: uid,
        message: `O projeto "${project.title}" foi excluído por ${auth.currentUser?.displayName || "Anonymous"}.`,
        taskId: "",
        projectId: project.id,
        type: "project_deleted",
      })
    );
  await Promise.all(deleteNotifications);

  await deleteDoc(doc(db, "projects", project.id));
  toast.success("Projeto excluído com sucesso.");
};
