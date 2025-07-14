"use client";
import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  id: string;
  content: string;
  createdBy: string;
  createdAt: Timestamp | Date;
  projectId: string;
}

interface CommentSectionProps {
  projectId: string;
}

export function CommentSection({ projectId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setError("Invalid project ID.");
      return;
    }

    const commentsQuery = query(
      collection(db, "comments"),
      where("projectId", "==", projectId)
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const commentData = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              createdAt:
                doc.data().createdAt instanceof Timestamp
                  ? doc.data().createdAt.toDate()
                  : doc.data().createdAt,
            }) as Comment
        );
        setComments(commentData);
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (err) => {
        setError("Failed to load comments.");
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Comment cannot be empty.");
      return;
    }
    if (!auth.currentUser) {
      setError("You must be logged in to comment.");
      return;
    }
    try {
      await addDoc(collection(db, "comments"), {
        content: content.trim(),
        projectId,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setContent("");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err: unknown) {
      setError("Failed to add comment.");
    }
  };

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Comments</h3>
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button type="submit">Post Comment</Button>
      </form>
      <div className="mt-4 space-y-2">
        {comments.map((comment) => (
          <div key={comment.id} className="p-2 border rounded">
            <p>{comment.content}</p>
            <p className="text-sm text-muted-foreground">
              {comment.createdAt instanceof Date
                ? comment.createdAt.toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
