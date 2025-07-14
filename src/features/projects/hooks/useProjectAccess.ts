import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFriendlyErrorMessage } from "@/lib/firebaseErrors";

export function useProjectAccess(projectId: string | null) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<
    { uid: string; displayName: string }[]
  >([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUserLoading(true);
      setError("");

      if (!currentUser) {
        setError("No user is logged in. Redirecting to login...");
        setTimeout(() => router.push("/auth/login"), 2000);
        setUserLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (!userDoc.exists()) {
          await auth.signOut();
          setError("User not found in database. Redirecting...");
          setTimeout(() => router.push("/auth/register"), 2000);
          return;
        }

        if (!projectId) {
          setError("No project ID. Redirecting...");
          setTimeout(() => router.push("/dashboard"), 2000);
          return;
        }

        const projectDoc = await getDoc(doc(db, "projects", projectId));
        if (!projectDoc.exists()) {
          setError("Project not found. Redirecting...");
          setTimeout(() => router.push("/dashboard"), 2000);
          return;
        }

        const projectData = projectDoc.data();
        if (!projectData.members.includes(currentUser.uid)) {
          setError("Not a project member. Redirecting...");
          setTimeout(() => router.push("/dashboard"), 2000);
          return;
        }

        const memberPromises = projectData.members.map(async (uid: string) => {
          const docSnap = await getDoc(doc(db, "users", uid));
          return {
            uid,
            displayName: docSnap.exists()
              ? docSnap.data().displayName
              : "Unknown",
          };
        });

        const membersData = await Promise.all(memberPromises);
        setMembers(membersData);
        setUser(currentUser);
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
        setTimeout(() => router.push("/dashboard"), 2000);
      } finally {
        setUserLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, projectId]);

  return { user, userLoading, error, members };
}
