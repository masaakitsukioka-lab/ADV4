const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const base=path.resolve(__dirname,'..'),html=fs.readFileSync(base+'/index.html','utf8');
const reference=JSON.parse(fs.readFileSync(base+'/assets.json','utf8'));
const requests=[];let viewport={width:844,height:390};
class Element{
 constructor(){this.children=[];this.style={};this.dataset={};this.textContent='';const set=new Set();this.classList={add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle:(x,on)=>on?set.add(x):set.delete(x)}}
 set innerHTML(x){this.children=[]}appendChild(x){this.children.push(x)}replaceChildren(){this.children=[]}
 addEventListener(){}getBoundingClientRect(){return {...viewport,left:0,top:0,bottom:viewport.height}}
 getContext(){return {clearRect(){},fillRect(){}}}get nextElementSibling(){return this.next||(this.next=new Element())}
}
const elements={},document={getElementById:id=>elements[id]||(elements[id]=new Element()),createElement:()=>new Element(),addEventListener(){}};
class Image{set src(value){this.path=value;requests.push(this)}}
const ctx={window:{addEventListener(){}},document,Image,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:fn=>fn(),matchMedia:()=>({matches:true})};vm.createContext(ctx);
for(const file of ['scenario','events','saves'])vm.runInContext(fs.readFileSync(base+'/data/'+file+'.js','utf8'),ctx);
vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'),ctx);
const run=code=>vm.runInContext(code,ctx),assets=JSON.parse(run('JSON.stringify(ASSETS)'));
const all=[];
for(const room of ['classroom','corridor']){
 assert.equal(assets.scenes[room].background,reference.scenes[room].background);all.push([assets.scenes[room].background,320,180]);
 for(const [id,target] of Object.entries(assets.scenes[room].targets))assert.deepEqual([target.x,target.y],reference.scenes[room].targets[id]);
}
for(const person of ['haruki','saiji'])for(const mood of ['normal','surprised','thinking','confident']){
 const file=assets.characters[person][mood];assert.equal(file,reference.characters[person][mood]);all.push([file,104,144]);
}
for(const [file,w,h] of all){const png=fs.readFileSync(path.join(base,file));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h)}
assert.equal(all.length,10);assert(!html.includes('.svg'));assert(!html.includes('🧑🏻'));assert(!html.includes('background:#181b28!important'));
for(const size of [{width:1280,height:800},{width:844,height:390},{width:667,height:375}]){
 viewport=size;for(const room of ['classroom','corridor']){
  run('state.room='+JSON.stringify(room));
  for(const [id,t] of Object.entries(assets.scenes[room].targets)){
   ctx.marker=new Element();run('placeTarget(marker,'+JSON.stringify(id)+')');
   const scale=Math.max(size.width/320,size.height/180),x=(size.width-320*scale)/2+t.x*scale,y=(size.height-180*scale)/2+t.y*scale;
   assert.equal(parseFloat(ctx.marker.style.left),Math.max(50,Math.min(size.width-50,x)));
   assert.equal(parseFloat(ctx.marker.style.top),Math.max(36,Math.min(size.height-30,y)));
  }
 }
}
(async()=>{
 run('state.room="corridor";setSceneBackground("corridor")');
 requests.find(x=>x.path.endsWith('classroom.png')).onload();await Promise.resolve();assert.equal(elements.scene.style.backgroundImage,'none');
 requests.find(x=>x.path.endsWith('corridor.png')).onload();await Promise.resolve();assert(elements.scene.style.backgroundImage.includes('corridor.png'));assert.equal(elements.pixelScene.style.visibility,'hidden');
 run('setCharacterImage("haruki","通常");setCharacterImage("haruki","驚き")');
 requests.find(x=>x.path.endsWith('haruki_normal.png')).onload();await Promise.resolve();assert.notEqual(elements.harukiArt.style.display,'block');
 requests.find(x=>x.path.endsWith('haruki_surprised.png')).onload();await Promise.resolve();assert(elements.harukiArt.src.endsWith('haruki_surprised.png'));
 run('setCharacterImage("saiji","思案")');requests.find(x=>x.path.endsWith('saiji_thinking.png')).onerror();await Promise.resolve();assert.equal(elements.saijiArt.style.display,'none');
 run('ASSETS.scenes.classroom.background="missing.png";state.room="classroom";setSceneBackground("classroom")');requests.find(x=>x.path==='missing.png').onerror();await Promise.resolve();assert.equal(elements.pixelScene.style.visibility,'visible');assert.equal(elements.scene.style.backgroundImage,'none');
 console.log('PASS: 10 PNG assets/dimensions, asset definitions, target coordinate transforms at 3 sizes, image success/failure and stale image callbacks');
})().catch(e=>{console.error(e);process.exitCode=1});
