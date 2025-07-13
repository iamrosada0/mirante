/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskAssigneeProps {
  taskId: string;
  projectId: string;
  currentAssignee?: string | null | undefined;
  taskTitle: string; // Adicionado para notificação
}

export function TaskAssignee({
  taskId,
  projectId,
  currentAssignee,
  taskTitle,
}: TaskAssigneeProps) {
  const [members, setMembers] = useState<
    { uid: string; displayName: string }[]
  >([]);
  const [selectedAssignee, setSelectedAssignee] = useState(
    currentAssignee || "Unassigned"
  );
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    const fetchMembers = async () => {
      const projectDoc = await getDoc(doc(db, "projects", projectId));
      if (projectDoc.exists()) {
        const projectData = projectDoc.data();
        const memberUids = projectData.members || [];
        const memberPromises = memberUids.map(async (uid: string) => {
          const userDoc = await getDoc(doc(db, "users", uid));
          return {
            uid,
            displayName: userDoc.exists()
              ? userDoc.data().displayName
              : "Unknown",
          };
        });
        const membersData = await Promise.all(memberPromises);
        setMembers(membersData);
      }
    };
    fetchMembers();

    return () => unsubscribeAuth();
  }, [projectId]);

  const handleAssigneeChange = async (value: string) => {
    try {
      const newAssignee = value === "Unassigned" ? null : value;
      await updateDoc(doc(db, "tasks", taskId), { assignee: newAssignee });

      // Adicionar notificação para o novo responsável
      if (newAssignee && newAssignee !== user?.uid) {
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        const projectTitle = projectDoc.exists()
          ? projectDoc.data().title
          : "Unknown Project";
        await addDoc(collection(db, "notifications"), {
          userId: newAssignee,
          message: `You have been assigned to task "${taskTitle}" in project "${projectTitle}".`,
          taskId,
          projectId,
          read: false,
          createdAt: serverTimestamp(),
          type: "assignment",
        });
      }

      setSelectedAssignee(value);
    } catch (err) {
      console.error("Error updating assignee:", err);
    }
  };

  return (
    <Select onValueChange={handleAssigneeChange} value={selectedAssignee}>
      <SelectTrigger>
        <SelectValue placeholder="Select assignee" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Unassigned">Unassigned</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.uid} value={member.uid}>
            {member.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
