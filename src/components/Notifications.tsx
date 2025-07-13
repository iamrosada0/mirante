"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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

export function Notifications() {
  const [userUid, setUserUid] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verifica se o usuário está logado
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserUid(user.uid);
      } else {
        setError("Você precisa estar logado para ver notificações.");
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Busca as notificações apenas do usuário logado
  useEffect(() => {
    if (!userUid) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userUid),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Notification, "id" | "createdAt">),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        setNotifications(data);
      },
      (err) => {
        console.error("Erro ao buscar notificações:", err);
        setError("Erro ao carregar notificações.");
      }
    );

    return () => unsubscribe();
  }, [userUid]);

  // Marcar como lida
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), {
        read: true,
      });
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
      setError("Erro ao marcar notificação como lida.");
    }
  };

  // Renderizações
  if (loading) return <p>Carregando notificações...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!userUid) return null;

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
