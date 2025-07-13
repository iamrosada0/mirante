/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { Project } from "@/types/project";

interface EditProjectProps {
  project: Project;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function EditProject({ project, open, setOpen }: EditProjectProps) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("O título é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const projectRef = doc(db, "projects", project.id);
      await updateDoc(projectRef, {
        title: title.trim(),
        description: description.trim(),
      });
      setOpen(false);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar o projeto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="text-sm font-medium">
              Título
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do projeto"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="description" className="text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do projeto"
              disabled={isSubmitting}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
