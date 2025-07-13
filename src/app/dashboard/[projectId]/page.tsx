"use client";
import { useRouter } from "next/navigation";

import { use, useState } from "react";
import { useProject } from "@/hooks/useProject";
import TaskBoard from "@/components/TaskBoard";
import { CommentSection } from "@/components/CommentSection";
import { Notifications } from "@/components/Notifications";
import { EditProject } from "@/components/EditProject";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const { project, loading, error, isDeleting, handleDeleteProject } =
    useProject(projectId);
  const [editOpen, setEditOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin"
          aria-label="Carregando projeto"
        />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error || "Projeto não encontrado."}</p>
      </div>
    );
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
          aria-label={isDeleting ? "Excluindo projeto" : "Excluir projeto"}
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
