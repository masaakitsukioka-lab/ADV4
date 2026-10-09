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

(async()=>{
 document.getElementById('panelBody');
 const map=new Map();const storage={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v)};
 sandbox.window.localStorage=storage;sandbox.Blob=Blob;
 const objects=new Map(),downloads=[],revoked=[];let urlId=0;
 sandbox.URL={createObjectURL:blob=>{const url='blob:test-'+(++urlId);objects.set(url,blob);return url},revokeObjectURL:url=>revoked.push(url)};
 document.body=new Element();
 document.createElement=tag=>{const el=new Element();el.remove=()=>{document.body.children=document.body.children.filter(x=>x!==el)};el.click=()=>{if(tag==='a')downloads.push({blob:objects.get(el.href),name:el.download})};return el};
 const progress=()=>run('JSON.stringify({room:state.room,flags:state.flags,inventory:state.inventory,visits:state.visits,completedEvents:state.completedEvents})');
 run('examine("shelf")');end();run('moveTo("corridor");examine("notice")');end();run('moveTo("classroom")');end();run('examine("shelf")');end();
 const original=progress();elements.menu.onclick();click('セーブの持ち運び');click('今の進行を書き出す');
 assert.equal(downloads.length,1);assert.match(downloads[0].name,/^saikachi-save-current-\d+\.json$/);
 const text=await downloads[0].blob.text();const exported=JSON.parse(text);
 assert.equal(exported.progress.inventory[0],'整理票の切れ端');assert.equal(progress(),original);assert.equal(map.size,0);assert.equal(document.body.children.length,0);
 run('selectSaveSlot("save",1)');run('moveTo("corridor");exportProgress(1)');
 assert.equal(JSON.parse(await downloads[1].blob.text()).progress.room,'classroom');
 assert.equal(run('state.room'),'corridor');run('exportProgress(3)');assert.equal(downloads.length,2);
 // 前版の検証器で書き出したファイルを確認。互換性番号は変えない。
 const old={window:{}};vm.createContext(old);
 for(const f of ['data/scenario.js','data/saves.js'])vm.runInContext(fs.readFileSync(require('path').resolve(__dirname,'fixtures/v010',f),'utf8'),old);
 old.payload=exported;vm.runInContext('window.SaikachiSaves.create(window.SAIKACHI_SCENARIO,()=>null).validate(payload)',old);
 console.log('PASS: current/slot export contents, empty slot, no progress mutation, v0.10 format compatibility');
 sandbox.file={size:Buffer.byteLength(text),text:async()=>text};
 const before=progress();const raw1=run('Saves.raw(1)');
 await run('readSaveFile(file)');assert.equal(elements.panelTitle.textContent,'読み込む記録の確認');
 assert.equal(progress(),before);assert.equal(map.size,1);click('やめる');assert.equal(progress(),before);
 await run('readSaveFile(file)');click('記録2に保存（空き）');assert.equal(map.size,1);click('保存する');
 assert.equal(map.size,2);assert.equal(run('Saves.raw(1)'),raw1);assert.equal(progress(),before);
 run('selectSaveSlot("load",2)');click('再開する');assert.equal(progress(),original);
 run('moveTo("corridor");moveTo("classroom")');check('state.mode==="exploration"');run('examine("shelf")');end();check('state.inventory.length===1');
 await run('readSaveFile(file)');click('記録1に保存（記録あり）');click('やめる');assert.equal(run('Saves.raw(1)'),raw1);
 click('記録1に保存（記録あり）');click('上書きする');assert.deepEqual(JSON.parse(run('Saves.raw(1)')),exported);
 console.log('PASS: import preview/cancel/slot selection/confirmation/overwrite; imported load with once and inventory preserved');
 // 前バージョンの保存データを読み込む（同じ保存仕様）。
 const oldSave=vm.runInContext('window.SaikachiSaves.create(window.SAIKACHI_SCENARIO,()=>null).snapshot({mode:"exploration",room:window.SAIKACHI_SCENARIO.initial.room,flags:window.SAIKACHI_SCENARIO.initial.flags,inventory:[],visits:{classroom:1},completedEvents:{}},{index:1,auto:false})',old);
 sandbox.legacy={size:500,text:async()=>JSON.stringify(oldSave)};await run('readSaveFile(legacy)');assert.equal(elements.panelTitle.textContent,'読み込む記録の確認');
 const stableProgress=progress(),stableStorage=JSON.stringify([...map]);
 for(const value of ['{broken',JSON.stringify({...exported,scenarioId:'another'}),JSON.stringify({...exported,format:99}),JSON.stringify({...exported,saveRevision:2})]){
  sandbox.badFile={size:value.length,text:async()=>value};await run('readSaveFile(badFile)');assert.equal(elements.panelTitle.textContent,'セーブ・ロード');
  assert.equal(progress(),stableProgress);assert.equal(JSON.stringify([...map]),stableStorage);
 }
 let read=false;sandbox.huge={size:1024*1024+1,text:async()=>{read=true;return text}};await run('readSaveFile(huge)');assert(!read);
 sandbox.failed={size:1,text:async()=>{throw new Error('read failure')}};await run('readSaveFile(failed)');assert.equal(progress(),stableProgress);
 sandbox.bom={size:text.length+3,text:async()=>'\uFEFF'+text};await run('readSaveFile(bom)');assert.equal(elements.panelTitle.textContent,'読み込む記録の確認');
 console.log('PASS: v0.10 import, corrupt/wrong scenario/version/oversize/read failure rejected; UTF-8 BOM accepted');
 // 遅れて完了する読込が、戻った画面を上書きしない。
 let resolve;sandbox.pending={size:100,text:()=>new Promise(r=>resolve=r)};
 const waiting=run('readSaveFile(pending)');run('closePanel()');resolve(text);await waiting;
 check('state.mode==="exploration"');assert.equal(progress(),stableProgress);
 const waiting2=run('readSaveFile(pending)');run('transferMenu()');resolve(text);await waiting2;assert.equal(elements.panelTitle.textContent,'セーブの持ち運び');
 const waiting3=run('readSaveFile(pending)');await run('readSaveFile(legacy)');resolve(text);await waiting3;
 assert(elements.panelBody.children.some(e=>e.textContent.includes('持ち物：0点')));
 // ファイル選択キャンセル、同じファイルの再選択を受け付ける。
 run('importPicker()');const input=elements.panelBody.children.find(e=>e.children.length).children[0];input.files=[];input.onchange();assert.equal(elements.panelTitle.textContent,'ファイルを読み込む');
 console.log('PASS: cancelled/stale/superseded async reads, file-picker cancellation');
 Object.defineProperty(sandbox.window,'localStorage',{configurable:true,get(){throw new Error('denied')}});
 run('exportProgress()');assert.equal(downloads.length,3);await run('readSaveFile(file)');assert(elements.panelBody.children.some(e=>e.textContent.includes('利用できません')));
 Object.defineProperty(sandbox.window,'localStorage',{configurable:true,value:{getItem:storage.getItem,setItem(){throw new Error('quota')}}});
 await run('readSaveFile(file)');click('記録1に保存（記録あり）');click('上書きする');assert.equal(JSON.stringify([...map]),stableStorage);
 assert(elements.panelBody.children.some(e=>e.textContent.includes('保存できませんでした')));
 sandbox.URL.createObjectURL=()=>{throw new Error('unavailable')};run('exportProgress()');assert(elements.panelBody.children.some(e=>e.textContent.includes('書き出せませんでした')));
 assert.equal(progress(),stableProgress);
 console.log('PASS: export without local storage, denied/quota/download-API failure without losing existing data');
})().catch(e=>{console.error(e);process.exitCode=1});
