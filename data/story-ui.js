'use strict';
// シナリオ固有の持ち物・調査メモ・推理表示。保存処理は既存の共通処理を使用する。
const questions=SCENARIO.questions;
let openingIndex=0,openingComplete=false,openingGeneration=0;
let deductionTransitionGeneration=0;
function note(text,cls='evidence-note'){
 const p=document.createElement('p');p.className=cls;p.textContent=text;$('panelBody').appendChild(p);return p;
}
function openingView(title,text,actions){
 cancelTextTimers();openingGeneration++;$('openingSynopsis').classList.add('hidden');$('opening').classList.remove('dissolve');closeDialogueLayer();state.mode='opening';render();$('panel').classList.add('hidden');
 $('opening').classList.remove('hidden');$('openingTitle').textContent=title;$('openingText').textContent=text;
 const box=$('openingActions');box.replaceChildren();
 for(const [label,fn] of actions){const b=document.createElement('button');b.textContent=label;if(label==='▼')b.setAttribute('aria-label','次へ');b.onclick=fn;box.appendChild(b)}
 box.querySelector('button')?.focus();
}
function openingPage(index){
 openingView('','',[]);openingIndex=index;openingComplete=false;
 $('openingSynopsis').classList.remove('hidden');$('openingCopy').textContent='';$('openingNext').classList.remove('ready');
 const chars=Array.from(SCENARIO.opening[index]);const generation=openingGeneration;let position=0;
 const complete=()=>{openingComplete=true;$('openingCopy').textContent=chars.join('');$('openingNext').classList.add('ready')};
 function tick(){if(generation!==openingGeneration||state.mode!=='opening')return;position++;$('openingCopy').textContent=chars.slice(0,position).join('');if(position<chars.length)typingTimer=setTimeout(tick,textSettings.speeds[textSettings.index]||16);else complete()}
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||textSettings.index===3)complete();else tick();
}
function advanceOpening(){
 if(state.mode!=='opening'||$('openingSynopsis').classList.contains('hidden'))return;
 if(!openingComplete){cancelTextTimers();openingComplete=true;$('openingCopy').textContent=SCENARIO.opening[openingIndex];$('openingNext').classList.add('ready');return}
 if(openingIndex<SCENARIO.opening.length-1){openingPage(openingIndex+1);return}
 state.mode='opening-transition';$('opening').classList.add('dissolve');
 const generation=++openingGeneration;
 const finish=()=>{if(generation!==openingGeneration)return;$('opening').classList.add('hidden');$('opening').classList.remove('dissolve');state.flags.introSeen=true;say(SCENARIO.intro)};
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)finish();else setTimeout(finish,600);
}
$('openingSynopsis').onclick=advanceOpening;
$('openingNext').onclick=e=>{e.stopPropagation();advanceOpening()};
function openingLoad(){
 $('opening').classList.add('hidden');saveSlots('load');
 const b=document.createElement('button');b.textContent='タイトルにもどる';b.onclick=showTitle;$('panelBody').appendChild(b);
}
function startNewGame(){
 deductionTransitionGeneration++;$('deductionStage').classList.add('hidden');$('deductionStage').classList.remove('closing');$('deductionFlash').classList.remove('flash');$('deductionStart').classList.remove('announce');deductionActive=false;lastConversationId=null;closeDialogueLayer();panelRevision++;choicesPending=false;typingDone=false;displayedChars=0;
 Object.assign(state,{mode:'opening',pendingDeduction:false,room:SCENARIO.initial.room,flags:{...SCENARIO.initial.flags},
  inventory:[],visits:{[SCENARIO.initial.room]:1},completedEvents:{},selected:null,
  dialogue:[],lineIndex:0,afterDialogue:null,deductionStep:0,errors:0});
 $('dialogueChoices').replaceChildren();$('panelBody').replaceChildren();
 openingPage(0);
}
function showTitle(){openingView('消えたスケッチ','サイカチADV / 試作版',[['最初から',startNewGame],['途中から',openingLoad]])}
function menu(){
 if(!state.flags.introSeen){showTitle();return}
 const buttons=[['セーブ',()=>saveSlots('save')],['途中から',()=>saveSlots('load')],['もちもの',inventory],['ちょうさメモ',memo]];
 if(state.flags.okaboChecked&&!state.flags.deductionDone)buttons.push(['推理を再開する',startDeduction]);
 if(state.flags.deductionDone)buttons.push(['エンディングを読み返す',()=>say(SCENARIO.ending,showEnding)]);
 buttons.push(['人物相関図（次工程）',()=>panel('人物相関図',[['もどる',menu]])],['メール（次工程）',()=>panel('メール',[['もどる',menu]])],['操作方法',()=>{
  panel('操作方法',[['もどる',menu]]);note('「聞く」「調べる」「探す」「会話」「移動」から行動を選びます。調べる対象や探す人物は、調査で手がかりが増えると追加されます。発見した持ち物は、その場所の「調べる」からも確認できます。会話は事件に関する話を優先してランダムに表示します。会話をタップすると全文表示、もう一度タップすると次へ進みます。会話・推理を終えた探索中に保存できます。推理パートでは答えを選んで進めます。');
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
 if(!state.flags.okaboChecked||deductionActive)return;
 cancelTextTimers();deductionActive=true;state.deductionStep=0;state.errors=0;state.mode='deduction-transition';
 $('panel').classList.add('hidden');$('textControls').classList.add('hidden');$('characterStage').classList.remove('hidden');$('characterStage').classList.add('open');
 $('dialogue').classList.remove('hidden');$('dialogue').classList.add('open');render();
 $('deductionStage').classList.remove('closing');$('deductionStage').classList.remove('hidden');$('deductionStage').getBoundingClientRect();
 const generation=++deductionTransitionGeneration;
 const finish=()=>{if(generation!==deductionTransitionGeneration)return;$('deductionStart').classList.remove('announce');deduction()};
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){$('deductionStage').classList.add('closing');finish();return}
 requestAnimationFrame(()=>{$('deductionStage').classList.add('closing')});
 setTimeout(()=>{if(generation===deductionTransitionGeneration)$('deductionFlash').classList.add('flash')},650);
 setTimeout(()=>{if(generation===deductionTransitionGeneration)$('deductionStart').classList.add('announce')},850);
 setTimeout(finish,1850);
}
function deductionMessage(text){
 closeDialogueLayer();choicesPending=false;
 state.dialogue=[['サイジ',text,'思案']];state.lineIndex=0;state.afterDialogue=null;
 $('dialogue').classList.remove('hidden');$('dialogue').classList.add('open');
 $('characterStage').classList.remove('hidden');$('textControls').classList.add('hidden');
 state.dialogue=paginateDialogue(state.dialogue);displayLine();if(state.dialogue.length===1)$('nextMark').classList.remove('ready');
}
function deduction(){
 panel('謎'+(state.deductionStep+1)+' / 5：'+questions[state.deductionStep].q,[]);
 state.mode='deduction';render();
 const q=questions[state.deductionStep];
 deductionMessage(q.lead||q.q);
 const status=note('','answer-status');status.setAttribute('role','status');
 const wrong=()=>{state.errors++;deductionMessage('もう一度、手がかりを思い出してみよう。'+(state.errors>=2?' '+q.hint:''))};
 const correct=()=>{
  if(state.mode!=='deduction')return;
  state.errors=0;
  if(q.type==='compose'){say(SCENARIO.ending,()=>{state.flags.deductionDone=true;showEnding()});return}
  say(q.lines,()=>{state.deductionStep++;deduction()});
 };
 if(q.type==='compose'){
  const selected=[null,null,null];let active=0;
  const sentence=document.createElement('div');sentence.className='answer-sentence';
  const slots=[];
  for(let i=0;i<3;i++){
   const slot=document.createElement('button');slot.type='button';slot.className='answer-slot';slot.setAttribute('aria-label',q.groups[i].label);slot.dataset.slot=String(i);
   slot.onclick=()=>{if(state.mode!=='deduction')return;active=i;refresh()};slots.push(slot);sentence.appendChild(slot);
   const join=document.createElement('span');join.textContent=['が','、','した。'][i];sentence.appendChild(join);
  }
  $('panelBody').appendChild(sentence);
  const pool=document.createElement('div');pool.className='answer-pool';pool.setAttribute('aria-label','文章の選択肢');$('panelBody').appendChild(pool);
  const options=[...new Set(q.groups.flatMap(g=>g.opts))];
  for(let i=options.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[options[i],options[j]]=[options[j],options[i]]}
  const buttons=[];
  for(const option of options){const b=document.createElement('button');b.className='answer-option';b.type='button';b.textContent=option;b.onclick=()=>{if(state.mode!=='deduction'||selected.includes(option))return;selected[active]=option;refresh()};buttons.push(b);pool.appendChild(b)}
  function refresh(){slots.forEach((b,i)=>{b.textContent=selected[i]||String.fromCharCode(65+i);b.classList.toggle('active',i===active);b.setAttribute('aria-pressed',String(i===active))});for(const b of buttons){b.disabled=selected.includes(b.textContent);b.classList.toggle('used',b.disabled)}}
  refresh();
  const confirm=document.createElement('button');confirm.className='answer-confirm';confirm.textContent='この答えで決定';confirm.onclick=()=>{
   if(state.mode!=='deduction')return;
   if(selected.some(v=>v===null)){deductionMessage('A・B・Cの3つを選んでください。');return}
   selected.every((v,i)=>v===q.groups[i].opts[q.groups[i].correct])?correct():wrong();
  };$('panelBody').appendChild(confirm);
 }else q.opts.forEach((option,i)=>{
  const b=document.createElement('button');b.className='deduction-choice';b.textContent=option;
  b.onclick=()=>{if(state.mode==='deduction')i===q.correct?correct():wrong()};$('panelBody').appendChild(b);
 });

}
function showEnding(){
 deductionActive=false;$('deductionStage').classList.add('hidden');closeDialogueLayer();
 panel('消えたスケッチ — 終わり',[['タイトルへ',showTitle]]);
 note('試作版をプレイしていただき、ありがとうございました。');
}
showTitle();
