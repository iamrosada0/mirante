import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getFriendlyErrorMessage } from "@/lib/errors";

interface Member {
  uid: string;
  displayName: string;
}

interface ProjectData {
  members: string[];
}

export function useProjectMembers(projectId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMembers() {
      try {
        const projectDocRef = doc(db, "projects", projectId);
        const projectDoc = await getDoc(projectDocRef);
        if (!projectDoc.exists()) {
          setError("Project not found.");
          return;
        }

        const projectData = projectDoc.data() as ProjectData;
        const memberUids = projectData.members || [];
        const memberPromises = memberUids.map(async (uid: string) => {
          const userDoc = await getDoc(doc(db, "users", uid));
          return {
            uid,
            displayName: userDoc.exists()
              ? (userDoc.data().displayName ?? "Unknown")
              : "Unknown",
          };
        });
        const membersData = await Promise.all(memberPromises);
        setMembers(membersData);
      } catch (err: unknown) {
        setError(getFriendlyErrorMessage(err));
      }
    }

    fetchMembers();
  }, [projectId]);

  return { members, error };
}
