"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TaskBoard } from "@/components/TaskBoard";
import { CommentSection } from "@/components/CommentSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/types/project";

interface ProjectPageProps {
  params: { projectId: string };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const [project, setProject] = useState<Project | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProject = async () => {
      const docRef = doc(db, "projects", params.projectId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() } as Project);
      } else {
        router.push("/dashboard");
      }
    };
    fetchProject();
  }, [params.projectId, router]);

  if (!project) return <div className="text-center">Loading...</div>;

  return (
    <div className="container mx-auto p-4">
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
    </div>
  );
}
