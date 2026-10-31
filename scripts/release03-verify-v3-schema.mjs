// Temporary PostgreSQL-only validation: must NEVER accept a Neon/Production URL.
// Runs in GitHub Actions postgres:16 service after prisma migrate deploy.
import { Client } from 'pg';
const url=process.env.DATABASE_URL;
if(!url){throw new Error('Missing test DATABASE_URL');}
const address=new URL(url);
if(address.hostname!=='127.0.0.1'&&address.hostname!=='localhost'){
  throw new Error('FAIL: PostgreSQL host must be local ephemeral CI service');
}
if(address.pathname!=='/prolig_release03_ci'){
  throw new Error('FAIL: PostgreSQL DB must be prolig_release03_ci');
}
const db=new Client({connectionString:url});
await db.connect();
try{
 const {rows}=await db.query(`SELECT
   (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name='Task' AND column_name='targetQuestionCount') AS task_target,
   (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name='Question' AND column_name='taskId' AND is_nullable='YES') AS task_relation,
   to_regclass('"ProjectUnitPlan"') IS NOT NULL AS has_v4,
   (SELECT COUNT(*)::int FROM pg_enum WHERE enumtypid='"RoleCode"'::regtype AND enumlabel='IL_KOORDINATORU') AS old_il,
   (SELECT COUNT(*)::int FROM pg_enum WHERE enumtypid='"RoleCode"'::regtype AND enumlabel='BRANS_KOORDINATORU') AS illegal_new_brans,
   (SELECT COUNT(*)::int FROM "_prisma_migrations" WHERE migration_name='20261029010000_task_question_production_v3' AND finished_at IS NOT NULL) AS v3_applied,
   (SELECT COUNT(*)::int FROM "_prisma_migrations" WHERE migration_name LIKE '20261027010000_branch%' OR migration_name LIKE '20261029030000_unit%') AS forbidden_migrations`);
 const r=rows[0];
 if(r.task_target!==1||r.task_relation!==1||r.has_v4||r.old_il!==1||r.illegal_new_brans!==0||r.v3_applied!==1||r.forbidden_migrations!==0)
   throw new Error('Release03 minimal schema invariants FAIL: '+JSON.stringify(r));
 const count=await db.query(`SELECT COUNT(*)::int AS c FROM information_schema.table_constraints
 WHERE table_name='Question' AND constraint_type='FOREIGN KEY'`);
 if(count.rows[0].c<2) throw new Error('Expected Question foreign-key constraints absent');
 console.log('RELEASE-03 V3 ISOLATION + MIGRATION: PASS');
}finally {await db.end();}
