export function formatQuestionDto(question: any, isArchived = false) {
  return {
    id: question.id,
    content: question.content,
    questionType: question.questionType ?? 'MULTIPLE_CHOICE',
    optionCount: (question.questionType ?? 'MULTIPLE_CHOICE') === 'MULTIPLE_CHOICE' ? question.optionCount ?? 4 : null,
    booleanAnswer: question.booleanAnswer ?? null,
    modelAnswer: question.modelAnswer ?? null,
    scoringRubric: question.scoringRubric ?? null,
    evaluationCriteria: question.evaluationCriteria ?? null,
    imageUrl: question.imageUrl,
    assets: Array.isArray(question.assets) ? question.assets
      .slice()
      .sort((left: any, right: any) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
      .map((asset: any) => ({
        id: asset.id,
        questionId: asset.questionId,
        placement: asset.placement,
        assetType: asset.assetType,
        url: asset.url,
        title: asset.title,
        altText: asset.altText,
        sortOrder: asset.sortOrder,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt
      })) : [],
    objectiveCode: question.objectiveCode,
    grade: question.grade,
    difficulty: question.difficulty,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    status: question.status,
    editorNote: question.editorNote,
    projectId: question.projectId,
    isPersonal: question.isPersonal === true,
    personalSubject: question.isPersonal === true ? question.personalSubject ?? null : null,
    personalTopic: question.isPersonal === true ? question.personalTopic ?? null : null,
    taskId: question.taskId ?? null,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    isArchived,
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
