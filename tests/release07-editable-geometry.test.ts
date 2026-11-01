import { readFileSync } from 'node:fs';
import {describe,expect,it} from 'vitest';
import {Schema} from '@tiptap/pm/model';
import {defaultGeometry,validGeometry,readGeometryMarker,editableGeometryMarker} from '../src/questions/geometry-parameters';
import {geometryMarker,splitGeometryMarkup} from '../src/questions/geometry-markup';
import {listEditableGeometry,canReplaceSelectedGeometry} from '../src/questions/geometry-revision';
import {updateGeometryHandle} from '../src/questions/DraggableGeometry';
import {geometrySvg} from '../src/questions/geometry-svg';
import {knownGeometryOnly,wordGeometryDrawing} from '../api/v1/_lib/docx-geometry';
import {exportBookDocx} from '../api/v1/_lib/book-docx';
import {htmlToLegacyMarkup,legacyMarkupToHtml} from '../src/questions/question-editor-converter';
const schema=new Schema({nodes:{doc:{content:'paragraph+'},paragraph:{group:'block',content:'text*'},text:{}},marks:{}});
describe('RELEASE-07 mouse-editable persisted shapes',()=>{
 it('preserves legacy v1 and bounded v2 editable coordinates across save/reopen',()=>{
  for(const shape of ['triangle','circle','square'] as const){
   const v1=geometryMarker(shape);
   expect(readGeometryMarker(v1)).toEqual(defaultGeometry(shape));
   const edited=updateGeometryHandle(defaultGeometry(shape),0,80,35);
   const marker=editableGeometryMarker(edited);
   expect(readGeometryMarker(marker)).toEqual(edited);
   expect(htmlToLegacyMarkup(legacyMarkupToHtml('Şekil '+marker))).toBe('Şekil '+marker);
   expect(splitGeometryMarkup(marker)).toEqual([{kind:'geometry',shape,values:edited.values}]);
  }
 });
 it('keeps invalid, future, oversized, degenerate markers inert and blocked from Word',()=>{
  for(const input of ['[[prolig-geometry:v3:triangle:1,2,3]]','[[prolig-geometry:v2:circle:0,0,99]]',
    '[[prolig-geometry:v2:triangle:20,20,40,40,60,60]]','[[prolig-geometry:v2:square:1,1,999]]']){
    expect(readGeometryMarker(input)).toBeNull();
    expect(splitGeometryMarkup(input)).toEqual([{kind:'text',value:input}]);
    expect(knownGeometryOnly(input)).toBe(false);
  }
  expect(()=>editableGeometryMarker({shape:'circle',values:[1,1,120]})).toThrow();
 });
 it('locates v2 markers and refuses stale revision from a different ProseMirror doc',()=>{
  const marker=editableGeometryMarker(defaultGeometry('triangle'));
  const doc=schema.nodes.doc.create(null,schema.nodes.paragraph.create(null,schema.text('ABC '+marker+' SON')));
  const entry=listEditableGeometry(doc)[0];
  expect(entry.original).toBe(marker);
  expect(canReplaceSelectedGeometry({...entry,document:doc},doc)).toBe(true);
  expect(canReplaceSelectedGeometry({...entry,document:doc},{textBetween:()=>marker})).toBe(false);
 });
 it('exports editable numeric geometry to SVG and Word native vector path',()=>{
  const drawing=updateGeometryHandle(defaultGeometry('triangle'),0,105,22);
  const marker=editableGeometryMarker(drawing);
  expect(geometrySvg('triangle',drawing)).toContain('105,22');
  const xml=wordGeometryDrawing('triangle',5,drawing.values);
  expect(xml).toContain('<a:custGeom>');
  expect(xml).toContain('<a:moveTo><a:pt x="105" y="22"/>');
  const snapshot:any={schemaVersion:1,sourceQuestionId:1,sourceQuestionUpdatedAt:'2026-11-01T00:00:00Z',
   content:'Şekil: '+marker,imageUrl:null,grade:'8',objectiveCode:null,difficulty:null,
   questionType:'MULTIPLE_CHOICE',options:['1','2','3','4'],correctAnswer:'A',
   booleanAnswer:null,modelAnswer:null,explanation:null,scoringRubric:null,evaluationCriteria:null,assets:[]};
  const docx=exportBookDocx({id:1,title:'Geometri',layoutColumns:1,
   chapters:[{title:'Şekiller',sortOrder:0,questions:[{sortOrder:0,snapshot}]}]},false).toString('utf8');
  expect(docx).toContain('<a:custGeom>');
  expect(docx).not.toContain(marker);
  expect(()=>wordGeometryDrawing('triangle',1,[1,1,2,2,3,3])).toThrow();
 });
 it('retains accessible geometry movement limits',()=>{
  expect(validGeometry(updateGeometryHandle(defaultGeometry('triangle'),0,100,15))).toBe(true);
  expect(validGeometry(updateGeometryHandle(defaultGeometry('circle'),1,150,65))).toBe(true);
  expect(validGeometry(updateGeometryHandle(defaultGeometry('square'),1,125,110))).toBe(true);
 });
});

// Vercel Node ESM must resolve this server-reachable source import at runtime.
describe('RELEASE-07 server ESM module resolution',()=>{
 it('uses explicit .js specifiers for geometry-parameters from server-reachable geometry-markup',()=>{
  const source=readFileSync('src/questions/geometry-markup.ts','utf8');
  expect(source).toContain("from './geometry-parameters.js'");
  expect(source).not.toContain("from './geometry-parameters'");
 });
});

describe('RELEASE-07 edit-in-place action contract',()=>{
 it('uses one primary action for new drawings and selected saved drawings',()=>{
  const source=readFileSync('src/questions/QuestionStemWysiwygEditor.tsx','utf8');
  expect(source).toContain('const persistGeometryIntoStem = () => {');
  expect(source).toContain('onClick={persistGeometryIntoStem}');
  expect(source).toContain("geometrySelection ? 'Seçili şekli güncelle' : 'Şekli soruya kalıcı ekle'");
  expect(source).toContain('canReplaceSelectedGeometry(geometrySelection, editor.state.doc)');
 });
});

describe('RELEASE-07 visual in-stem geometry / persistent source',()=>{
 it('renders valid markers as atomic visual HTML while preserving legacy v1/v2 source',()=>{
  for(const shape of ['triangle','circle','square'] as const){
    const v1=geometryMarker(shape);
    const v2=editableGeometryMarker(defaultGeometry(shape));
    for(const token of [v1,v2]){
      const source='Soru: '+token+' seçenekler';
      const html=legacyMarkupToHtml(source);
      expect(html).toContain('data-prolig-geometry="'+token+'"');
      expect(htmlToLegacyMarkup(html)).toBe(source);
    }
  }
 });
 it('never transforms unsupported marker formats into visual geometry nodes',()=>{
  const text='[[prolig-geometry:v9:circle:12,12,5]]';
  expect(legacyMarkupToHtml(text)).not.toContain('data-prolig-geometry=');
  expect(htmlToLegacyMarkup(legacyMarkupToHtml(text))).toBe(text);
 });
 it('finds and validates atomic geometry locations without exposing raw marker to the editor',()=>{
  const marker=editableGeometryMarker(defaultGeometry('triangle'));
  const atomSchema=new Schema({nodes:{
    doc:{content:'paragraph+'},paragraph:{group:'block',content:'inline*'},text:{group:'inline'},
    geometryShape:{group:'inline',inline:true,atom:true,attrs:{marker:{default:null}}}
  },marks:{}});
  const atom=atomSchema.nodes.geometryShape.create({marker});
  const doc=atomSchema.nodes.doc.create(null,atomSchema.nodes.paragraph.create(null,[atom]));
  const found=listEditableGeometry(doc);
  expect(found).toHaveLength(1);
  expect(found[0].original).toBe(marker);
  expect(found[0].to-found[0].from).toBe(1);
  expect(canReplaceSelectedGeometry({...found[0],document:doc},doc)).toBe(true);
  const stale=atomSchema.nodes.doc.create(null,atomSchema.nodes.paragraph.create(null,[atomSchema.nodes.geometryShape.create({marker:geometryMarker('circle')})]));
  expect(canReplaceSelectedGeometry({...found[0],document:stale},stale)).toBe(false);
 });
});
