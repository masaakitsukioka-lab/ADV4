// DOM・Canvasを代替したロジック回帰。実ブラウザ操作/レイアウトの検証ではない。
const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Element {
 constructor(){this.children=[];this.style={};this.dataset={};this.textContent='';this.offsetWidth=180;this.offsetHeight=50;const c=new Set();this.classList={add:x=>c.add(x),remove:x=>c.delete(x),contains:x=>c.has(x),toggle:(x,on)=>on?c.add(x):c.delete(x)};}
 set innerHTML(v){this.children=[]} appendChild(x){this.children.push(x)} replaceChildren(){this.children=[]}
 addEventListener(type,fn){this[type]=fn}
 getBoundingClientRect(){return {width:844,height:390,left:0,top:0,bottom:200}}
 getContext(){return {clearRect(){},fillRect(){}}}
 get nextElementSibling(){return this._next||(this._next=new Element())}
}
const elements={};const document={getElementById:id=>elements[id]||(elements[id]=new Element()),createElement:()=>new Element(),addEventListener(){},querySelector:()=>new Element()};
const sandbox={document,window:{addEventListener(){}},Image:class{},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:fn=>fn(),matchMedia:()=>({matches:true}),console};
vm.createContext(sandbox);
const base=require('path').resolve(__dirname,'..')+'/';
for(const f of ['data/scenario.js','data/events.js','data/saves.js'])vm.runInContext(fs.readFileSync(base+f,'utf8'),sandbox);
const html=fs.readFileSync(base+'index.html','utf8');
vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'),sandbox);
const run=c=>vm.runInContext(c,sandbox);
const check=c=>assert(run(c),c);
const end=()=>run('for(let i=0;i<30&&state.mode==="dialogue"&&!choicesPending;i++)advance()');
const click=label=>{const b=elements.panelBody.children.find(x=>x.textContent===label)||elements.dialogueChoices.children.find(x=>x.textContent===label);assert(b,'button: '+label);b.onclick({stopPropagation(){}})};

document.getElementById('panelBody');
const map=new Map();sandbox.window.localStorage={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v)};
const stateJSON=()=>run('JSON.stringify({room:state.room,flags:state.flags,inventory:state.inventory,visits:state.visits,completedEvents:state.completedEvents})');
// 本来のプレイ操作で状態を作り保存する。
run('examine("shelf")');end();run('examine("desk")');end();click('スケッチについて聞く');end();
run('moveTo("corridor");examine("notice")');end();run('moveTo("classroom")');end();run('examine("shelf")');end();
run('textSettings.index=2;textSettings.auto=true');
const original=stateJSON();elements.menu.onclick();click('セーブ');
assert(elements.panelTitle.textContent==='セーブ');click('記録1：空き');
assert(elements.panelBody.children.some(x=>x.textContent==='記録1に保存しました。'));assert.equal(map.size,1);
run('moveTo("corridor");state.flags.sketchDiscussed=false;state.inventory=[];textSettings.index=0;textSettings.auto=false');
const changed=stateJSON();run('selectSaveSlot("load",1)');click('やめる');assert.equal(stateJSON(),changed);
run('selectSaveSlot("load",1)');click('再開する');assert.equal(stateJSON(),original);
check('state.mode==="exploration" && textSettings.index===2 && textSettings.auto===true');
check('state.afterDialogue===null && state.dialogue.length===0 && state.selected===null && !choicesPending');
run('moveTo("corridor");moveTo("classroom")');check('state.mode==="exploration"');
run('examine("shelf")');end();check('state.inventory.length===1');
console.log('PASS: menu save/load/cancel, flags/items/visits/once history/settings round trip, no repeated event or item');
// スロットの独立性と上書きキャンセル。
const raw1=run('Saves.raw(1)');run('selectSaveSlot("save",1)');click('やめる');assert.equal(run('Saves.raw(1)'),raw1);
run('moveTo("corridor");selectSaveSlot("save",2)');assert.equal(run('Saves.read(2).progress.room'),'corridor');assert.equal(run('Saves.raw(1)'),raw1);
run('selectSaveSlot("save",1)');click('上書きする');assert.equal(run('Saves.read(1).progress.room'),'corridor');
run('selectSaveSlot("load",3)');assert(elements.panelBody.children.some(x=>x.textContent.includes('まだ保存されていません')));
// 別の保存サービスインスタンス（再起動相当）でも同じ記録を取得。
run('const reopened=window.SaikachiSaves.create(SCENARIO,()=>window.localStorage)');assert.equal(run('JSON.stringify(reopened.read(1))'),run('JSON.stringify(Saves.read(1))'));
console.log('PASS: 3 slots, empty load, overwrite/cancel, persistence across service instances');
// 推理完了後の復元。
run('moveTo("classroom");startDeduction()');click('2. 整理作業で移動された可能性がある');click('3. 整理票の切れ端と作品整理日の掲示');end();
run('selectSaveSlot("save",3);state.flags.deductionDone=false;selectSaveSlot("load",3)');click('再開する');check('state.flags.deductionDone');
// 不正データはゲーム状態・保存内容を変更せず拒否する。
const saved=JSON.parse(run('JSON.stringify(Saves.read(1))'));
const rejects=mutate=>{const d=JSON.parse(JSON.stringify(saved));mutate(d);sandbox.bad=d;const before=stateJSON();assert.throws(()=>run('Saves.validate(bad)'));run('restoreSave(bad)');assert.equal(stateJSON(),before)};
rejects(d=>d.format=99);rejects(d=>d.scenarioId='another');rejects(d=>d.saveRevision=2);
rejects(d=>d.progress.room=['corridor']);rejects(d=>d.savedAt='broken');rejects(d=>d.progress.room='missing');rejects(d=>delete d.progress.flags.shelfChecked);
rejects(d=>d.progress.flags.shelfChecked='true');rejects(d=>d.progress.flags.unknown=true);
rejects(d=>d.progress.visits.corridor=-1);rejects(d=>d.progress.visits.corridor=0);rejects(d=>d.progress.visits.corridor=1.5);
rejects(d=>d.progress.inventory=['fake']);rejects(d=>d.progress.inventory=['整理票の切れ端','整理票の切れ端']);
rejects(d=>d.progress.completedEvents.unknown=true);rejects(d=>d.settings.textSpeed=4);rejects(d=>d.settings.auto='false');
rejects(d=>{d.progress.flags=JSON.parse('{"__proto__":true}');});
assert.throws(()=>run('Saves.decode("{broken")'));
const key1=[...map.keys()].find(x=>x.endsWith('.1'));map.set(key1,'{broken');const before=stateJSON();run('selectSaveSlot("load",1)');assert.equal(stateJSON(),before);assert.equal(map.get(key1),'{broken');
console.log('PASS: completed deduction restore; malformed/incompatible/invalid data rejected without progress mutation');
// ストレージ拒否と容量不足。
const storage=sandbox.window.localStorage;
Object.defineProperty(sandbox.window,'localStorage',{configurable:true,get(){throw new Error('denied')}});
run('saveSlots("load")');assert(elements.panelBody.children.some(x=>x.textContent.includes('利用できません')));
Object.defineProperty(sandbox.window,'localStorage',{configurable:true,value:{getItem:storage.getItem,setItem(){throw new Error('quota')}}});
const raw2=map.get([...map.keys()].find(x=>x.endsWith('.2')));run('selectSaveSlot("save",2)');click('上書きする');
assert(elements.panelBody.children.some(x=>x.textContent.includes('保存できませんでした')));assert.equal(map.get([...map.keys()].find(x=>x.endsWith('.2'))),raw2);
// 会話・推理の途中は保存対象にしない。
run('playTopic("intro")');assert.throws(()=>run('Saves.snapshot(state,textSettings)'));end();assert.throws(()=>run('Saves.snapshot(state,textSettings)'));
run('choicesPending=false;startDeduction()');assert.throws(()=>run('Saves.snapshot(state,textSettings)'));
console.log('PASS: storage denied/quota errors preserve existing saves; dialogue/choice/deduction saving rejected');
