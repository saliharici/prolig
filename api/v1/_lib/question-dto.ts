export function formatQuestionDto(question: any) {
  return {
    id: question.id,
    content: question.content,
    imageUrl: question.imageUrl,
    objectiveCode: question.objectiveCode,
    grade: question.grade,
    difficulty: question.difficulty,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    status: question.status,
    editorNote: question.editorNote,
    projectId: question.projectId,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    author: question.authorUser ? {
      id: question.authorUser.id,
      fullName: question.authorUser.fullName,
      branchName: question.authorUser.AuthorProfile?.branch?.name || null
    } : null,
    project: question.project ? {
      id: question.project.id,
      title: question.project.title,
      code: question.project.code
    } : null
  };
}
