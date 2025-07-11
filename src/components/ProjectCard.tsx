import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/types/project";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/dashboard/${project.id}`}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{project.description}</p>
          <p className="mt-2 text-sm">
            Start Date: {project.startDate.toLocaleDateString()}
          </p>
          <p className="text-sm">Members: {project.members.length}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
