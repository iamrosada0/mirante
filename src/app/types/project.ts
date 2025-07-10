export type ProjectMemberRole = "owner" | "admin" | "viewer";

export interface ProjectMember {
  uid: string; // Firebase UID
  role: ProjectMemberRole;
}
