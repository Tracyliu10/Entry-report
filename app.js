const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),today=()=>new Date().toLocaleDateString('en-CA');let db,reports=[],r,step=0,area=0,queue=Promise.resolve();const regions=['Entry / 入口','Hallway / 走廊','Living Room / 客厅','Dining Room / 餐厅','Kitchen / 厨房',...Array.from({length:4},(_,i)=>`Bedroom ${i+1} / 卧室 ${i+1}`),...Array.from({length:3},(_,i)=>`Bathroom ${i+1} / 卫浴 ${i+1}`),'Separate Toilet / 独立卫生间','Laundry / 洗衣房','Study / 书房','Balcony / 阳台','Garage / 车库','Storage / 储物间','Front Yard / 前院','Backyard / 后院','Furniture & Appliances / 家具电器'];const common=['门及门锁|开关、锁具、把手及损坏','墙面|污渍、裂缝、掉漆及钉孔','天花板|水渍、霉斑及裂缝','地面及踢脚线|划痕、污渍、破损及翘起','窗户及窗帘|玻璃、窗锁、破损及操作','灯具、开关及插座|正常使用及明显损坏','家具及固定设施|污渍、松动、破损及缺件'];function items(name){if(name===furnitureArea)return furnitureItems();let a=[...common];if(/Bedroom|Storage/.test(name))a.push('衣柜|柜门、抽屉、层板及把手');if(/Kitchen/.test(name))a.push('橱柜及台面|破损、污渍及开合','水槽及水龙头|漏水、堵塞及水渍','灶台、烤箱及抽油烟机|清洁、外观及基本功能','冰箱及洗碗机|清洁、密封及基本功能');if(/Bathroom|Toilet|Laundry/.test(name))a.push('水龙头及排水|漏水、堵塞及破损','马桶|冲水、漏水及松动','淋浴及浴缸|密封胶、霉斑及玻璃','镜子及排风扇|破损、运行及积尘');a.push('其他设施及清洁|空调、遥控器、烟雾报警器外观及整体清洁');return a.map(x=>({name:x.split('|')[0],hint:x.split('|')[1],status:'',note:'',photos:[]}))}function save(){ $('#save').textContent='保存中…';const data=structuredClone(r);queue=queue.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{let tx=db.transaction('reports','readwrite');tx.objectStore('reports').put(data);tx.oncomplete=()=>{$('#save').textContent='已保存到此设备';resolve()};tx.onerror=()=>{$('#save').textContent='保存失败，请勿关闭页面';reject(tx.error)}}));return queue}function fresh(){r={id:crypto.randomUUID(),address:'',names:[''],move:'',date:today(),areas:[],signs:[],exported:false};step=0;save();render()}function home(){db.transaction('reports').objectStore('reports').getAll().onsuccess=e=>{reports=e.target.result;$('#nav').innerHTML='';$('#app').innerHTML='<small>WELCOME HOME</small><h2>你的入住记录</h2><p>无需账号，随时开始。草稿与照片仅保存在当前浏览器。</p><button class="primary" onclick="fresh()">＋ 创建新报告</button>'+reports.map((x,i)=>`<div class="item"><b>${esc(x.address||'未命名房源')}</b><p>${esc(x.date)} · ${x.exported?'已导出':'未完成草稿'}</p><button onclick="openReport(${i})">${x.exported?'查看 / 再次导出':'继续填写'}</button><button onclick="removeReport(${i})">删除</button></div>`).join('') }}function openReport(i){
  r=reports[i];
  if(!r.exported) upgradeFurnitureChecklist();
  step=0;
  area=0;
  render();
}function removeReport(i){if(confirm('删除此设备上的这份报告及照片？')){let tx=db.transaction('reports','readwrite');tx.objectStore('reports').delete(reports[i].id);tx.oncomplete=home}}function go(n){
  if(n===3 && !allAreasComplete()) return;
  step=n;
  render();
}function render(){ $('#nav').innerHTML=['基本信息','选择区域','区域检查','预览与签字'].map((n,i)=>`<button class="${step===i?'active':''}" onclick="go(${i})" ${i===3?'id="review-step"':''} ${i===3&&!allAreasComplete()?'disabled':''}>0${i+1}　${n}</button>`).join('');let html='';if(step===0)html=`<small>01 / GETTING STARTED</small><h2>先认识你的新家</h2><label>房源完整地址<input value="${esc(r.address)}" oninput="r.address=this.value;save()" placeholder="房号、街道、城市"></label><h3>所有租客姓名</h3>${r.names.map((n,i)=>`<input aria-label="租客 ${i+1} 姓名" placeholder="租客 ${i+1} 姓名" value="${esc(n)}" oninput="r.names[${i}]=this.value;r.signs[${i}]=null;save()">`).join('')}<button onclick="r.names.push('');save();render()">＋ 添加租客</button><div class="grid"><label>入住日期<input type="date" value="${r.move}" onchange="r.move=this.value;save()"></label><label>报告填写日期<input type="date" value="${r.date}" onchange="r.date=this.value;save()"></label></div><button class="primary" onclick="go(1)">下一步：选择区域 →</button>`;if(step===1)html='<small>02 / YOUR HOME</small><h2>你入住的是哪种户型？</h2><p class="hint">选择户型后自动准备检查区域，无需逐个挑选。可按实际情况增减。</p><div class="grid">'+layouts.map((l,i)=>`<button class="layout ${r.layout===i?'active':''}" onclick="chooseLayout(${i})"><b>${l.name}</b><br><span class="hint">${l.hint}</span></button>`).join('')+'</div>'+(r.areas.length?'<h3>本次需要检查的区域</h3><p class="hint">不适用的区域可以移除，已有记录的区域会保留。</p>'+r.areas.map((a,i)=>`<div class="area-row"><span>${esc(a.name)}</span><button onclick="removeArea(${i})" aria-label="移除 ${esc(a.name)}">移除</button></div>`).join(''):'')+'<details><summary>＋ 添加其他区域</summary><div class="grid">'+regions.filter(n=>!r.areas.some(a=>a.name===n)).map(n=>`<button onclick="toggleArea('${n}')">＋ ${n}</button>`).join('')+'</div><button onclick="customArea()">＋ 自定义区域</button></details><p><button class="primary" onclick="go(2)">开始检查 →</button></p>' ;if(step===2){const a=r.areas[area]||r.areas[0];area=Math.max(0,r.areas.indexOf(a));html='<small>03 / ROOM BY ROOM</small><h2>一处一处，轻松检查</h2>'+r.areas.map((a,i)=>`<button onclick="area=${i};render()" class="${area===i?'active':''}">${esc(a.name)} <span id="area-count-${i}">${a.items.filter(itemComplete).length}/${a.items.length}</span></button>`).join('');if(a)html+=`<h3>${esc(a.name)}</h3><p class="hint">有问题的项目请选「有问题」，填写备注并上传照片；没有的项目选「不适用」。全部检查完后，点击「其余项目均正常」，一次标记剩下的正常项目。</p><button onclick="if(confirm('确认已检查本区域的所有项目，且尚未标记的项目均正常？')){r.areas[area].items.forEach(x=>{if(!x.status)x.status='正常'});save();render()}">其余项目均正常</button>`+a.items.map((x,i)=>`<div class="item"><b>${esc(x.name)}</b><p class="hint">${esc(x.hint)}</p>${['正常','有问题','不适用'].map(s=>`<button class="${x.status===s?'active':''}" onclick="r.areas[area].items[${i}].status='${s}';save();render()">${s}</button>`).join('')}${x.status==='有问题'?`<textarea placeholder="请描述具体位置和问题，可记录多处问题" oninput="r.areas[area].items[${i}].note=this.value;save();refreshAreaProgress()">${esc(x.note)}</textarea><label>添加问题照片（保留原图）<input type="file" multiple accept="image/jpeg,image/png,image/webp" onchange="upload(this.files,${i})"></label>${x.photos.map((p,j)=>`<span class="photo"><img class="thumb" src="${p}"><button onclick="r.areas[area].items[${i}].photos.splice(${j},1);save();render()">删除</button></span>`).join('')}`:''}</div>`).join('')+`<button onclick="customItem()">＋ 添加检查项目</button><div id="area-footer">${areaFooter()}</div>`;else html+='<p>请先选择至少一个区域。</p>'}if(step===3)html=`<small>04 / REVIEW & SIGN</small><h2>最后核对，签字完成</h2>${summary()}<p>本人确认本报告反映入住时观察到的房屋状况。</p>${r.names.map((n,i)=>`<h3>${esc(n||'未填写姓名')}</h3><canvas data-index="${i}" width="800" height="240"></canvas><p class="hint">签字日期：${esc(r.signs[i]?.date||today())}</p><button onclick="r.signs[${i}]=null;save();render()">清除签字</button>`).join('')}<p class="error" id="error"></p><button class="primary" onclick="exportReport()">生成 PDF / 打印 →</button><p class="hint">在打印窗口选择“存储为 PDF”。下载后请自行发回 Customer manager，下载不代表已提交。</p>`;$('#app').innerHTML=html;if(step===3)setupSigns()}
function toggleArea(n){const i=r.areas.findIndex(a=>a.name===n);if(i>=0){if(!confirm('移除此区域及已有记录？'))return;r.areas.splice(i,1)}else r.areas.push({name:n,items:items(n)});save();render()}function customArea(){let n=prompt('区域名称');if(n?.trim()){r.areas.push({name:n.trim(),items:items(n)});save();render()}}function customItem(){let n=prompt('检查项目名称');if(n?.trim()){r.areas[area].items.push({name:n,hint:'检查外观、清洁及基本使用情况',status:'',note:'',photos:[]});save();render()}}async function upload(files,i){const target=r.areas[area].items[i];for(const f of files){if(!/^image\/(jpeg|png|webp)$/.test(f.type)){alert('请使用 JPG、PNG 或 WebP 照片。');continue}try{const data=await new Promise((ok,no)=>{let fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=no;fr.readAsDataURL(f)});target.photos.push(data);await save()}catch{alert('照片保存失败，请勿关闭页面。')}}render()}function summary(){return `<p><b>${esc(r.address)}</b><br>租客：${r.names.map(esc).join('、')}<br>入住：${esc(r.move)}　报告：${esc(r.date)}</p>`+r.areas.map(a=>`<h3>${esc(a.name)}</h3>${a.items.map(x=>`<p>${esc(x.name)} · ${esc(x.status||'未检查')}${x.status==='有问题'?' — '+esc(x.note):''}</p>`).join('')}`).join('')}function setupSigns(){document.querySelectorAll('canvas').forEach(c=>{let i=+c.dataset.index,ctx=c.getContext('2d'),down=false;if(r.signs[i]){let im=new Image();im.onload=()=>ctx.drawImage(im,0,0);im.src=r.signs[i].image}const point=e=>{let b=c.getBoundingClientRect();return[(e.clientX-b.left)*c.width/b.width,(e.clientY-b.top)*c.height/b.height]};c.onpointerdown=e=>{down=true;c.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...point(e))};c.onpointermove=e=>{if(down){ctx.lineWidth=3;ctx.lineCap='round';ctx.lineTo(...point(e));ctx.stroke()}};c.onpointerup=()=>{if(down){down=false;r.signs[i]={image:c.toDataURL(),date:today()};save()}}})}async function exportReport(){let error='';if(!r.address.trim()||!r.move||!r.date||r.names.some(n=>!n.trim()))error='请补全地址、所有租客姓名和日期。';else if(!r.areas.length||r.areas.some(a=>a.items.some(x=>!x.status)))error='请完成所有已选区域的检查。';else if(r.areas.some(a=>a.items.some(x=>x.status==='有问题'&&(!x.note.trim()||!x.photos.length))))error='每个问题都需要描述及至少一张照片。';else if(r.names.some((_,i)=>!r.signs[i]))error='请所有租客完成签字。';if(error){$('#error').textContent=error;return}try{await save()}catch{return}const old=$('#app').innerHTML;$('#app').innerHTML='<h1>七天入住报告</h1>'+summary()+r.areas.map(a=>a.items.filter(x=>x.status==='有问题').map(x=>x.photos.map((p,i)=>`<section class="print-photo"><b>${esc(a.name)} / ${esc(x.name)} · 照片 ${i+1}</b><div>${esc(x.note)}</div><img src="${p}"></section>`).join('')).join('')).join('')+'<h3>租客声明与签字</h3><p>本人确认本报告反映入住时观察到的房屋状况。</p>'+r.signs.map((s,i)=>`<p>${esc(r.names[i])} · ${esc(s.date)}</p><img class="signature" src="${s.image}">`).join('');await Promise.all([...document.images].map(im=>im.decode().catch(()=>{})));window.print();r.exported=true;await save();render()}
const req=indexedDB.open('move-in-reports',1);req.onupgradeneeded=()=>req.result.createObjectStore('reports',{keyPath:'id'});req.onsuccess=()=>{db=req.result;home()};req.onerror=()=>{$('#app').textContent='无法打开本地存储，请允许浏览器存储后重试。'};

const layouts=[{name:'分租单间 / Shared Room',beds:1,baths:1,hint:'1 间卧室 · 1 间卫浴，可移除共用卫浴',shared:true},{name:'Studio',beds:0,baths:1,hint:'开放式起居空间 · 1 间卫浴'},{name:'One Bedroom',beds:1,baths:1,hint:'1 间卧室 · 1 间卫浴'},{name:'Two Bedroom',beds:2,baths:2,hint:'2 间卧室 · 2 间卫浴'},{name:'Three Bedroom',beds:3,baths:2,hint:'3 间卧室 · 2 间卫浴'},{name:'Four Bedroom',beds:4,baths:3,hint:'4 间卧室 · 3 间卫浴'}];
function layoutAreas(l){return [...(l.shared?[]:['Entry / 入口','Living Room / 客厅','Kitchen / 厨房']),...Array.from({length:l.beds},(_,i)=>`Bedroom ${i+1} / 卧室 ${i+1}`),...Array.from({length:l.baths},(_,i)=>`Bathroom ${i+1} / 卫浴 ${i+1}`),...(l.shared?[]:['Laundry / 洗衣房']),furnitureArea]}
function chooseLayout(i){if(r.layout===i)return;const names=layoutAreas(layouts[i]);const removed=r.areas.filter(a=>!names.includes(a.name));if(removed.some(a=>a.items.some(x=>x.status||x.note||x.photos.length))&&!confirm('更换户型将移除部分区域及已有记录，是否继续？'))return;r.areas=names.map(name=>r.areas.find(a=>a.name===name)||{name,items:items(name)});r.layout=i;area=0;save();render()}
function removeArea(i){if(confirm('移除此区域及已有记录？')){r.areas.splice(i,1);save();render()}}

const furnitureArea = 'Furniture & Appliances / 家具电器';
const furnitureChecklist = [
  ['沙发', '查看布面或皮面有无污渍、破损及塌陷'],
  ['茶几', '查看台面划痕、缺角及桌脚是否稳固'],
  ['餐桌', '查看台面污渍、划痕及桌脚是否稳固'],
  ['餐椅', '查看座面、椅背和椅脚有无破损或松动'],
  ['床架', '查看床架、床板及床头板有无破损或松动'],
  ['床垫', '查看污渍、破损及明显凹陷'],
  ['学习桌', '查看桌面、抽屉及桌脚状况'],
  ['学习椅', '查看座面、椅背及调节功能'],
  ['床头柜', '查看台面和抽屉有无污渍、破损或卡顿'],
  ['冰箱', '查看清洁、门封及冷藏状况'],
  ['洗衣机', '查看滚筒、门封及正常使用时有无漏水'],
  ['烘干机', '查看滚筒、滤网及基本运行状况'],
  ['微波炉', '查看内壁、转盘及门能否正常闭合'],
  ['烤箱', '查看内壁、烤盘、门封及基本运行状况'],
  ['洗碗机', '查看碗篮、清洁情况及正常使用时有无漏水'],
  ['空调', '查看外观、遥控器及基本运行状况']
];

function furnitureItems(){
  return furnitureChecklist.map(([name,hint])=>({name,hint,status:'',note:'',photos:[]}));
}

function upgradeFurnitureChecklist(){
  const furniture=r.areas.find(a=>a.name===furnitureArea);
  if(!furniture || furnitureChecklist.every(([name])=>furniture.items.some(x=>x.name===name))) return;
  const defaults=furnitureItems();
  const previous=furniture.items;
  const genericNames=new Set(items('').map(x=>x.name));
  furniture.items=[
    ...defaults.map(x=>previous.find(old=>old.name===x.name)||x),
    ...previous.filter(x=>!defaults.some(item=>item.name===x.name)
      && (!genericNames.has(x.name) || x.status || x.note || x.photos.length))
  ];
  save();
}

function itemComplete(item){
  if(item.status==='有问题') return Boolean(item.note.trim() && item.photos.length);
  return item.status==='正常' || item.status==='不适用';
}

function allAreasComplete(){
  return Boolean(r.areas.length && r.areas.every(a=>a.items.every(itemComplete)));
}

function areaFooter(){
  if(area<r.areas.length-1){
    return `<button class="primary" onclick="area++;render();document.querySelector('#app').scrollIntoView()">下一区域 →</button>`;
  }
  if(allAreasComplete()) return '<button class="primary" onclick="go(3)">预览及签字 →</button>';
  const pending=r.areas.findIndex(a=>!a.items.every(itemComplete));
  const hint='<p class="hint">请完成所有区域。有问题的项目需填写说明并添加至少一张照片。</p>';
  return pending===area ? hint : hint+`<button class="primary" onclick="area=${pending};render();document.querySelector('#app').scrollIntoView()">前往未完成区域 →</button>`;
}

function refreshAreaProgress(){
  const current=r.areas[area];
  document.getElementById('area-count-'+area).textContent=current.items.filter(itemComplete).length+'/'+current.items.length;
  $('#review-step').disabled=!allAreasComplete();
  $('#area-footer').innerHTML=areaFooter();
}
