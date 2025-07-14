import { useState, useEffect } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "@/lib/firebaseErrors";

interface UseAuthUserOptions {
  createdBy?: string;
  redirectToLogin?: () => void;
  redirectToRegister?: () => void;
  autoRedirect?: boolean;
}

export function useAuthUser(options: UseAuthUserOptions = {}) {
  const {
    createdBy,
    redirectToLogin,
    redirectToRegister,
    autoRedirect = true,
  } = options;

  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<{
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUserLoading(true);
      setError("");

      if (!currentUser) {
        const msg = "Nenhum usuário logado.";
        setError(msg);
        if (autoRedirect && redirectToLogin) {
          setTimeout(redirectToLogin, 2000);
        } else if (autoRedirect) {
          setTimeout(() => router.push("/auth/login"), 2000);
        }
        return;
      }

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          await auth.signOut();
          const msg = "Usuário não encontrado. Registre-se primeiro.";
          setError(msg);
          if (autoRedirect && redirectToRegister) {
            setTimeout(redirectToRegister, 2000);
          } else if (autoRedirect) {
            setTimeout(() => router.push("/auth/register"), 2000);
          }
          return;
        }

        if (createdBy && currentUser.uid !== createdBy) {
          setError("Somente o criador da tarefa pode editá-la.");
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
        if (autoRedirect) {
          toast.error(message);
          setTimeout(() => router.push("/auth/login"), 2000);
        }
      } finally {
        setUserLoading(false);
      }
    });

    return () => unsubscribe();
  }, [createdBy, redirectToLogin, redirectToRegister, autoRedirect, router]);

  const signOutUser = async () => {
    try {
      await signOut(auth);
      router.push("/auth/login");
    } catch (err) {
      const message = getFriendlyErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  };

  return {
    user,
    userData,
    userLoading,
    error,
    signOutUser,
  };
}
