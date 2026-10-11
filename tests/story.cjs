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
run(fs.readFileSync(root+'/data/story-ui.js','utf8'));
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.SAIKACHI_SCENARIO)),JSON.parse(fs.readFileSync(root+'/data/scenario.json')));
const end=()=>run('for(let i=0;i<100&&state.mode==="dialogue"&&!choicesPending;i++)advance()');
const click=label=>{const b=elements.panelBody?.children.find(b=>b.textContent===label)||elements.openingActions.children.find(b=>b.textContent===label);assert(b,'missing button '+label);b.onclick({stopPropagation(){}})};
check('state.mode==="opening"');click('最初から');for(let i=0;i<3;i++)click('つづける');click('調査をはじめる');end();check('state.mode==="exploration" && state.flags.introSeen');
run('examine("desk")');end();check('!state.flags.layoutChecked');run('moveTo("corridor")');end();run('examine("notice")');end();check('!state.flags.dutyChecked');run('moveTo("classroom")');
for(const id of ['window','floor','prepDoor']){run(`examine('${id}')`);end()}
run('examine("shelf")');end();check('state.flags.sketchFound && state.inventory.length===1');run('examine("shelf")');end();check('state.inventory.length===1');
run('examine("desk")');end();check('state.flags.layoutChecked');run('moveTo("corridor")');end();run('examine("notice")');end();check('state.flags.dutyChecked');run('moveTo("classroom");examine("shelf")');end();check('state.inventory.length===2 && !state.flags.okaboChecked');
run('menu()');click('もちもの');click('オカボーのスケッチブック');click('しらべる');end();check('state.flags.okaboChecked && state.mode==="deduction"');
click('ナカコ');check('state.errors===1 && state.deductionStep===0');click('調査にもどる');
run('const saved=Saves.snapshot(state,textSettings);Saves.write(1,saved);');check('Saves.read(1).progress.flags.okaboChecked');
run('const beforeVisits=JSON.stringify(state.visits);restoreSave(Saves.read(1))');check('JSON.stringify(state.visits)===beforeVisits && state.mode==="exploration"');
run('menu()');click('推理を再開する');
for(const answer of ['オカボー','果物','落書きがされていた','オカボー']){click(answer);end()}
check('state.deductionStep===4 && state.mode==="deduction"');
click('この答えで決定');check('state.mode==="deduction" && !state.flags.deductionDone');
const groups=elements.panelBody?.children.find(e=>e.className==='answer-groups');const selects=groups.children.map(l=>l.children[0]);
selects.forEach(s=>s.value='0');click('この答えで決定');check('state.errors===1 && !state.flags.deductionDone');
['3','1','2'].forEach((v,i)=>selects[i].value=v);click('この答えで決定');check('state.mode==="dialogue" && !state.flags.deductionDone');end();check('state.flags.deductionDone && state.mode==="menu"');
run('closePanel();const complete=Saves.snapshot(state,textSettings);Saves.write(2,complete);restoreSave(Saves.read(2));');check('state.flags.deductionDone');
run('inspectItem("オカボーのスケッチブック")');end();check('state.mode==="exploration"');
assert.throws(()=>run('Saves.decode(JSON.stringify({...saved,scenarioId:"missing-sketch-demo"}))'));
assert.throws(()=>run('Saves.decode("bad json")'));
assert.throws(()=>run('Saves.validate({...saved,progress:{...saved.progress,inventory:["未知の証拠"]}})'));
// Every possible early investigation order must still allow the intended route.
for(const order of [['notice','desk','shelf'],['desk','shelf','notice'],['shelf','notice','desk']]){
 run('closeDialogueLayer();Object.assign(state,{mode:"exploration",room:"classroom",flags:{...SCENARIO.initial.flags},inventory:[],visits:{classroom:1},completedEvents:{}})');
 for(const id of order){run(`examine('${id}')`);end()}
 for(const id of ['shelf','desk','notice','shelf']){run(`examine('${id}')`);end()}
 run('inspectItem("オカボーのスケッチブック")');end();check('state.mode==="deduction"');
}
console.log('PASS: opening, premature clues, optional targets, four flags, item inspections, duplicate prevention, five puzzles, incorrect/incomplete answers, ending, interruption/resume, save/load/export-compatible snapshot, old/corrupt save rejection, JS/JSON parity. DOM substitute; not a real browser test.');

// Starting again after loading a completed save must clear all progress and pending dialogue.
run('restoreSave(Saves.read(2));Object.assign(state,{selected:"shelf",dialogue:SCENARIO.ending,lineIndex:2,afterDialogue:()=>{throw Error("stale callback")},deductionStep:4,errors:3});choicesPending=true;showTitle()');
const savedBeforeRestart=Array.from(storage.entries());
click('最初から');
check('state.mode==="opening" && state.room===SCENARIO.initial.room');
assert.deepEqual(JSON.parse(run('JSON.stringify(state.flags)')),JSON.parse(run('JSON.stringify(SCENARIO.initial.flags)')));
check('state.inventory.length===0 && Object.keys(state.completedEvents).length===0');
assert.deepEqual(JSON.parse(run('JSON.stringify(state.visits)')),JSON.parse(run('JSON.stringify({[SCENARIO.initial.room]:1})')));
check('state.selected===null && state.dialogue.length===0 && state.lineIndex===0 && state.afterDialogue===null && state.deductionStep===0 && state.errors===0 && !choicesPending');
assert.equal(elements.openingText.textContent,run('SCENARIO.opening[0]'));
assert.deepEqual(Array.from(storage.entries()),savedBeforeRestart);
for(let i=0;i<3;i++)click('つづける');click('調査をはじめる');end();
check('state.mode==="exploration" && state.flags.introSeen && !state.flags.deductionDone && state.inventory.length===0');
console.log('PASS: new game after completed save resets progress, replays opening, and preserves saved slots.');

// All three title-screen slots restore their own progress and settings.
run('moveTo("corridor")');end();
run('textSettings.index=3;textSettings.auto=true;Saves.write(3,Saves.snapshot(state,textSettings))');
assert.throws(()=>run('Saves.write(4,Saves.read(3))'));
assert.throws(()=>run('Saves.read(0)'));
for(const slot of [1,2,3]){
 const expected=JSON.parse(run(`JSON.stringify(Saves.read(${slot}))`));
 run('showTitle()');click('途中から');
 assert.equal(elements.panelTitle.textContent,'途中から');
 const slotButtons=elements.panelBody.children.filter(b=>/^記録[1-3]：/.test(b.textContent));
 assert.equal(slotButtons.length,3);
 slotButtons[slot-1].onclick();click('再開する');
 assert.deepEqual(JSON.parse(run('JSON.stringify({room:state.room,flags:state.flags,inventory:state.inventory,visits:state.visits,completedEvents:state.completedEvents})')),expected.progress);
 assert.deepEqual(JSON.parse(run('JSON.stringify({textSpeed:textSettings.index,auto:textSettings.auto})')),expected.settings);
 check('state.mode==="exploration"');
}
console.log('PASS: title continue restores each of three independent saved states and settings; slots outside 1–3 rejected.');
