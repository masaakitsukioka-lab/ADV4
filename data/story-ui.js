'use strict';
// シナリオ固有の持ち物・調査メモ・推理表示。保存処理は既存の共通処理を使用する。
const questions=SCENARIO.questions;
function note(text,cls='evidence-note'){
 const p=document.createElement('p');p.className=cls;p.textContent=text;$('panelBody').appendChild(p);return p;
}
function openingView(title,text,actions){
 closeDialogueLayer();state.mode='opening';render();$('panel').classList.add('hidden');
 $('opening').classList.remove('hidden');$('openingTitle').textContent=title;$('openingText').textContent=text;
 const box=$('openingActions');box.replaceChildren();
 for(const [label,fn] of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;box.appendChild(b)}
 box.querySelector('button')?.focus();
}
function openingPage(index){
 if(index<SCENARIO.opening.length){openingView('',SCENARIO.opening[index],[['つづける',()=>openingPage(index+1)]]);return}
 openingView('消えたスケッチ','試作版',[['調査をはじめる',()=>{
  $('opening').classList.add('hidden');state.flags.introSeen=true;say(SCENARIO.intro);
 }]]);
}
function openingLoad(){
 $('opening').classList.add('hidden');saveSlots('load');
 const b=document.createElement('button');b.textContent='タイトルにもどる';b.onclick=showTitle;$('panelBody').appendChild(b);
}
function showTitle(){openingView('消えたスケッチ','サイカチADV / 試作版',[['はじめる',()=>openingPage(0)],['ロード',openingLoad]])}
function menu(){
 if(!state.flags.introSeen){showTitle();return}
 const buttons=[['セーブ',()=>saveSlots('save')],['ロード',()=>saveSlots('load')],['セーブの持ち運び',transferMenu],['もちもの',inventory],['ちょうさメモ',memo]];
 if(state.flags.okaboChecked&&!state.flags.deductionDone)buttons.push(['推理を再開する',startDeduction]);
 if(state.flags.deductionDone)buttons.push(['エンディングを読み返す',()=>say(SCENARIO.ending,showEnding)]);
 buttons.push(['人物相関図（次工程）',()=>panel('人物相関図',[['もどる',menu]])],['メール（次工程）',()=>panel('メール',[['もどる',menu]])],['操作方法',()=>{
  panel('操作方法',[['もどる',menu]]);note('対象をタップ →「しらべる」。持ち物は「メニュー → もちもの」から調べます。会話をタップすると全文表示、もう一度タップすると次へ進みます。会話・推理を終えた探索中に保存できます。推理を中断した場合はメニューから再開できます。');
 }]);panel('メニュー',buttons);
}
function inventory(){
 const buttons=state.inventory.map(item=>[item,()=>{
  panel(item,[['しらべる',()=>inspectItem(item)],['もどる',inventory]]);
 }]);if(!buttons.length)buttons.push(['まだ何も持っていない',()=>{}]);
 buttons.push(['もどる',menu]);panel('もちもの',buttons);
}
function inspectItem(item){
 if(!state.inventory.includes(item))return;
 const event=Events.select(SCENARIO.items[item]?.events||[],state);
 if(event)runEvent(event);
}
function memo(){
 panel('ちょうさメモ',[['もどる',menu]]);
 const entries=[
  [state.flags.sketchFound,'ナカコのスケッチブック：先週のクロ研で描いた1ページが破かれている。','作品棚を調べよう。'],
  [state.flags.layoutChecked,'配置図：ナカコとオカボーは同じ果物を描いた。オカボーは「創造の後には破壊がセット」と話していた。','机の配置図を確認しよう。'],
  [state.flags.dutyChecked,'当番表：その日の当番はオカボー。スケッチブックの出し入れとモチーフを管理する係だ。','旧校舎廊下の掲示板を確認しよう。'],
  [state.flags.okaboChecked,'オカボーのスケッチブック：完成作には落書き。今週の描き途中の絵には落書きがない。','準備室の作品棚と、手に入れた持ち物を調べよう。']
 ];
 let nextShown=false;
 for(const [done,text,hint] of entries){if(done)note('✓ '+text);else if(!nextShown){note('次の調査：'+hint);nextShown=true}}
 if(state.flags.deductionDone)note('解決：オカボーが自分の絵と間違ってナカコの絵に落書きし、そのページを破いて隠した。');
 else if(state.flags.okaboChecked)note('ヒントが揃った。メニューから推理を再開できる。');
}
function startDeduction(){
 if(!state.flags.okaboChecked)return;
 closeDialogueLayer();state.deductionStep=0;state.errors=0;deduction();
}
function deduction(){
 panel('謎'+(state.deductionStep+1)+' / 5：'+questions[state.deductionStep].q,[]);
 state.mode='deduction';render();
 const q=questions[state.deductionStep];
 if(q.lead)note('サイジ「'+q.lead+'」');
 const status=note('','answer-status');status.setAttribute('role','status');
 const wrong=()=>{state.errors++;status.textContent='サイジ「もう一度、手がかりを思い出してみよう。」'+(state.errors>=2?' ヒント：'+q.hint:'')};
 const correct=()=>{
  if(state.mode!=='deduction')return;
  $('panel').classList.add('hidden');state.errors=0;
  if(q.type==='compose'){say(SCENARIO.ending,()=>{state.flags.deductionDone=true;showEnding()});return}
  say(q.lines,()=>{state.deductionStep++;deduction()});
 };
 if(q.type==='compose'){
  const preview=note('（A）が、（B）、ナカコのスケッチに（C）をした！','answer-preview');
  const groups=document.createElement('div');groups.className='answer-groups';const selects=[];
  q.groups.forEach((group,i)=>{
   const label=document.createElement('label');label.textContent=group.label;
   const select=document.createElement('select');select.setAttribute('aria-label',group.label);
   const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='選んでください';select.appendChild(placeholder);
   group.opts.forEach((text,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=text;select.appendChild(option)});
   select.onchange=()=>{const v=selects.map((s,j)=>s.value===''?'（'+String.fromCharCode(65+j)+'）':q.groups[j].opts[Number(s.value)]);preview.textContent=v[0]+'が、'+v[1]+'、ナカコのスケッチに'+v[2]+'をした！'};
   selects.push(select);label.appendChild(select);groups.appendChild(label);
  });$('panelBody').appendChild(groups);
  const confirm=document.createElement('button');confirm.textContent='この答えで決定';confirm.onclick=()=>{
   if(selects.some(s=>s.value==='')){status.textContent='A・B・Cの3つを選んでください。';return}
   selects.every((s,i)=>Number(s.value)===q.groups[i].correct)?correct():wrong();
  };$('panelBody').appendChild(confirm);
 }else q.opts.forEach((option,i)=>{
  const b=document.createElement('button');b.className='deduction-choice';b.textContent=option;
  b.onclick=()=>i===q.correct?correct():wrong();$('panelBody').appendChild(b);
 });
 const back=document.createElement('button');back.textContent='調査にもどる';back.onclick=closePanel;$('panelBody').appendChild(back);
}
function showEnding(){
 panel('消えたスケッチ — 終わり',[['調査画面にもどる',closePanel],['メニュー',menu]]);
 note('試作版をプレイしていただき、ありがとうございました。');
}
showTitle();
