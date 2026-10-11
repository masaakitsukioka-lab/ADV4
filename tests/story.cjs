const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
class Element{
 constructor(){this.children=[];this.style={};this.dataset={};this.textContent='';this.value='';this.offsetWidth=180;this.offsetHeight=50;const c=new Set();this.classList={add:x=>c.add(x),remove:x=>c.delete(x),contains:x=>c.has(x),toggle:(x,on)=>on?c.add(x):c.delete(x)}}
 set innerHTML(v){this.children=[]} appendChild(x){this.children.push(x);return x} replaceChildren(){this.children=[]}
 addEventListener(t,f){this[t]=f} setAttribute(k,v){this[k]=v} focus(){} querySelector(){return this.children[0]} remove(){} click(){this.onclick?.()}
 getBoundingClientRect(){return{width:844,height:390,left:0,top:0,bottom:200}} getContext(){return{clearRect(){},fillRect(){}}}
 get nextElementSibling(){return this._next||(this._next=new Element())}
}
const elements={},storage=new Map(),document={getElementById:id=>elements[id]||(elements[id]=new Element()),createElement:()=>new Element(),addEventListener(){},querySelector:()=>new Element(),body:new Element()};
const sandbox={document,window:{addEventListener(){},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}},Image:class{},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:f=>f(),matchMedia:()=>({matches:true}),console,Blob,URL};
vm.createContext(sandbox);const run=c=>vm.runInContext(c,sandbox);const check=c=>assert(run(c),c);
for(const f of ['scenario.js','events.js','saves.js'])run(fs.readFileSync(root+'/data/'+f,'utf8'));
const html=fs.readFileSync(root+'/index.html','utf8');for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))run(m[1]);
run(fs.readFileSync(root+'/data/commands.js','utf8'));
run(fs.readFileSync(root+'/data/story-ui.js','utf8'));
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.SAIKACHI_SCENARIO)),JSON.parse(fs.readFileSync(root+'/data/scenario.json')));
const end=()=>run('for(let i=0;i<100&&state.mode==="dialogue"&&!choicesPending;i++)advance()');
const allButtons=()=>{const out=[];const walk=e=>{for(const child of e?.children||[]){out.push(child);walk(child)}};for(const id of ['panelBody','commandRoots','commandChildren','openingActions'])walk(elements[id]);return out};
const click=label=>{const b=allButtons().find(b=>b.textContent===label);assert(b,'missing button '+label);assert(!b.disabled,'disabled '+label);b.onclick({stopPropagation(){}})};
const begin=()=>{run('showTitle()');click('最初から');for(let i=0;i<3;i++)run('advanceOpening()');end()};
check('state.mode==="opening"');begin();check('state.mode==="exploration" && state.flags.introSeen');
assert.equal(elements.commandRoots.children[0].textContent,'移動');
assert.equal(elements.targets.children.length,0);
run('Saves.write(1,Saves.snapshot(state,textSettings))');
click('聞く');assert.equal(elements.line.textContent,'ここには誰もいない。');end();
click('調べる');assert(!allButtons().some(b=>b.textContent==='モチーフの配置図'));
click('机');end();click('調べる');assert(allButtons().some(b=>b.textContent==='モチーフの配置図'));
check('!state.flags.layoutChecked');click('作品棚');end();check('state.inventory.length===1');
click('調べる');click('作品棚');end();check('state.inventory.length===1');
click('調べる');click('モチーフの配置図');end();check('state.flags.layoutChecked && state.flags.personOkabo');
click('移動');click('旧校舎廊下');end();check('commandSelection===null');
click('調べる');assert(!allButtons().some(b=>b.textContent.includes('スケッチブック')));
click('掲示板');end();check('state.flags.dutyChecked');
click('移動');click('美術準備室');check('commandSelection===null');
click('調べる');click('作品棚');end();check('state.inventory.length===2');
run('Saves.write(2,Saves.snapshot(state,textSettings))');
const beforeChat=run('JSON.stringify(Saves.read(2).progress)');
const chats=new Set();for(let i=0;i<10;i++){click('会話');check('state.mode==="dialogue"');chats.add(run('lastConversationId'));assert(run('SCENARIO.commands.conversations.find(t=>t.id===lastConversationId).eventRelated'));end()}
assert(chats.size>1);assert.equal(run('JSON.stringify(Saves.snapshot(state,textSettings).progress)'),beforeChat);
click('調べる');click('オカボーのスケッチブック');end();
check('state.mode==="deduction" && deductionActive');
assert(!elements.characterStage.classList.contains('hidden'));assert(!elements.dialogue.classList.contains('hidden'));
assert(!allButtons().some(b=>b.textContent==='調査にもどる'));
run('closePanel()');check('state.mode==="deduction" && deductionActive');
click('ナカコ');check('state.errors===1 && state.deductionStep===0');
for(const answer of ['オカボー','果物','落書きがされていた','オカボー']){click(answer);assert(!elements.panel.classList.contains('hidden'));end()}
check('state.deductionStep===4 && state.mode==="deduction"');
click('この答えで決定');check('!state.flags.deductionDone');
const sentence=elements.panelBody.children.find(e=>e.className==='answer-sentence');const slots=sentence.children.filter(e=>e.className==='answer-slot');
const pool=elements.panelBody.children.find(e=>e.className==='answer-pool');assert.equal(pool.children.length,12);
const choose=(i,label)=>{slots[i].onclick();click(label)};
choose(0,'ハルキ');choose(1,'面白がって');choose(2,'仕返し');click('この答えで決定');check('state.errors===1 && !state.flags.deductionDone');
choose(0,'オカボー');assert(pool.children.find(b=>b.textContent==='オカボー').disabled);assert(!pool.children.find(b=>b.textContent==='ハルキ').disabled);
const unchanged=slots[0].textContent;pool.children.find(b=>b.textContent==='オカボー').onclick();assert.equal(slots[0].textContent,unchanged);
choose(1,'間違って');choose(2,'落書き');click('この答えで決定');end();check('state.flags.deductionDone && !deductionActive');
run('closePanel();textSettings.index=3;textSettings.auto=true;Saves.write(3,Saves.snapshot(state,textSettings))');
for(const slot of [1,2,3]){
 const expected=JSON.parse(run(`JSON.stringify(Saves.read(${slot}))`));run('showTitle()');click('途中から');
 const b=elements.panelBody.children.find(b=>b.textContent.startsWith('記録'+slot+'：'));assert(b);b.onclick();click('再開する');
 assert.deepEqual(JSON.parse(run('JSON.stringify({room:state.room,flags:state.flags,inventory:state.inventory,visits:state.visits,completedEvents:state.completedEvents})')),expected.progress);
 assert.deepEqual(JSON.parse(run('JSON.stringify({textSpeed:textSettings.index,auto:textSettings.auto})')),expected.settings);
}
const storageBefore=Array.from(storage.entries());begin();assert.deepEqual(Array.from(storage.entries()),storageBefore);
check('state.inventory.length===0 && !state.flags.deductionDone && state.visits.classroom===1');
run('const legacy=JSON.parse(JSON.stringify(Saves.read(2)));for(const key of SCENARIO.commands.discoveryFlags)delete legacy.progress.flags[key];restoreSave(legacy)');check('state.flags.personOkabo && state.flags.layoutSeen');
assert.throws(()=>run('Saves.write(4,Saves.read(2))'));assert.throws(()=>run('Saves.read(0)'));assert.throws(()=>run('Saves.decode("bad json")'));
run('menu()');assert(!allButtons().some(b=>b.textContent==='セーブの持ち運び'));
const pages=JSON.parse(run('JSON.stringify(splitMessageText("あ".repeat(100),100,10))'));
assert.equal(pages.join('').replace(/\n/g,''),'あ'.repeat(100));assert(pages.every(p=>p.split('\n').length<=3));
// Production transition timers preserve the dialogue and defer the problem until after the announcement.
run('closePanel();deductionActive=false;state.flags.okaboChecked=true;state.mode="dialogue"');
const timed=[];sandbox.matchMedia=()=>({matches:false});sandbox.setTimeout=(fn,ms)=>{timed.push({fn,ms});return timed.length};
run('startDeduction()');check('state.mode==="deduction-transition"');assert(!elements.dialogue.classList.contains('hidden'));assert(!elements.characterStage.classList.contains('hidden'));
for(const ms of [650,850,1850]){const task=timed.find(t=>t.ms===ms);assert(task);task.fn()}
check('state.mode==="deduction"');
console.log('PASS: command-only story, room-local discovery, random chat, transition ordering, no deduction exit, persistent problem window, ABC placement/disabled choices, three saves, restart, legacy saves, three-line message pagination.');
