import { beforeEach,describe,expect,it,vi } from 'vitest';
import { prisma } from '../api/v1/_lib/prisma.js';
import { getQuestionArchiveStateMap } from '../api/v1/_lib/question-archive.js';
import { productionTotalsForProjects } from '../api/v1/_lib/production-progress.js';
vi.mock('../api/v1/_lib/prisma.js',()=>({prisma:{task:{findMany:vi.fn()}}}));
vi.mock('../api/v1/_lib/question-archive.js',()=>({getQuestionArchiveStateMap:vi.fn()}));
describe('Release 01 - project production totals reflect only active questions',()=>{
  beforeEach(()=>{vi.clearAllMocks();vi.mocked(getQuestionArchiveStateMap).mockResolvedValue(new Map());});
  it('counts only linked active approved questions, including under overdue logic',async()=>{
    vi.mocked(prisma.task.findMany).mockResolvedValue([{
      projectId:7,dueDate:new Date('2020-01-01T00:00:00Z'),status:'Devam_Ediyor',
      targetQuestionCount:3,questions:[
        {id:1,status:'ONAYLANDI'},{id:2,status:'ONAYLANDI'},{id:3,status:'INCELEMEDE'}
      ]
    }] as any);
    vi.mocked(getQuestionArchiveStateMap).mockResolvedValue(new Map([[2,true]]));
    const result=(await productionTotalsForProjects([7])).get(7);
    expect(result).toMatchObject({target:3,written:2,approved:1,inReview:1,overdueTasks:1,completionPercent:33});
    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where:{projectId:{in:[7]},targetQuestionCount:{gt:0}}
    }));
  });
  it('empty project list does not query cross-project data',async()=>{
    expect((await productionTotalsForProjects([])).size).toBe(0);
    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });
});
