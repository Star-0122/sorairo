import { validateInput, generatePassword, createStudent } from './core.ts'
let pass=0,fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('  OK  ',m)}else{fail++;console.log('  NG  ',m)} }
// --- 入力チェック ---
const v=(x)=>validateInput(x)
ok(!v(null).ok,'null は拒否'); ok(!v({}).ok,'空は拒否'); ok(v({email:' A@B.jp ',name:' 花 ',org:''}).ok && v({email:' A@B.jp ',name:' 花 ',org:''}).value.email==='a@b.jp','メールは小文字化・空白除去')
ok(!v({email:'abc',name:'x'}).ok,'メール形式NG'); ok(!v({email:'a@b.jp',name:''}).ok,'氏名なしNG'); ok(!v({email:'a@b.jp',name:'あ'.repeat(31)}).ok,'氏名31文字NG'); ok(v({email:'a@b.jp',name:'あ'.repeat(30)}).ok,'氏名30文字OK'); ok(!v({email:'a@b.jp',name:'x',org:'あ'.repeat(41)}).ok,'所属41文字NG')
ok(!v({email:'a@b.jp',name:123}).ok,'型違い(数値)NG')
// --- パスワード生成 ---
const ps=Array.from({length:2000},()=>generatePassword()); ok(ps.every(p=>p.length===12),'常に12文字'); ok(ps.every(p=>/^[A-HJ-NP-Za-km-z2-9]+$/.test(p)),'紛らわしい文字(0 O 1 l I)を含まない'); ok(new Set(ps).size===ps.length,'2000回で重複なし')
const cnt={};for(const p of ps.join(''))cnt[p]=(cnt[p]||0)+1;const vals=Object.values(cnt);ok(Math.max(...vals)/Math.min(...vals)<1.5,'文字の出現に極端な偏りなし(最大/最小='+(Math.max(...vals)/Math.min(...vals)).toFixed(2)+')')
// --- 発行処理(偽のクライアントで検証) ---
function fake({user={id:'ADM'},role={role_id:'admin'},status='active',createErr=null,failStep=null}={}){
  const calls=[]
  const tbl=(name)=>({
    select:()=>({eq:(...a)=>({eq:(...b)=>({maybeSingle:async()=>({data:role,error:null})}),maybeSingle:async()=>({data:{status},error:null})})}),
    update:(v)=>({eq:async()=>{calls.push(['update',name,v]);return {error:failStep==='profile'?{message:'x'}:null}}}),
    insert:async(v)=>{calls.push(['insert',name,v]);return {error:failStep===name?{message:'x'}:null}},
  })
  return {calls,auth:{getUser:async()=>user?{data:{user},error:null}:{data:{user:null},error:{message:'bad'}},admin:{
    createUser:async(a)=>{calls.push(['createUser',a]);return createErr?{data:null,error:createErr}:{data:{user:{id:'NEW'}},error:null}},
    deleteUser:async(id)=>{calls.push(['deleteUser',id]);return {}}}},from:tbl}
}
const inp={email:'s@x.jp',name:'生徒',org:'中学'}
let c=fake(); let r=await createStudent(c,'jwt',inp,'PASS12345678')
ok(r.status===200&&r.body.id==='NEW'&&r.body.password==='PASS12345678','管理者は発行できる(200)')
ok(c.calls.find(x=>x[0]==='insert'&&x[1]==='user_roles')[2].role_id==='student','ロールは「生徒」に固定')
ok(!c.calls.some(x=>x[0]==='insert'&&x[1]==='user_roles'&&x[2].role_id!=='student'),'生徒以外のロールは付与されない')
ok(c.calls.find(x=>x[0]==='createUser')[1].email_confirm===true,'メール確認済みで作成')
ok(c.calls.some(x=>x[1]==='audit_logs'),'操作記録が残る')
c=fake({user:null}); r=await createStudent(c,'bad',inp,'p'); ok(r.status===401&&!c.calls.some(x=>x[0]==='createUser'),'無効なトークンは401・作成されない')
c=fake({role:null}); r=await createStudent(c,'jwt',inp,'p'); ok(r.status===403&&!c.calls.some(x=>x[0]==='createUser'),'管理者でない人は403・作成されない')
c=fake({status:'suspended'}); r=await createStudent(c,'jwt',inp,'p'); ok(r.status===403&&!c.calls.some(x=>x[0]==='createUser'),'停止中の管理者は403・作成されない')
c=fake({createErr:{message:'User already registered',status:422}}); r=await createStudent(c,'jwt',inp,'p'); ok(r.status===409,'登録済みメールは409')
c=fake({failStep:'profile'}); r=await createStudent(c,'jwt',inp,'p'); ok(r.status===500&&c.calls.some(x=>x[0]==='deleteUser'&&x[1]==='NEW'),'プロフィール保存に失敗→作成したアカウントを取り消す')
c=fake({failStep:'user_roles'}); r=await createStudent(c,'jwt',inp,'p'); ok(r.status===500&&c.calls.some(x=>x[0]==='deleteUser'),'ロール付与に失敗→作成したアカウントを取り消す')
console.log(`\n結果: ${pass}件OK / ${fail}件NG`); process.exit(fail?1:0)
