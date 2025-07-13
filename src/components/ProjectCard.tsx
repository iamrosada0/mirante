"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/types/project";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  // Convert Firestore Timestamp to Date for startDate
  const startDate =
    project.startDate instanceof Timestamp
      ? project.startDate.toDate()
      : project.startDate;

  return (
    <Link href={`/dashboard/${project.id}`}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{project.description}</p>
          <p className="mt-2 text-sm">
            Start Date:{" "}
            {startDate instanceof Date ? startDate.toLocaleDateString() : "N/A"}
          </p>
          <p className="text-sm">Members: {project.members.length}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
