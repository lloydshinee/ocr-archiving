const ROLE_HIERARCHY: Record<string, string[]> = {
  dean: ["dean", "program_head", "faculty", "student_assistant"],
  program_head: ["faculty", "student_assistant"],
  faculty: [],
  student_assistant: [],
}

export type UserRole = "dean" | "program_head" | "faculty" | "student_assistant"

export function canCreateRole(creatorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[creatorRole]?.includes(targetRole) ?? false
}
