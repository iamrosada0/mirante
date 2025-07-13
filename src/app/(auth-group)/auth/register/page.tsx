"use client";
import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/firebaseErrors";

// Utility function to save user data to Firestore
async function saveUserDataToFirestore(user: User): Promise<void> {
  const userData = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || "Usuário Novo",
    photoURL: user.photoURL || null,
    createdAt: user.metadata.creationTime || new Date().toISOString(),
    lastLoginAt: user.metadata.lastSignInTime || new Date().toISOString(),
    providerId: user.providerData[0]?.providerId || "google.com",
  };

  try {
    await setDoc(doc(db, "users", user.uid), userData);
    console.log("User data saved to Firestore:", userData);
  } catch (error) {
    console.error("Error saving user data to Firestore:", error);
    throw new Error("Failed to save user data.");
  }
}

export default function Register() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Handle Google Registration
  const handleGoogleRegister = async () => {
    setError("");
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await saveUserDataToFirestore(userCredential.user);
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
          <CardTitle>Register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button
            type="button"
            onClick={handleGoogleRegister}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing Up...
              </>
            ) : (
              "Sign Up with Google"
            )}
          </Button>
          <p className="text-sm text-center">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
