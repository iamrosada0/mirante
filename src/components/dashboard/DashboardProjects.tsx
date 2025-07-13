// components/dashboard/DashboardProjects.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Project } from "@/types";
import { ProjectCard } from "../project/ProjectCard";

interface Props {
  projects: Project[];
}

export function DashboardProjects({ projects }: Props) {
  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Meus Projetos</CardTitle>
        <Link href="/dashboard/projects/new">
          <Button aria-label="Criar novo projeto">Criar Projeto</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Nenhum projeto encontrado. Crie um para começar!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
