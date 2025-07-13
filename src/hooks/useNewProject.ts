import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { getFriendlyErrorMessage } from "@/lib/firebaseErrors";

export function useNewProject() {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState("");
  const [availableUsers, setAvailableUsers] = useState<
    { uid: string; displayName: string }[]
  >([]);
  const [members, setMembers] = useState<string[]>([]);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUserLoading(true);
      setError("");

      if (!currentUser) {
        setError("No user is logged in. Redirecting...");
        setTimeout(() => router.push("/auth/login"), 2000);
        setUserLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (!userDoc.exists()) {
          await auth.signOut();
          setError("User not found in database.");
          setTimeout(() => router.push("/auth/register"), 2000);
          return;
        }

        setUser(currentUser);
        setMembers([currentUser.uid]);

        const usersSnapshot = await getDocs(collection(db, "users"));
        const users = usersSnapshot.docs.map((doc) => ({
          uid: doc.id,
          displayName: doc.data().displayName || "Unknown",
        }));

        setAvailableUsers(users);
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
        setTimeout(() => router.push("/auth/login"), 2000);
      } finally {
        setUserLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return {
    user,
    userLoading,
    error,
    availableUsers,
    members,
    setMembers,
    setError,
  };
}
