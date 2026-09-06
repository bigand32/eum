export function matchesStudentScope(studentId: string, entityStudentId: string) {
  if (!studentId) return false;
  return entityStudentId === studentId;
}
