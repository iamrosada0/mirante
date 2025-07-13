// app/dashboard/page.tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { UserHeader } from "@/components/dashboard/UserHeader";
import { DashboardProjects } from "@/components/dashboard/DashboardProjects";
import { Notifications } from "@/components/Notifications";

export default function Dashboard() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { userData, userLoading, error, signOutUser } = useAuthUser();
  const { projects, loading: projectsLoading } = useProjects();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOutUser();
    setIsSigningOut(false);
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
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {userData && (
        <UserHeader
          userData={userData}
          onSignOut={handleSignOut}
          isSigningOut={isSigningOut}
        />
      )}
      <Notifications />
      <DashboardProjects projects={projects} />
    </div>
  );
}
