/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bell } from "lucide-react";

interface Notification {
  id: string;
  userId: string;
  message: string;
  taskId?: string;
  projectId: string;
  read: boolean;
  createdAt: Date | Timestamp;
  type: "assignment" | "comment" | "dueDate";
}

interface NotificationsProps {
  projectId?: string; // Tornar projectId opcional para mostrar todas as notificações
}

export function Notifications({ projectId }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setError("Você precisa estar logado para ver notificações.");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const constraints = [
      where("userId", "==", user.uid),
      where("read", "==", false),
    ];
    if (projectId) {
      constraints.push(where("projectId", "==", projectId));
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      ...constraints
    );

    const unsubscribeNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Notification[];
        setNotifications(notificationData);
        setLoading(false);
      },
      (err) => {
        setError("Erro ao carregar notificações.");
        console.error("Error fetching notifications:", err);
        setLoading(false);
      }
    );

    return () => unsubscribeNotifications();
  }, [user, projectId]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
      setError("Erro ao marcar notificação como lida.");
    }
  };

  if (loading) {
    return <div>Carregando notificações...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-700 flex items-center">
        <Bell className="h-5 w-5 mr-2" />
        Notificações
        {notifications.length > 0 && (
          <span className="ml-2 text-sm text-white bg-red-500 rounded-full px-2 py-1">
            {notifications.length}
          </span>
        )}
      </h3>
      {notifications.length === 0 ? (
        <p className="text-gray-500 mt-2">Nenhuma notificação nova.</p>
      ) : (
        <div className="space-y-2 mt-2">
          {notifications.map((notification) => (
            <Card key={notification.id} className="p-2">
              <CardContent className="p-0 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {notification.createdAt instanceof Date
                      ? notification.createdAt.toLocaleString()
                      : "N/A"}
                  </p>
                  {notification.taskId && (
                    <Link
                      href={`/dashboard/${notification.projectId}?taskId=${notification.taskId}`}
                    >
                      <Button variant="link" size="sm" className="p-0">
                        Ver Tarefa
                      </Button>
                    </Link>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAsRead(notification.id)}
                >
                  Marcar como Lida
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
