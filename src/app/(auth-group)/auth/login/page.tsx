"use client";
import { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider, // Import GoogleAuthProvider
  signInWithPopup, // Import signInWithPopup
} from "firebase/auth";
import { auth } from "@/lib/firebase"; // Your Firebase auth instance
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Handle email/password login
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during email/password login.");
      }
    }
  };

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    setError(""); // Clear previous errors
    try {
      const provider = new GoogleAuthProvider(); // Create a new Google Auth Provider
      await signInWithPopup(auth, provider); // Use signInWithPopup for Google
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Handle specific Google Auth errors if needed, e.g., 'auth/popup-closed-by-user'
        setError(err.message);
      } else {
        setError("An unexpected error occurred during Google sign-in.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">
              Sign In (Email)
            </Button>
            {/* New Button for Google Sign-In */}
            <Button
              type="button" // Important: set type to "button" to prevent form submission
              onClick={handleGoogleLogin}
              className="w-full mt-2"
              variant="outline"
            >
              Sign In with Google
            </Button>
            <p className="text-sm text-center">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-primary">
                Register
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
