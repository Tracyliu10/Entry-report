const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),today=()=>new Date().toLocaleDateString('en-CA');let db,reports=[],r,step=0,area=0,queue=Promise.resolve();const regions=['Entry / 入口','Hallway / 走廊','Living Room / 客厅','Dining Room / 餐厅','Kitchen / 厨房',...Array.from({length:4},(_,i)=>`Bedroom ${i+1} / 卧室 ${i+1}`),...Array.from({length:3},(_,i)=>`Bathroom ${i+1} / 卫浴 ${i+1}`),'Separate Toilet / 独立卫生间','Laundry / 洗衣房','Study / 书房','Balcony / 阳台','Garage / 车库','Storage / 储物间','Front Yard / 前院','Backyard / 后院','Furniture & Appliances / 家具电器'];const common=['门及门锁|开关、锁具、把手及损坏','墙面|污渍、裂缝、掉漆及钉孔','天花板|水渍、霉斑及裂缝','地面及踢脚线|划痕、污渍、破损及翘起','窗户及窗帘|玻璃、窗锁、破损及操作','灯具、开关及插座|正常使用及明显损坏','家具及固定设施|污渍、松动、破损及缺件'];function items(name){if(name===furnitureArea)return furnitureItems();let a=[...common];if(/Bedroom|Storage/.test(name))a.push('衣柜|柜门、抽屉、层板及把手');if(/Kitchen/.test(name))a.push('橱柜及台面|破损、污渍及开合','水槽及水龙头|漏水、堵塞及水渍','灶台、烤箱及抽油烟机|清洁、外观及基本功能','冰箱及洗碗机|清洁、密封及基本功能');if(/Bathroom|Toilet|Laundry/.test(name))a.push('水龙头及排水|漏水、堵塞及破损','马桶|冲水、漏水及松动','淋浴及浴缸|密封胶、霉斑及玻璃','镜子及排风扇|破损、运行及积尘');a.push('其他设施及清洁|空调、遥控器、烟雾报警器外观及整体清洁');return a.map(x=>({name:x.split('|')[0],hint:x.split('|')[1],status:'',note:'',photos:[]}))}function save(){ setSaveStatus('保存中…');const data=structuredClone(r);queue=queue.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{let tx=db.transaction('reports','readwrite');tx.objectStore('reports').put(data);tx.oncomplete=()=>{setSaveStatus('已保存到此设备');resolve()};tx.onerror=()=>{setSaveStatus('保存失败，请勿关闭页面');reject(tx.error)}}));return queue}function fresh(){r={id:crypto.randomUUID(),address:'',names:[''],move:'',date:today(),areas:[],signs:[],exported:false};step=0;save();render()}function home(){ isHome=true;db.transaction('reports').objectStore('reports').getAll().onsuccess=e=>{reports=e.target.result;$('#nav').innerHTML='';$('#app').innerHTML=ui('<small>WELCOME HOME</small><h2>你的入住记录</h2><p>无需账号，随时开始。草稿与照片仅保存在当前浏览器。</p><p class="notice"><strong>需要清洁或维修？</strong> 请在群里或邮件中单独列出需要清洁或维修的项目，Customer Manager 会加急处理。其他需要留作记录的情况，请填写到入住报告里。</p><button class="primary" onclick="fresh()">＋ 创建新报告</button>')+reports.map((x,i)=>ui`<div class="item"><b>${esc(x.address||t('未命名房源'))}</b><p>${esc(x.date)} · ${x.exported?t('已导出'):t('未完成草稿')}</p><button onclick="openReport(${i})">${x.exported?t('查看 / 再次导出'):t('继续填写')}</button><button onclick="removeReport(${i})">删除</button></div>`).join('') }}function openReport(i){
  r=reports[i];
  if(!r.exported) upgradeFurnitureChecklist();
  step=0;
  area=0;
  render();
}function removeReport(i){if(confirm(t('删除此设备上的这份报告及照片？'))){let tx=db.transaction('reports','readwrite');tx.objectStore('reports').delete(reports[i].id);tx.oncomplete=home}}function go(n){
  if(n===3 && !allAreasComplete()) return;
  step=n;
  render();
}function render(){ isHome=false; $('#nav').innerHTML=['基本信息','选择区域','区域检查','预览与签字'].map((n,i)=>`<button class="${step===i?'active':''}" onclick="go(${i})" ${i===3?'id="review-step"':''} ${i===3&&!allAreasComplete()?'disabled':''}>0${i+1}　${esc(t(n))}</button>`).join('');let html='';if(step===0)html=ui`<small>01 / GETTING STARTED</small><h2>先认识你的新家</h2><label>房源完整地址<input value="${esc(r.address)}" oninput="r.address=this.value;save()" placeholder="房号、街道、城市"></label><h3>所有租客姓名</h3>${r.names.map((n,i)=>ui`<input aria-label="租客 ${i+1} 姓名" placeholder="租客 ${i+1} 姓名" value="${esc(n)}" oninput="r.names[${i}]=this.value;r.signs[${i}]=null;save()">`).join('')}<button onclick="r.names.push('');save();render()">＋ 添加租客</button><div class="grid"><label>入住日期<input type="date" value="${r.move}" onchange="r.move=this.value;save()"></label><label>报告填写日期<input type="date" value="${r.date}" onchange="r.date=this.value;save()"></label></div><button class="primary" onclick="go(1)">下一步：选择区域 →</button>`;if(step===1)html=ui('<small>02 / YOUR HOME</small><h2>你入住的是哪种户型？</h2><p class="hint">选择户型后自动准备检查区域，无需逐个挑选。可按实际情况增减。</p><div class="grid">')+layouts.map((l,i)=>`<button class="layout ${r.layout===i?'active':''}" onclick="chooseLayout(${i})"><b>${esc(t(l.name))}</b><br><span class="hint">${esc(t(l.hint))}</span></button>`).join('')+'</div>'+(r.areas.length?ui('<h3>本次需要检查的区域</h3><p class="hint">不适用的区域可以移除，已有记录的区域会保留。</p>')+r.areas.map((a,i)=>ui`<div class="area-row"><span>${esc(areaLabel(a.name))}</span><button onclick="removeArea(${i})" aria-label="移除 ${esc(areaLabel(a.name))}">移除</button></div>`).join(''):'')+ui('<details><summary>＋ 添加其他区域</summary><div class="grid">')+regions.filter(n=>!r.areas.some(a=>a.name===n)).map(n=>`<button onclick="toggleArea('${n}')">＋ ${esc(areaLabel(n))}</button>`).join('')+ui('</div><button onclick="customArea()">＋ 自定义区域</button></details><p><button class="primary" onclick="go(2)">开始检查 →</button></p>') ;if(step===2){const a=r.areas[area]||r.areas[0];area=Math.max(0,r.areas.indexOf(a));html=ui('<small>03 / ROOM BY ROOM</small><h2>一处一处，轻松检查</h2>')+r.areas.map((a,i)=>`<button onclick="area=${i};render()" class="${area===i?'active':''}">${esc(areaLabel(a.name))} <span id="area-count-${i}">${a.items.filter(itemComplete).length}/${a.items.length}</span></button>`).join('');if(a)html+=ui`<h3>${esc(areaLabel(a.name))}</h3><p class="hint">有问题的项目请选「有问题」，填写备注并上传照片；没有的项目选「不适用」。全部检查完后，点击「其余项目均正常」，一次标记剩下的正常项目。</p><button onclick="markRemainingNormal()">其余项目均正常</button>`+a.items.map((x,i)=>`<div class="item"><b>${esc(t(x.name))}</b><p class="hint">${esc(t(x.hint))}</p>${['正常','有问题','不适用'].map(s=>`<button class="${x.status===s?'active':''}" onclick="r.areas[area].items[${i}].status='${s}';save();render()">${esc(t(s))}</button>`).join('')}${x.status==='有问题'?ui`<textarea placeholder="请描述具体位置和问题，可记录多处问题" oninput="r.areas[area].items[${i}].note=this.value;save();refreshAreaProgress()">${esc(x.note)}</textarea><label>添加问题照片（保留原图）<input type="file" multiple accept="image/jpeg,image/png,image/webp" onchange="upload(this.files,${i})"></label>${x.photos.map((p,j)=>ui`<span class="photo"><img class="thumb" src="${p}"><button onclick="r.areas[area].items[${i}].photos.splice(${j},1);save();render()">删除</button></span>`).join('')}`:''}</div>`).join('')+ui`<button onclick="customItem()">＋ 添加检查项目</button><div id="area-footer">${areaFooter()}</div>`;else html+=ui('<p>请先选择至少一个区域。</p>')}if(step===3)html=ui`<small>04 / REVIEW & SIGN</small><h2>最后核对，签字完成</h2>${summary()}<p>本人确认本报告反映入住时观察到的房屋状况。</p>${r.names.map((n,i)=>ui`<h3>${esc(n||t('未填写姓名'))}</h3><canvas data-index="${i}" width="800" height="240"></canvas><p class="hint">签字日期：${esc(r.signs[i]?.date||today())}</p><button onclick="r.signs[${i}]=null;save();render()">清除签字</button>`).join('')}<p class="error" id="error"></p><button class="primary" onclick="exportReport()">生成 PDF / 打印 →</button><p class="hint">在打印窗口选择“存储为 PDF”。下载后请自行发回 Customer manager，下载不代表已提交。</p>`;$('#app').innerHTML=html;if(step===3)setupSigns()}
function toggleArea(n){const i=r.areas.findIndex(a=>a.name===n);if(i>=0){if(!confirm(t('移除此区域及已有记录？')))return;r.areas.splice(i,1)}else r.areas.push({name:n,items:items(n)});save();render()}function customArea(){let n=prompt(t('区域名称'));if(n?.trim()){r.areas.push({name:n.trim(),items:items(n)});save();render()}}function customItem(){let n=prompt(t('检查项目名称'));if(n?.trim()){r.areas[area].items.push({name:n,hint:'检查外观、清洁及基本使用情况',status:'',note:'',photos:[]});save();render()}}async function upload(files,i){const target=r.areas[area].items[i];for(const f of files){if(!/^image\/(jpeg|png|webp)$/.test(f.type)){alert(t('请使用 JPG、PNG 或 WebP 照片。'));continue}try{const data=await new Promise((ok,no)=>{let fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=no;fr.readAsDataURL(f)});target.photos.push(data);await save()}catch{alert(t('照片保存失败，请勿关闭页面。'))}}render()}function summary(){return ui`<p><b>${esc(r.address)}</b><br>租客：${r.names.map(esc).join(language==='en'?', ':'、')}<br>入住：${esc(r.move)}　报告：${esc(r.date)}</p>`+r.areas.map(a=>`<h3>${esc(areaLabel(a.name))}</h3>${a.items.map(x=>`<p>${esc(t(x.name))} · ${esc(t(x.status||'未检查'))}${x.status==='有问题'?' — '+esc(x.note):''}</p>`).join('')}`).join('')}function setupSigns(){document.querySelectorAll('canvas').forEach(c=>{let i=+c.dataset.index,ctx=c.getContext('2d'),down=false;if(r.signs[i]){let im=new Image();im.onload=()=>ctx.drawImage(im,0,0);im.src=r.signs[i].image}const point=e=>{let b=c.getBoundingClientRect();return[(e.clientX-b.left)*c.width/b.width,(e.clientY-b.top)*c.height/b.height]};c.onpointerdown=e=>{down=true;c.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...point(e))};c.onpointermove=e=>{if(down){ctx.lineWidth=3;ctx.lineCap='round';ctx.lineTo(...point(e));ctx.stroke()}};c.onpointerup=()=>{if(down){down=false;r.signs[i]={image:c.toDataURL(),date:today()};save()}}})}async function exportReport(){let error='';if(!r.address.trim()||!r.move||!r.date||r.names.some(n=>!n.trim()))error=t('请补全地址、所有租客姓名和日期。');else if(!r.areas.length||r.areas.some(a=>a.items.some(x=>!x.status)))error=t('请完成所有已选区域的检查。');else if(r.areas.some(a=>a.items.some(x=>x.status==='有问题'&&(!x.note.trim()||!x.photos.length))))error=t('每个问题都需要描述及至少一张照片。');else if(r.names.some((_,i)=>!r.signs[i]))error=t('请所有租客完成签字。');if(error){$('#error').textContent=error;return}try{await save()}catch{return}const old=$('#app').innerHTML;$('#app').innerHTML=ui('<h1>七天入住报告</h1>')+summary()+r.areas.map(a=>a.items.filter(x=>x.status==='有问题').map(x=>x.photos.map((p,i)=>ui`<section class="print-photo"><b>${esc(areaLabel(a.name))} / ${esc(t(x.name))} · 照片 ${i+1}</b><div>${esc(x.note)}</div><img src="${p}"></section>`).join('')).join('')).join('')+ui('<h3>租客声明与签字</h3><p>本人确认本报告反映入住时观察到的房屋状况。</p>')+r.signs.map((s,i)=>`<p>${esc(r.names[i])} · ${esc(s.date)}</p><img class="signature" src="${s.image}">`).join('');await Promise.all([...document.images].map(im=>im.decode().catch(()=>{})));window.print();r.exported=true;await save();render()}
const req=indexedDB.open('move-in-reports',1);req.onupgradeneeded=()=>req.result.createObjectStore('reports',{keyPath:'id'});req.onsuccess=()=>{db=req.result;home()};req.onerror=()=>{$('#app').textContent=t('无法打开本地存储，请允许浏览器存储后重试。')};

const layouts=[{name:'分租单间 / Shared Room',beds:1,baths:1,hint:'1 间卧室 · 1 间卫浴，可移除共用卫浴',shared:true},{name:'Studio',beds:0,baths:1,hint:'开放式起居空间 · 1 间卫浴'},{name:'One Bedroom',beds:1,baths:1,hint:'1 间卧室 · 1 间卫浴'},{name:'Two Bedroom',beds:2,baths:2,hint:'2 间卧室 · 2 间卫浴'},{name:'Three Bedroom',beds:3,baths:2,hint:'3 间卧室 · 2 间卫浴'},{name:'Four Bedroom',beds:4,baths:3,hint:'4 间卧室 · 3 间卫浴'}];
function layoutAreas(l){return [...(l.shared?[]:['Entry / 入口','Living Room / 客厅','Kitchen / 厨房']),...Array.from({length:l.beds},(_,i)=>`Bedroom ${i+1} / 卧室 ${i+1}`),...Array.from({length:l.baths},(_,i)=>`Bathroom ${i+1} / 卫浴 ${i+1}`),...(l.shared?[]:['Laundry / 洗衣房']),furnitureArea]}
function chooseLayout(i){if(r.layout===i)return;const names=layoutAreas(layouts[i]);const removed=r.areas.filter(a=>!names.includes(a.name));if(removed.some(a=>a.items.some(x=>x.status||x.note||x.photos.length))&&!confirm(t('更换户型将移除部分区域及已有记录，是否继续？')))return;r.areas=names.map(name=>r.areas.find(a=>a.name===name)||{name,items:items(name)});r.layout=i;area=0;save();render()}
function removeArea(i){if(confirm(t('移除此区域及已有记录？'))){r.areas.splice(i,1);save();render()}}

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
    return ui`<button class="primary" onclick="area++;render();document.querySelector('#app').scrollIntoView()">下一区域 →</button>`;
  }
  if(allAreasComplete()) return ui('<button class="primary" onclick="go(3)">预览及签字 →</button>');
  const pending=r.areas.findIndex(a=>!a.items.every(itemComplete));
  const hint=ui('<p class="hint">请完成所有区域。有问题的项目需填写说明并添加至少一张照片。</p>');
  return pending===area ? hint : hint+ui`<button class="primary" onclick="area=${pending};render();document.querySelector('#app').scrollIntoView()">前往未完成区域 →</button>`;
}

function refreshAreaProgress(){
  const current=r.areas[area];
  document.getElementById('area-count-'+area).textContent=current.items.filter(itemComplete).length+'/'+current.items.length;
  $('#review-step').disabled=!allAreasComplete();
  $('#area-footer').innerHTML=areaFooter();
}

const english = {
  "仅保存在此设备": "Stored on this device",
  "安心入住，从记录开始。": "Start your tenancy with a clear record.",
  "七天入住报告": "7-Day Entry Condition Report",
  "请在入住后七天内完成并将签字后的 PDF 发回 Customer manager。逾期反馈可能影响退租查房时对损坏情况及责任的判断。": "Complete this report within seven days of moving in and send the signed PDF to your Customer Manager. Late feedback may affect how damage and responsibility are assessed at the exit inspection.",
  "首页": "Home",
  "保存中…": "Saving…",
  "已保存到此设备": "Saved on this device",
  "保存失败，请勿关闭页面": "Save failed. Please keep this page open.",
  "你的入住记录": "Your entry reports",
  "无需账号，随时开始。草稿与照片仅保存在当前浏览器。": "No account required. Drafts and photos are stored in this browser only.",
  "需要清洁或维修？": "Need cleaning or repairs?",
  "请在群里或邮件中单独列出需要清洁或维修的项目，Customer Manager 会加急处理。其他需要留作记录的情况，请填写到入住报告里。": "Please list any cleaning or repairs separately in your group chat or by email so your Customer Manager can prioritise them. Record any other conditions you want to document in this entry report.",
  "创建新报告": "Create a report",
  "未命名房源": "Untitled property",
  "已导出": "Exported",
  "未完成草稿": "Draft",
  "查看 / 再次导出": "View / export again",
  "继续填写": "Continue",
  "删除": "Delete",
  "删除此设备上的这份报告及照片？": "Delete this report and its photos from this device?",
  "基本信息": "Details",
  "选择区域": "Choose areas",
  "区域检查": "Inspect areas",
  "预览与签字": "Review & sign",
  "先认识你的新家": "Enter your property details",
  "房源完整地址": "Full property address",
  "房号、街道、城市": "Unit, street and city",
  "所有租客姓名": "Names of all tenants",
  "租客 ": "Tenant ",
  " 姓名": " name",
  "添加租客": "Add tenant",
  "入住日期": "Move-in date",
  "报告填写日期": "Report date",
  "下一步：选择区域 →": "Next: choose areas →",
  "你入住的是哪种户型？": "What type of home are you moving into?",
  "选择户型后自动准备检查区域，无需逐个挑选。可按实际情况增减。": "Choose a layout to load its checklist. Add or remove areas to match your home.",
  "本次需要检查的区域": "Areas to inspect",
  "不适用的区域可以移除，已有记录的区域会保留。": "Remove any areas that do not apply.",
  "移除": "Remove",
  "添加其他区域": "Add another area",
  "自定义区域": "Add a custom area",
  "开始检查 →": "Start inspection →",
  "一处一处，轻松检查": "Inspect one area at a time",
  "有问题的项目请选「有问题」，填写备注并上传照片；没有的项目选「不适用」。全部检查完后，点击「其余项目均正常」，一次标记剩下的正常项目。": "For any issue, select “Has an issue”, add a note and upload a photo. If an item is not present, select “Not applicable”. After checking everything in this area, select “All remaining items are OK” to mark the remaining items at once.",
  "确认已检查本区域的所有项目，且尚未标记的项目均正常？": "Have you checked every item in this area and confirmed that all unmarked items are OK?",
  "其余项目均正常": "All remaining items are OK",
  "正常": "OK",
  "有问题": "Has an issue",
  "不适用": "Not applicable",
  "请描述具体位置和问题，可记录多处问题": "Describe the location and condition. You can note more than one issue.",
  "添加问题照片（保留原图）": "Add photos of the issue (originals retained)",
  "添加检查项目": "Add checklist item",
  "请先选择至少一个区域。": "Choose at least one area first.",
  "最后核对，签字完成": "Review and sign your report",
  "本人确认本报告反映入住时观察到的房屋状况。": "I confirm that this report reflects the condition of the property as observed when moving in.",
  "未填写姓名": "Name not entered",
  "签字日期：": "Signature date: ",
  "清除签字": "Clear signature",
  "生成 PDF / 打印 →": "Print / Save as PDF →",
  "在打印窗口选择“存储为 PDF”。下载后请自行发回 Customer manager，下载不代表已提交。": "Choose “Save as PDF” in the print window. Send the saved PDF to your Customer Manager to submit your report.",
  "移除此区域及已有记录？": "Remove this area and its existing records?",
  "区域名称": "Area name",
  "检查项目名称": "Checklist item name",
  "检查外观、清洁及基本使用情况": "Check appearance, cleanliness and basic operation",
  "请使用 JPG、PNG 或 WebP 照片。": "Please use JPG, PNG or WebP photos.",
  "照片保存失败，请勿关闭页面。": "Photos could not be saved. Please keep this page open.",
  "租客：": "Tenants: ",
  "入住：": "Moved in: ",
  "报告：": "Report date: ",
  "未检查": "Not checked",
  "请补全地址、所有租客姓名和日期。": "Enter the address, all tenant names and both dates.",
  "请完成所有已选区域的检查。": "Complete the inspection for every selected area.",
  "每个问题都需要描述及至少一张照片。": "Add a description and at least one photo for every issue.",
  "请所有租客完成签字。": "All tenants must sign.",
  "照片 ": "Photo ",
  "租客声明与签字": "Tenant declaration and signatures",
  "无法打开本地存储，请允许浏览器存储后重试。": "Local storage is unavailable. Allow browser storage and try again.",
  "分租单间 / Shared Room": "Room in a shared home",
  "1 间卧室 · 1 间卫浴，可移除共用卫浴": "1 bedroom · 1 bathroom (remove if shared)",
  "开放式起居空间 · 1 间卫浴": "Open-plan living area · 1 bathroom",
  "1 间卧室 · 1 间卫浴": "1 bedroom · 1 bathroom",
  "2 间卧室 · 2 间卫浴": "2 bedrooms · 2 bathrooms",
  "3 间卧室 · 2 间卫浴": "3 bedrooms · 2 bathrooms",
  "4 间卧室 · 3 间卫浴": "4 bedrooms · 3 bathrooms",
  "更换户型将移除部分区域及已有记录，是否继续？": "Changing the layout will remove some areas and their records. Continue?",
  "下一区域 →": "Next area →",
  "预览及签字 →": "Review and sign →",
  "请完成所有区域。有问题的项目需填写说明并添加至少一张照片。": "Complete all areas. Add a note and at least one photo for any issue.",
  "前往未完成区域 →": "Go to incomplete area →",
  "门及门锁": "Doors and locks",
  "开关、锁具、把手及损坏": "Check operation, locks, handles and damage",
  "墙面": "Walls",
  "污渍、裂缝、掉漆及钉孔": "Check stains, cracks, chipped paint and nail holes",
  "天花板": "Ceiling",
  "水渍、霉斑及裂缝": "Check water marks, mould and cracks",
  "地面及踢脚线": "Flooring and skirting boards",
  "划痕、污渍、破损及翘起": "Check scratches, stains, damage and lifting",
  "窗户及窗帘": "Windows and curtains",
  "玻璃、窗锁、破损及操作": "Check glass, locks, damage and operation",
  "灯具、开关及插座": "Lights, switches and power points",
  "正常使用及明显损坏": "Check basic operation and visible damage",
  "家具及固定设施": "Furniture and fixtures",
  "污渍、松动、破损及缺件": "Check stains, loose parts, damage and missing pieces",
  "衣柜": "Wardrobe",
  "柜门、抽屉、层板及把手": "Check doors, drawers, shelves and handles",
  "橱柜及台面": "Cabinets and benchtops",
  "破损、污渍及开合": "Check damage, stains and whether doors open and close",
  "水槽及水龙头": "Sink and taps",
  "漏水、堵塞及水渍": "Check leaks, blockages and water marks",
  "灶台、烤箱及抽油烟机": "Cooktop, oven and rangehood",
  "清洁、外观及基本功能": "Check cleanliness, appearance and basic operation",
  "冰箱及洗碗机": "Fridge and dishwasher",
  "清洁、密封及基本功能": "Check cleanliness, seals and basic operation",
  "水龙头及排水": "Taps and drainage",
  "漏水、堵塞及破损": "Check leaks, blockages and damage",
  "马桶": "Toilet",
  "冲水、漏水及松动": "Check flushing, leaks and loose fittings",
  "淋浴及浴缸": "Shower and bath",
  "密封胶、霉斑及玻璃": "Check sealant, mould and glass",
  "镜子及排风扇": "Mirror and exhaust fan",
  "破损、运行及积尘": "Check damage, operation and dust",
  "其他设施及清洁": "Other fittings and cleanliness",
  "空调、遥控器、烟雾报警器外观及整体清洁": "Check the air conditioner, remote, visible condition of smoke alarms and general cleanliness",
  "沙发": "Sofa",
  "查看布面或皮面有无污渍、破损及塌陷": "Check upholstery for stains, damage and sagging",
  "茶几": "Coffee table",
  "查看台面划痕、缺角及桌脚是否稳固": "Check scratches, chips and stability",
  "餐桌": "Dining table",
  "查看台面污渍、划痕及桌脚是否稳固": "Check stains, scratches and stability",
  "餐椅": "Dining chairs",
  "查看座面、椅背和椅脚有无破损或松动": "Check the seats, backs and legs for damage or looseness",
  "床架": "Bed frame",
  "查看床架、床板及床头板有无破损或松动": "Check the frame, slats and headboard for damage or looseness",
  "床垫": "Mattress",
  "查看污渍、破损及明显凹陷": "Check stains, damage and visible sagging",
  "学习桌": "Desk",
  "查看桌面、抽屉及桌脚状况": "Check the desktop, drawers and legs",
  "学习椅": "Desk chair",
  "查看座面、椅背及调节功能": "Check the seat, backrest and adjustments",
  "床头柜": "Bedside table",
  "查看台面和抽屉有无污渍、破损或卡顿": "Check the top and drawers for stains, damage or sticking",
  "冰箱": "Fridge",
  "查看清洁、门封及冷藏状况": "Check cleanliness, door seals and cooling",
  "洗衣机": "Washing machine",
  "查看滚筒、门封及正常使用时有无漏水": "Check the drum, door seal and leaks during normal use",
  "烘干机": "Dryer",
  "查看滚筒、滤网及基本运行状况": "Check the drum, filter and basic operation",
  "微波炉": "Microwave",
  "查看内壁、转盘及门能否正常闭合": "Check the interior, turntable and door closure",
  "烤箱": "Oven",
  "查看内壁、烤盘、门封及基本运行状况": "Check the interior, trays, door seal and basic operation",
  "洗碗机": "Dishwasher",
  "查看碗篮、清洁情况及正常使用时有无漏水": "Check the racks, cleanliness and leaks during normal use",
  "空调": "Air conditioner",
  "查看外观、遥控器及基本运行状况": "Check appearance, remote and basic operation"
};
const translationPattern = new RegExp(
  Object.keys(english).sort((a,b)=>b.length-a.length)
    .map(key=>key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'g'
);
let language = 'zh';
let isHome = true;
let saveStatus = '仅保存在此设备';
try { language = localStorage.getItem('entry-report-language') === 'en' ? 'en' : 'zh'; } catch {}
function t(label) {
  return language === 'en' && Object.hasOwn(english,label) ? english[label] : label;
}
// Translate built-in markup before inserting dynamic content such as tenant notes.
function ui(parts, ...values) {
  const translate = part => language === 'en'
    ? part.replace(translationPattern, label => esc(english[label]))
    : part;
  if (typeof parts === 'string') return translate(parts);
  return parts.map((part,index)=>translate(part)+(index<values.length?values[index]:'')).join('');
}
function areaLabel(name) {
  if (language !== 'en') return name;
  if (regions.includes(name) || /^(Bedroom|Bathroom) \d+ \/ (卧室|卫浴) \d+$/.test(name)) return name.split(' / ')[0];
  return name;
}
function setSaveStatus(label) {
  saveStatus = label;
  $('#save').textContent = t(label);
}
function updateLanguageLabels() {
  document.documentElement.lang = language;
  document.title = 'Move In · ' + t('七天入住报告');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  $('#language').value = language;
  setSaveStatus(saveStatus);
}
function setLanguage(value) {
  language = value === 'en' ? 'en' : 'zh';
  try { localStorage.setItem('entry-report-language',language); } catch {}
  updateLanguageLabels();
  if (db) {
    if (isHome) home();
    else render();
  }
}
function markRemainingNormal() {
  if (!confirm(t('确认已检查本区域的所有项目，且尚未标记的项目均正常？'))) return;
  for (const item of r.areas[area].items) {
    if (!item.status) item.status = '正常';
  }
  save();
  render();
}
updateLanguageLabels();
