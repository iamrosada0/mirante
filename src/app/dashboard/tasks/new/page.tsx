import { Suspense } from "react";
import NewTaskForm from "@/components/task/create/NewTaskForm";

export default function NewTaskPage() {
  return (
    <Suspense fallback={<div>Carregando formulário...</div>}>
      <NewTaskForm />
    </Suspense>
  );
}
