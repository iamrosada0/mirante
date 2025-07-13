"use client";
import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  query,
  where,
  getDoc,
  addDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Comment } from "@/types";

interface CommentTaskProps {
  task: Task;
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface ProjectData {
  title: string;
  members: string[];
}

interface TaskData {
  assignee?: string;
}

export default function CommentTask({ task, open, setOpen }: CommentTaskProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isLoadingMembership, setIsLoadingMembership] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isProjectMember, setIsProjectMember] = useState<boolean | null>(null);

  // Get current user and check project membership
  useEffect(() => {
    console.log(
      "CommentTask: Checking auth state for projectId:",
      task.projectId
    );
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setIsLoadingMembership(true);
      setError(null);
      if (user) {
        setCurrentUserId(user.uid);
        console.log("CommentTask: User authenticated, UID:", user.uid);
        try {
          const projectDoc = await getDoc(doc(db, "projects", task.projectId));
          if (projectDoc.exists()) {
            const projectData = projectDoc.data() as ProjectData;
            const isMember = projectData.members.includes(user.uid);
            setIsProjectMember(isMember);
            console.log("CommentTask: User is project member?", isMember);
            if (!isMember) {
              setError("You are not a member of this project.");
            }
          } else {
            setError("Project not found.");
            console.log(
              "CommentTask: Project not found, projectId:",
              task.projectId
            );
          }
        } catch (err) {
          setError("Failed to verify project membership. Please try again.");
          console.error("CommentTask: Error checking project membership:", err);
        }
      } else {
        setError("You must be logged in to comment.");
        console.log("CommentTask: No user logged in");
      }
      setIsLoadingMembership(false);
    });
    return () => unsubscribe();
  }, [task.projectId]);

  // Fetch comments
  useEffect(() => {
    console.log("CommentTask: Fetching comments for taskId:", task.id);
    const commentsQuery = query(
      collection(db, "comments"),
      where("taskId", "==", task.id),
      where("projectId", "==", task.projectId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      async (snapshot) => {
        setIsLoadingComments(true);
        try {
          const commentData: Comment[] = await Promise.all(
            snapshot.docs.map(async (commentDoc) => {
              const data = commentDoc.data();
              const userRef = doc(db, "users", data.createdBy);
              const userDoc = await getDoc(userRef);
              return {
                id: commentDoc.id,
                taskId: data.taskId,
                projectId: data.projectId,
                content: data.content,
                createdBy: data.createdBy,
                createdAt: data.createdAt?.toDate
                  ? data.createdAt.toDate()
                  : new Date(),
                authorName: userDoc.exists()
                  ? (userDoc.data().displayName ?? "Anonymous")
                  : "Anonymous",
              };
            })
          );
          setComments(commentData);
          console.log("CommentTask: Fetched comments:", commentData);
        } catch (err) {
          setError("Failed to load comments. Please try again.");
          console.error("CommentTask: Error fetching comments:", err);
        } finally {
          setIsLoadingComments(false);
        }
      },
      (err) => {
        setError("Failed to subscribe to comments. Please try again.");
        console.error("CommentTask: Error in onSnapshot:", err);
        setIsLoadingComments(false);
      }
    );

    return () => unsubscribe();
  }, [task.id, task.projectId]);

  // Handle adding a comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("CommentTask: Attempting to add comment:", newComment);
    if (!newComment.trim()) {
      setError("Comment cannot be empty.");
      console.log("CommentTask: Comment is empty");
      return;
    }
    if (!currentUserId) {
      setError("You must be logged in to comment.");
      console.log("CommentTask: No user logged in");
      return;
    }
    if (!isProjectMember) {
      setError("Only project members can comment.");
      console.log("CommentTask: User is not a project member");
      return;
    }

    setIsSubmitting(true);
    try {
      const projectDoc = await getDoc(doc(db, "projects", task.projectId));
      if (!projectDoc.exists()) {
        setError("Project not found.");
        console.log(
          "CommentTask: Project not found, projectId:",
          task.projectId
        );
        setIsSubmitting(false);
        return;
      }
      const projectData = projectDoc.data() as ProjectData;
      const projectTitle = projectData.title;

      const taskDoc = await getDoc(doc(db, "tasks", task.id));
      if (!taskDoc.exists()) {
        setError("Task not found.");
        console.log("CommentTask: Task not found, taskId:", task.id);
        setIsSubmitting(false);
        return;
      }
      const taskData = taskDoc.data() as TaskData;

      const commentRef = await addDoc(collection(db, "comments"), {
        taskId: task.id,
        projectId: task.projectId,
        content: newComment.trim(),
        createdBy: currentUserId,
        createdAt: serverTimestamp(),
      });
      console.log("CommentTask: Comment added, commentId:", commentRef.id);

      const memberUids = projectData.members || [];
      const assignee = taskData.assignee || null;
      const commentPreview =
        newComment.trim().length > 50
          ? `${newComment.trim().substring(0, 47)}...`
          : newComment.trim();

      const notifications = memberUids
        .filter((memberId) => memberId !== currentUserId)
        .map((memberId) =>
          addDoc(collection(db, "notifications"), {
            userId: memberId,
            message: `New comment on task "${task.title}" in project "${projectTitle}" by ${
              auth.currentUser?.displayName || "Anonymous"
            }: "${commentPreview}"`,
            taskId: task.id,
            projectId: task.projectId,
            read: false,
            createdAt: serverTimestamp(),
            type: "comment",
            commentId: commentRef.id,
          })
        );

      if (
        assignee &&
        assignee !== currentUserId &&
        !memberUids.includes(assignee)
      ) {
        notifications.push(
          addDoc(collection(db, "notifications"), {
            userId: assignee,
            message: `New comment on task "${task.title}" in project "${projectTitle}" by ${
              auth.currentUser?.displayName || "Anonymous"
            }: "${commentPreview}"`,
            taskId: task.id,
            projectId: task.projectId,
            read: false,
            createdAt: serverTimestamp(),
            type: "comment",
            commentId: commentRef.id,
          })
        );
      }

      await Promise.all(notifications);
      console.log("CommentTask: Notifications sent");
      setNewComment("");
      setError(null);
    } catch (err: unknown) {
      setError("Failed to add comment. Please try again.");
      console.error("CommentTask: Error adding comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px] p-6" data-dnd-ignore="true">
        <DialogHeader>
          <DialogTitle>Comments for {task.title}</DialogTitle>
        </DialogHeader>
        {isLoadingMembership ? (
          <p className="text-sm text-gray-500">Checking permissions...</p>
        ) : error ? (
          <p className="text-red-500 text-sm">{error}</p>
        ) : (
          <>
            <div className="max-h-[400px] overflow-y-auto">
              {isLoadingComments ? (
                <p className="text-sm text-gray-500">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-gray-500">No comments yet.</p>
              ) : (
                <ul className="space-y-2">
                  {comments.map((comment) => (
                    <li
                      key={comment.id}
                      className="text-sm text-gray-600 border-b py-2"
                    >
                      <p>
                        <strong>{comment.authorName}</strong>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {comment.createdAt instanceof Date
                          ? comment.createdAt.toLocaleDateString()
                          : "N/A"}
                      </p>
                      <p>{comment.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {isProjectMember && (
              <form onSubmit={handleAddComment} className="mt-4 space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => {
                    console.log(
                      "CommentTask: Textarea changed, value:",
                      e.target.value
                    );
                    setNewComment(e.target.value);
                  }}
                  placeholder="Add a comment..."
                  disabled={isSubmitting}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post Comment"
                  )}
                </Button>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
