"use client";
import { useState, useEffect } from "react";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Comment } from "@/types/comment";

interface CommentSectionProps {
  projectId: string;
}

export function CommentSection({ projectId }: CommentSectionProps) {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "comments"), (snapshot) => {
      const commentData = snapshot.docs
        .filter((doc) => doc.data().projectId === projectId)
        .map((doc) => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(commentData);
    });
    return () => unsubscribe();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "comments"), {
        projectId,
        userId: auth.currentUser?.uid,
        content: comment,
        createdAt: new Date(),
      });
      setComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            placeholder="Add a comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button type="submit">Submit</Button>
        </form>
        <div className="space-y-2">
          {comments.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-4">
                <p>{c.content}</p>
                <p className="text-sm text-muted-foreground">
                  By {c.userId} on {c.createdAt.toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
