import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export const login = async (email: string, password: string) => {
  await signInWithEmailAndPassword(auth, email, password);
};

export const register = async (email: string, password: string) => {
  await createUserWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  await signOut(auth);
};
