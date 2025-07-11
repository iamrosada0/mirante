/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";

// Map Firebase error codes to user-friendly messages
const getFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const code = (error as any).code;
    switch (code) {
      case "auth/popup-closed-by-user":
        return "Google sign-in was canceled.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      case "auth/popup-blocked":
        return "Popup blocked by browser. Please allow popups and try again.";
      default:
        return error.message || "An unexpected error occurred.";
    }
  }
  return "An unexpected error occurred.";
};

export default function Login() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Handle Google Sign-In with user existence check
  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user: User = userCredential.user; // Explicitly use User type

      // Check if user exists in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Sign out the user if they don't exist in Firestore
        await auth.signOut();
        setError("User not found. Please register first.");
        return;
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In with Google"
            )}
          </Button>
          <p className="text-sm text-center">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-primary hover:underline"
            >
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
