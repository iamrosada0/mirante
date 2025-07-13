import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getFriendlyErrorMessage } from "@/lib/errors";

export function useAuth(createdBy: string, redirectToLogin: () => void) {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUserLoading(true);
      setError("");

      if (!currentUser) {
        setError("No user is logged in. Redirecting to login...");
        setTimeout(redirectToLogin, 2000);
        setUserLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await auth.signOut();
          setError("User not found in database. Please register first.");
          setTimeout(redirectToLogin, 2000);
          setUserLoading(false);
          return;
        }

        if (currentUser.uid !== createdBy) {
          setError("Only the task creator can edit this task.");
          setUserLoading(false);
          return;
        }

        setUser(currentUser);
      } catch (err: unknown) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setUserLoading(false);
      }
    });

    return () => unsubscribe();
  }, [createdBy, redirectToLogin]);

  return { user, userLoading, error };
}
