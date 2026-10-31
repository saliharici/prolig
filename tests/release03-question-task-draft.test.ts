import {describe,expect,it} from 'vitest';
import {
 questionStudioFingerprint,copyPausedQuestionDraft,type QuestionStudioFormValues
} from '../src/questions/studio-state';

const value: QuestionStudioFormValues = {
 content:'Ondalık sayılarla işlem sorusu',level:'Ortaokul',grade:'8. Sınıf',
 projectId:10,taskId:50,options:['1','2','3','4'],correctAnswer:'A',
 explanation:'',assets:[],assetPlacement:'STEM',assetType:'IMAGE',
 assetUrl:'',assetTitle:'',assetAltText:''
};

describe('RELEASE-03 task-linked question draft recovery',()=>{
 it('tracks a changed task assignment in the dirty-state fingerprint',()=>{
   expect(questionStudioFingerprint(value))
     .not.toEqual(questionStudioFingerprint({...value,taskId:51}));
 });
 it('preserves the task without reassigning it while recovering a draft',()=>{
   const copy=copyPausedQuestionDraft({
     values:value,baseline:questionStudioFingerprint(value),
     originalProjectId:null,originalQuestion:null
   });
   expect(copy.values.taskId).toBe(50);
   expect(copy.values.projectId).toBe(10);
   expect(copy.values).not.toBe(value);
 });
});
