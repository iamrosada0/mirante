// components/dashboard/UserHeader.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

interface Props {
  userData: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  onSignOut: () => void;
  isSigningOut: boolean;
}

export function UserHeader({ userData, onSignOut, isSigningOut }: Props) {
  return (
    <Card className="mb-6">
      <CardContent className="flex items-center justify-between space-x-4 pt-6">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={userData.photoURL || ""} alt="Avatar" />
            <AvatarFallback>
              {userData.displayName?.[0] || userData.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">
              Bem-vindo, {userData.displayName || "Usuário"}
            </h2>
            <p className="text-sm text-muted-foreground">{userData.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onSignOut}
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
  );
}
