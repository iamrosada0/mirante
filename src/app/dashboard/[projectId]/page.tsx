/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import TaskBoard from "@/components/TaskBoard";
import { CommentSection } from "@/components/CommentSection";
import { Notifications } from "@/components/Notifications";
import { EditProject } from "@/components/EditProject";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { Project } from "@/types/project";
import { use } from "react";
import { createNotification } from "@/lib";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setError("ID do projeto inválido.");
        toast.error("ID do projeto inválido.");
        setTimeout(() => router.push("/dashboard"), 2000);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProject({
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
          } as Project);
        } else {
          setError("Projeto não encontrado.");
          toast.error("Projeto não encontrado.");
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      } catch (err: unknown) {
        const message = "Falha ao carregar o projeto.";
        setError(message);
        toast.error(message);
        console.error("Error fetching project:", err);
        setTimeout(() => router.push("/dashboard"), 2000);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId, router]);

  const handleDeleteProject = async () => {
    if (!project || !auth.currentUser) return;
    if (
      !confirm(
        "Tem certeza que deseja excluir este projeto e todas as suas tarefas?"
      )
    )
      return;

    setIsDeleting(true);
    try {
      // Delete all tasks associated with the project
      const tasksQuery = query(
        collection(db, "tasks"),
        where("projectId", "==", project.id)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const deleteTasksPromises = tasksSnapshot.docs.map((taskDoc) =>
        deleteDoc(taskDoc.ref)
      );
      await Promise.all(deleteTasksPromises);

      // Notify project members
      const members = project.members || [];
      const deleteNotifications = members
        .filter((uid: string) => uid !== auth.currentUser!.uid)
        .map((uid: string) =>
          createNotification({
            userId: uid,
            message: `O projeto "${project.title}" foi excluído por ${auth.currentUser!.displayName || "Anonymous"}.`,
            taskId: "",
            projectId: project.id,
            type: "project_deleted",
          })
        );
      await Promise.all(deleteNotifications);

      // Delete the project
      await deleteDoc(doc(db, "projects", project.id));
      toast.success("Projeto excluído com sucesso.");
      router.push("/dashboard");
    } catch (err: any) {
      const message = err.message || "Erro ao excluir o projeto.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex space-x-2">
        <Button
          onClick={() => router.push("/dashboard")}
          aria-label="Voltar ao dashboard"
        >
          ← Voltar ao Dashboard
        </Button>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          Editar Projeto
        </Button>
        <Button
          variant="destructive"
          onClick={handleDeleteProject}
          disabled={isDeleting || project.createdBy !== auth.currentUser?.uid}
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Excluindo...
            </>
          ) : (
            "Excluir Projeto"
          )}
        </Button>
      </div>
      <Notifications />
      <Card>
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{project.description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <TaskBoard projectId={project.id} />
          <CommentSection projectId={project.id} />
        </CardContent>
      </Card>
      <EditProject project={project} open={editOpen} setOpen={setEditOpen} />
    </div>
  );
}
