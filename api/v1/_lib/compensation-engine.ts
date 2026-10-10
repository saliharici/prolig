const coordinatorEarningMap: Record<string, string> = {
  IL_KOORDINATORU: 'PROJECT_PROVINCE_COORDINATOR',
  BOLGE_KOORDINATORU: 'PROJECT_REGION_COORDINATOR',
  GENEL_KOORDINATOR: 'PROJECT_GENERAL_COORDINATOR'
};

async function resolveRule(
  tx: any,
  roleCode: string,
  earningType: string,
  projectId: number | null,
  at: Date
) {
  const timeScope = {
    validFrom: { lte: at },
    OR: [{ validTo: null }, { validTo: { gt: at } }]
  };

  if (projectId) {
    const projectRule = await tx.compensationRule.findFirst({
      where: {
        roleCode,
        earningType,
        projectId,
        isActive: true,
        ...timeScope
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }]
    });
    if (projectRule) return projectRule;
  }

  return tx.compensationRule.findFirst({
    where: {
      roleCode,
      earningType,
      projectId: null,
      isActive: true,
      ...timeScope
    },
    orderBy: [{ validFrom: 'desc' }, { id: 'desc' }]
  });
}

async function createEntry(
  tx: any,
  params: {
    userId: number;
    roleCode: string;
    earningType: string;
    projectId: number | null;
    questionId?: number | null;
    sourceKey: string;
    earnedAt: Date;
  }
) {
  const existing = await tx.compensationEntry.findUnique({ where: { sourceKey: params.sourceKey } });
  if (existing) return { entry: existing, created: false, missingRate: false };

  const rule = await resolveRule(
    tx,
    params.roleCode,
    params.earningType,
    params.projectId,
    params.earnedAt
  );

  if (!rule) {
    await tx.activityLog.create({
      data: {
        userName: 'Sistem',
        action: 'COMPENSATION_RATE_MISSING',
        entityType: params.questionId ? 'Question' : 'Project',
        entityId: params.questionId ?? params.projectId,
        details: JSON.stringify({
          roleCode: params.roleCode,
          earningType: params.earningType,
          projectId: params.projectId,
          sourceKey: params.sourceKey
        })
      }
    });
    return { entry: null, created: false, missingRate: true };
  }

  const entry = await tx.compensationEntry.create({
    data: {
      userId: params.userId,
      roleCode: params.roleCode,
      earningType: params.earningType,
      projectId: params.projectId,
      questionId: params.questionId ?? null,
      ruleId: rule.id,
      sourceKey: params.sourceKey,
      quantity: 1,
      unitPrice: rule.unitPrice,
      amount: rule.unitPrice,
      status: 'HAK_EDILDI',
      earnedAt: params.earnedAt
    }
  });

  await tx.activityLog.create({
    data: {
      userName: 'Sistem',
      action: 'COMPENSATION_ENTRY_EARNED',
      entityType: 'CompensationEntry',
      entityId: entry.id,
      details: JSON.stringify({
        userId: params.userId,
        roleCode: params.roleCode,
        earningType: params.earningType,
        projectId: params.projectId,
        questionId: params.questionId ?? null,
        ruleId: rule.id,
        unitPrice: rule.unitPrice.toFixed(2),
        amount: rule.unitPrice.toFixed(2),
        sourceKey: params.sourceKey
      })
    }
  });

  return { entry, created: true, missingRate: false };
}

export async function accrueQuestionApproval(
  tx: any,
  question: {
    id: number;
    authorUserId: number;
    projectId: number | null;
  },
  reviewer: {
    id: number;
    role?: { code?: string } | null;
  },
  earnedAt = new Date()
) {
  const results = [];

  results.push(await createEntry(tx, {
    userId: question.authorUserId,
    roleCode: 'YAZAR',
    earningType: 'QUESTION_AUTHOR',
    projectId: question.projectId,
    questionId: question.id,
    sourceKey: `QUESTION_AUTHOR:${question.id}`,
    earnedAt
  }));

  if (reviewer.role?.code === 'EDITOR') {
    results.push(await createEntry(tx, {
      userId: reviewer.id,
      roleCode: 'EDITOR',
      earningType: 'QUESTION_EDITOR',
      projectId: question.projectId,
      questionId: question.id,
      sourceKey: `QUESTION_EDITOR:${question.id}`,
      earnedAt
    }));
  }

  return results;
}

export async function accrueProjectCoordinatorCompletion(
  tx: any,
  project: {
    id: number;
    coordinatorId: number | null;
  },
  earnedAt = new Date()
) {
  if (!project.coordinatorId) return null;

  const coordinator = await tx.user.findUnique({
    where: { id: project.coordinatorId },
    select: { id: true, role: { select: { code: true } } }
  });
  const roleCode = coordinator?.role?.code;
  if (!coordinator || !roleCode || !coordinatorEarningMap[roleCode]) return null;

  const earningType = coordinatorEarningMap[roleCode];
  return createEntry(tx, {
    userId: coordinator.id,
    roleCode,
    earningType,
    projectId: project.id,
    sourceKey: `PROJECT_COORDINATOR:${project.id}:${coordinator.id}:${earningType}`,
    earnedAt
  });
}
