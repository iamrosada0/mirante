/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { useState, useEffect } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ProjectCard } from "@/components/ProjectCard";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Notifications } from "@/components/Notifications";
import { toast } from "react-toastify";

interface UserData {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

const getFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const code = (error as any).code;
    switch (code) {
      case "auth/network-request-failed":
        return "Erro de rede. Verifique sua conexão e tente novamente.";
      default:
        return error.message || "Ocorreu um erro inesperado.";
    }
  }
  return "Ocorreu um erro inesperado.";
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const {
    projects,
    loading: projectsLoading,
    // error: projectsError,
  } = useProjects();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser: User | null) => {
        setUserLoading(true);
        setError("");

        if (!currentUser) {
          setError("Nenhum usuário logado. Redirecionando para o login...");
          setTimeout(() => router.push("/auth/login"), 2000);
          setUserLoading(false);
          return;
        }

        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await auth.signOut();
            setError(
              "Usuário não encontrado no banco de dados. Registre-se primeiro."
            );
            setTimeout(() => router.push("/auth/register"), 2000);
            setUserLoading(false);
            return;
          }

          setUser(currentUser);
          setUserData({
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
          });
        } catch (err: unknown) {
          const message = getFriendlyErrorMessage(err);
          setError(message);
          toast.error(message);
          setTimeout(() => router.push("/auth/login"), 2000);
        } finally {
          setUserLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setError("");
    try {
      await signOut(auth);
      router.push("/auth/login");
    } catch (err: unknown) {
      const message = getFriendlyErrorMessage(err);
      setError(message);
      toast.error(message);
      setIsSigningOut(false);
    }
  };

  if (userLoading || projectsLoading) {
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

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardContent className="flex items-center justify-between space-x-4 pt-6">
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage
                src={userData?.photoURL || ""}
                alt={`Avatar de ${userData?.displayName || "Usuário"}`}
              />
              <AvatarFallback>
                {userData?.displayName?.charAt(0) ||
                  userData?.email?.charAt(0) ||
                  "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">
                Bem-vindo, {userData?.displayName || "Usuário"}
              </h2>
              <p className="text-sm text-muted-foreground">{userData?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-label="Sair"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saindo...
              </>
            ) : (
              "Sair"
            )}
          </Button>
        </CardContent>
      </Card>
      <Notifications />
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Meus Projetos</CardTitle>
          <Link href="/dashboard/new">
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
    </div>
  );
}
