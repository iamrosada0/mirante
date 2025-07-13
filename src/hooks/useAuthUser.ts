// hooks/useAuthUser.ts
import { useState, useEffect } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "@/lib/firebaseErrors";

export function useAuthUser() {
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
        setError("Nenhum usuário logado. Redirecionando...");
        setTimeout(() => router.push("/auth/login"), 2000);
        return;
      }

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          await auth.signOut();
          setError("Usuário não encontrado. Registre-se primeiro.");
          setTimeout(() => router.push("/auth/register"), 2000);
          return;
        }

        setUser(currentUser);
        setUserData({
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        });
      } catch (err) {
        const message = getFriendlyErrorMessage(err);
        setError(message);
        toast.error(message);
        setTimeout(() => router.push("/auth/login"), 2000);
      } finally {
        setUserLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const signOutUser = async () => {
    try {
      await signOut(auth);
      router.push("/auth/login");
    } catch (err) {
      const message = getFriendlyErrorMessage(err);
      toast.error(message);
    }
  };

  return { user, userData, userLoading, error, signOutUser };
}
