"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import TaskBoard from "@/components/TaskBoard"; // Use default import
import { CommentSection } from "@/components/CommentSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/types/project";
import { use } from "react";
import { Button } from "@/components/ui/button";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params); // Unwrap params with React.use
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setError("Invalid project ID.");
        setTimeout(() => router.push("/dashboard"), 2000);
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
            // Convert Timestamp to Date
            startDate:
              data.startDate instanceof Timestamp
                ? data.startDate.toDate()
                : data.startDate,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : data.createdAt,
          } as Project);
        } else {
          setError("Project not found.");
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      } catch (err: unknown) {
        setError("Failed to load project.");
        console.error("Error fetching project:", err);
        setTimeout(() => router.push("/dashboard"), 2000);
      }
    };
    fetchProject();
  }, [projectId, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Button onClick={() => router.push("/dashboard")}>
          ← Voltar ao Dashboard
        </Button>
      </div>
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
