"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/auth/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Redirecting...</p>
        </CardContent>
      </Card>
    </div>
  );
}
