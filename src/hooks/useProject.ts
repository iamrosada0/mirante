import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchProject, deleteProject } from "@/services/projectService";
import { Project } from "@/types/project";
import { auth } from "@/lib/firebase";

export const useProject = (projectId: string) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const loadProject = async () => {
      try {
        const fetchedProject = await fetchProject(projectId);
        if (isMounted) {
          setProject(fetchedProject);
        }
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message);
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [projectId, router]);

  const handleDeleteProject = useCallback(async () => {
    if (!project || !auth.currentUser) return;
    if (
      !confirm(
        "Tem certeza que deseja excluir este projeto e todas as suas tarefas?"
      )
    )
      return;

    setIsDeleting(true);
    try {
      await deleteProject(project, auth.currentUser.uid);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  }, [project, router]);

  return { project, loading, error, isDeleting, handleDeleteProject };
};
