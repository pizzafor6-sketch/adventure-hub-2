'use strict';
(() => {
  const KEY = 'adventure-hub-2-preview-v1'; // Keep existing saved records
  const labels = { vehicles:'Cruiser Garage', deals:'Deal Hunter', rewards:'Points Explorer' };
  const fields = {
    vehicles:[['name','Vehicle name','text'],['value','Estimated value ($)','number'],['notes','Notes','textarea']],
    deals:[['name','Listing title','text'],['category','Category','select:Welder|FJ60 trade|Vintage motorcycle|Land Cruiser|Other'],['kind','Opportunity','select:For sale|Trade|Both'],['price','Asking price ($; leave blank for trade)','number'],['estimatedValue','Estimated fair value ($; optional)','number'],['location','Location','text'],['url','Listing URL','url'],['status','Status','select:Watching|Contacted|Negotiating|Passed|Purchased'],['notes','Notes / seller details','textarea']],
    rewards:[['name','Program name','text'],['balance','Points balance','number'],['notes','Notes','textarea']]
  };
  let state = {vehicles:[],deals:[],rewards:[]};
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if(saved && ['vehicles','deals','rewards'].every(k=>Array.isArray(saved[k]))) state=saved; } catch(err) { console.warn('Saved data could not be loaded',err); }
  const REWARDS_KEY = KEY+'-points-explorer-v1';
  const defaultBalances = [
    {name:'Delta SkyMiles',balance:428000,updated:''},
    {name:'Amex Membership Rewards',balance:276000,updated:''},
    {name:'Marriott Bonvoy',balance:536000,updated:''}
  ];
  let points = {balances:[],trips:[]};
  try {const saved=JSON.parse(localStorage.getItem(REWARDS_KEY));if(saved&&Array.isArray(saved.balances)&&Array.isArray(saved.trips))points=saved;}catch(e){console.warn('Points data could not be loaded',e);}
  let pointsEditing=null;
  function persistPoints(){try{localStorage.setItem(REWARDS_KEY,JSON.stringify(points));return true;}catch(e){alert('Could not save points data.');return false;}}
  function formatPoints(n){return Number(n||0).toLocaleString('en-US');}
  function renderPoints(){
    const programs=defaultBalances.map(d=>points.balances.find(x=>x.name===d.name)||{...d,balance:null});
    const cards=programs.map(p=>'<article class="card"><h3>'+escapeHTML(p.name)+'</h3><div class="amount">'+(p.balance==null?'Not confirmed':formatPoints(p.balance))+'</div><div class="muted">'+(p.updated?'Updated '+escapeHTML(p.updated):'Starting estimate not yet confirmed')+'</div><div class="actions"><button type="button" data-balance="'+escapeHTML(p.name)+'">Update balance</button></div></article>').join('');
    const trips=points.trips.map(t=>{const cash=Number(t.cash||0),pts=Number(t.points||0),fees=Number(t.fees||0);const cpp=pts>0&&cash>fees?((cash-fees)*100/pts).toFixed(2):null;return '<article class="card"><div class="muted">'+escapeHTML(t.type||'Flight')+' · '+escapeHTML(t.program||'Delta SkyMiles')+' · '+escapeHTML(t.status||'Watching')+'</div><h3>'+escapeHTML(t.name)+'</h3><div class="amount">'+formatPoints(pts)+' points</div><p class="muted">'+escapeHTML(t.dates||'Dates not set')+' · '+escapeHTML(t.travelers||'1')+' traveler(s)</p><p class="muted">Cash comparison: '+(cash?money(cash):'Not set')+' · Taxes/fees: '+money(fees)+'</p>'+(cpp?'<p class="muted">Estimated redemption value: <strong>'+cpp+'¢ per point</strong> (cash price less award fees)</p>':'')+'<p class="muted notes">'+escapeHTML(t.notes||'')+'</p><div class="actions">'+(safeUrl(t.url)?'<a class="link-button" href="'+escapeHTML(safeUrl(t.url))+'" target="_blank" rel="noopener noreferrer">View offer ↗</a>':'')+'<button type="button" data-trip-edit="'+t.id+'">Edit</button><button type="button" data-trip-delete="'+t.id+'">Delete</button></div></article>';}).join('');
    root.innerHTML='<h1>Points Explorer</h1><p>Track rewards balances and compare flight and hotel opportunities. Balances are saved on this device, not linked to your loyalty accounts.</p><div class="grid">'+cards+'</div><div id="points-editor"></div><div class="panel"><h2>Christmas family trip</h2><p>From Salt Lake City · Depart December 26–31, 2026 · Approximately 7 days · 4–6 award travelers, plus possible cash tickets.</p><p class="muted">Your existing Delta SkyMiles Deal Hunter runs separately through ChatGPT Tasks. Award inventory and prices are not live in this app.</p></div><div class="panel"><h2>Saved redemption opportunities</h2><p>Save flights or hotels and compare points against cash. For group travel, enter the total points, cash price, and taxes for the same travelers.</p><div class="actions"><button type="button" class="primary" id="add-trip">+ Save opportunity</button><button type="button" id="import-trips">Import award deals from file</button></div><input type="file" id="trips-file" accept=".json,application/json" hidden></div><div id="trip-editor"></div><div class="grid">'+(trips||'<div class="empty">No award opportunities saved yet.</div>')+'</div><p class="muted">Important: these balances and award deals are stored locally on this device. Use “Download backup” on Overview to include them in your backup.</p>';
    if(pointsEditing){if(pointsEditing.kind==='balance')showBalanceEditor(pointsEditing.name);else showTripEditor(pointsEditing.id);}
  }
  function showBalanceEditor(name){pointsEditing={kind:'balance',name};const existing=points.balances.find(x=>x.name===name);const fallback=defaultBalances.find(x=>x.name===name);document.getElementById('points-editor').innerHTML='<div class="panel"><h2>Update '+escapeHTML(name)+'</h2><form id="balance-form"><label for="balance-number">Current points balance</label><input id="balance-number" name="balance" type="number" min="0" step="1" required value="'+escapeHTML(existing?.balance??fallback.balance)+'"><div class="actions"><button class="primary" type="submit">Save balance</button><button type="button" id="cancel-points">Cancel</button></div></form></div>';}
  function showTripEditor(id){pointsEditing={kind:'trip',id};const t=points.trips.find(x=>x.id===id)||{};const field=(key,label,type='text')=>'<label for="trip-'+key+'">'+label+'</label><input id="trip-'+key+'" name="'+key+'" type="'+type+'" '+(type==='number'?'min="0" step="any" ':'')+'value="'+escapeHTML(t[key]??'')+'">';const choice=(key,label,opts)=>'<label for="trip-'+key+'">'+label+'</label><select id="trip-'+key+'" name="'+key+'">'+opts.map(x=>'<option'+(t[key]===x?' selected':'')+'>'+escapeHTML(x)+'</option>').join('')+'</select>';document.getElementById('trip-editor').innerHTML='<div class="panel"><h2>'+(id==='new'?'Save award opportunity':'Edit opportunity')+'</h2><form id="trip-form">'+field('name','Destination or opportunity')+choice('type','Type',['Flight','Hotel'])+choice('program','Rewards program',['Delta SkyMiles','Amex Membership Rewards','Marriott Bonvoy','Other'])+field('dates','Travel dates')+field('travelers','Travelers / rooms','number')+field('points','Total points required','number')+field('cash','Comparable total cash price ($)','number')+field('fees','Award taxes and fees ($)','number')+choice('status','Status',['Watching','Considering','Booked','Passed'])+field('url','Offer URL','url')+'<label for="trip-notes">Notes</label><textarea id="trip-notes" name="notes">'+escapeHTML(t.notes||'')+'</textarea><div class="actions"><button type="submit" class="primary">Save opportunity</button><button type="button" id="cancel-points">Cancel</button></div></form></div>';}
  let page='home'; let editing=null; let dealFilter='All';
  const root=document.getElementById('content');
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'$'+Number(n||0).toLocaleString('en-US');
  function safeUrl(value){try{const u=new URL(String(value||''));return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
  function dealCard(item){
    const url=safeUrl(item.url);const price=Number(item.price||0);const fair=Number(item.estimatedValue||0);
    const difference=price>0&&fair>0?'<p class="muted">Estimated difference: <strong>'+ (fair-price>=0?'+':'−')+money(Math.abs(fair-price))+'</strong> vs. your estimate</p>':'';
    return '<article class="card"><div class="muted">'+escapeHTML(item.category||'Other')+' · '+escapeHTML(item.kind||'For sale')+' · '+escapeHTML(item.status||'Watching')+'</div><h3>'+escapeHTML(item.name)+'</h3><div class="amount">'+(price?money(price):'Trade / price not set')+'</div>'+(item.location?'<p class="muted">📍 '+escapeHTML(item.location)+'</p>':'')+difference+'<p class="muted notes">'+escapeHTML(item.notes||'No notes')+'</p><div class="actions">'+(url?'<a class="link-button" href="'+escapeHTML(url)+'" target="_blank" rel="noopener noreferrer">Open listing ↗</a>':'')+'<button type="button" data-edit="'+item.id+'">Edit</button><button type="button" data-delete="'+item.id+'">Delete</button></div></article>';
  }
  function dealSearches(){
    const searches=[['Welders','Miller Lincoln MIG welder used sale Utah'],['FJ60 trades','trade for Toyota FJ60 Land Cruiser'],['Vintage motorcycles','vintage motorcycle for sale Utah'],['Land Cruisers','Toyota FJ40 for sale Utah']];
    return '<div class="panel"><h2>Find listings online</h2><p>These buttons open searches in a new tab. Results are not imported automatically; save interesting listings with “Add deal.”</p><div class="actions">'+searches.map(([label,q])=>'<a class="link-button" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q='+encodeURIComponent(q)+'">Search '+escapeHTML(label)+' ↗</a>').join('')+'</div><p class="muted">Automatic alerts can run separately through ChatGPT Tasks; this version does not sync those alerts into the app.</p></div>';
  }
  function persist(){ try {localStorage.setItem(KEY,JSON.stringify(state));return true;} catch(e){alert('Could not save. Please check browser storage settings.');return false;} }
  function backupData(){
    const backup={format:'adventure-hub-2-backup',version:1,createdAt:new Date().toISOString(),data:state,pointsExplorer:points};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download='adventure-hub-backup-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  function backupControls(){return '<div class="panel"><h2>Back up your Adventure Hub</h2><p>Download a copy of your vehicles, deals, and points. Store it somewhere safe, such as iCloud Drive.</p><button type="button" class="primary" id="backup-data">Download backup</button> <button type="button" id="restore-data">Restore from backup</button><input type="file" id="backup-file" accept=".json,application/json" hidden><p class="muted">This backup contains records saved in this browser only. Restoring replaces the records on this device after confirmation.</p></div>';}
  function nav(next){page=next;editing=null;pointsEditing=null;document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);b.setAttribute('aria-current',b.dataset.page===page?'page':'false');});render();}
  function render(){
    if(page==='home'){
      root.innerHTML='<h1>Your adventures, organized.</h1><p>Choose a section to manage your vehicles, potential deals, or rewards balances.</p><div class="grid">'+Object.keys(labels).map(k=>'<article class="card"><h3>'+labels[k]+'</h3><div class="amount">'+state[k].length+' saved</div><button type="button" class="primary" data-go="'+k+'">Open '+labels[k]+'</button></article>').join('')+'</div>'+backupControls();
      return;
    }
    if(page==='rewards'){renderPoints();return;}
    const list=state[page];
    if(page==='deals'){
      const categories=['All','Welder','FJ60 trade','Vintage motorcycle','Land Cruiser','Other'];
      const shown=dealFilter==='All'?list:list.filter(item=>(item.category||'Other')===dealFilter);
      root.innerHTML='<h1>Deal Hunter</h1><p>Track purchases and trades, compare prices, and keep seller links in one place.</p><button type="button" class="primary" id="add">+ Add deal</button> <button type="button" id="import-deals">Import deals from file</button><input type="file" id="deals-file" accept=".json,application/json" hidden>'+dealSearches()+'<div class="panel"><label for="deal-filter">Show category</label><select id="deal-filter">'+categories.map(c=>'<option value="'+escapeHTML(c)+'"'+(dealFilter===c?' selected':'')+'>'+escapeHTML(c)+'</option>').join('')+'</select><p class="muted">'+shown.length+' of '+list.length+' saved opportunities</p></div><div id="editor"></div><div class="grid">'+(shown.length?shown.map(dealCard).join(''):'<div class="empty">No deals in this category yet. Add one to start tracking.</div>')+'</div>';
    } else {
      root.innerHTML='<h1>'+labels[page]+'</h1><p>Save and update your '+(page==='vehicles'?'Land Cruisers and other vehicles':'travel points balances')+'.</p><button type="button" class="primary" id="add">+ Add '+(page==='vehicles'?'vehicle':'program')+'</button>'+(page==='vehicles'?'<button type="button" id="import-vehicles">Import vehicles from file</button><input type="file" id="vehicle-file" accept=".json,application/json" hidden>':'')+'<div id="editor"></div><div class="grid">'+(list.length?list.map(item=>'<article class="card"><h3>'+escapeHTML(item.name)+'</h3><div class="amount">'+(page==='rewards'?Number(item.balance||0).toLocaleString('en-US')+' points':money(item.value))+'</div><div class="muted">'+escapeHTML(item.notes||'No notes')+'</div><div class="actions"><button type="button" data-edit="'+item.id+'">Edit</button><button type="button" data-delete="'+item.id+'">Delete</button></div></article>').join(''):'<div class="empty">Nothing saved yet. Use the Add button to create your first record.</div>')+'</div>';
    }
    if(editing!==null) showEditor(editing);
  }
  function showEditor(id){
    editing=id;
    const item=state[page].find(x=>x.id===id)||{};
    const inputs=fields[page].map(([key,label,type])=>'<label for="f-'+key+'">'+label+'</label>'+(type==='textarea'?'<textarea id="f-'+key+'" name="'+key+'">'+escapeHTML(item[key]||'')+'</textarea>':type.startsWith('select:')?'<select id="f-'+key+'" name="'+key+'">'+type.slice(7).split('|').map(opt=>'<option value="'+escapeHTML(opt)+'"'+(item[key]===opt?' selected':'')+'>'+escapeHTML(opt)+'</option>').join('')+'</select>':'<input id="f-'+key+'" name="'+key+'" type="'+type+'" '+(key==='name'?'required ':'')+(type==='number'?' min="0" step="any" ':'')+'value="'+escapeHTML(item[key]??'')+'">')).join('');
    document.getElementById('editor').innerHTML='<div class="panel"><h2>'+(id==='new'?'Add record':'Edit record')+'</h2><form id="record-form">'+inputs+'<div class="actions"><button class="primary" type="submit">Save record</button><button type="button" id="cancel">Cancel</button></div></form></div>';
    document.getElementById('f-name').focus();
  }
  document.addEventListener('click',e=>{
    const go=e.target.closest('[data-page],[data-go]');if(go){nav(go.dataset.page||go.dataset.go);return;}
    if(e.target.closest('#backup-data')){backupData();return;}
    if(e.target.closest('#restore-data')){document.getElementById('backup-file').click();return;}
    const balance=e.target.closest('[data-balance]');if(balance){showBalanceEditor(balance.dataset.balance);document.getElementById('points-editor').scrollIntoView({behavior:'smooth'});return;}
    if(e.target.closest('#add-trip')){showTripEditor('new');document.getElementById('trip-editor').scrollIntoView({behavior:'smooth'});return;}
    if(e.target.closest('#import-trips')){document.getElementById('trips-file').click();return;}
    if(e.target.closest('#cancel-points')){pointsEditing=null;renderPoints();return;}
    const te=e.target.closest('[data-trip-edit]');if(te){showTripEditor(Number(te.dataset.tripEdit));document.getElementById('trip-editor').scrollIntoView({behavior:'smooth'});return;}
    const td=e.target.closest('[data-trip-delete]');if(td){if(confirm('Delete this saved award opportunity?')){points.trips=points.trips.filter(t=>t.id!==Number(td.dataset.tripDelete));persistPoints();pointsEditing=null;renderPoints();}return;}
    if(e.target.closest('#add')){showEditor('new');document.getElementById('editor')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(e.target.closest('#import-deals')){document.getElementById('deals-file').click();return;}
    if(e.target.closest('#import-vehicles')){document.getElementById('vehicle-file').click();return;}
    if(e.target.closest('#cancel')){editing=null;render();return;}
    const edit=e.target.closest('[data-edit]');if(edit){showEditor(Number(edit.dataset.edit));return;}
    const del=e.target.closest('[data-delete]');if(del){const id=Number(del.dataset.delete);if(confirm('Delete this record?')){state[page]=state[page].filter(x=>x.id!==id);persist();render();}return;}
  });
  document.addEventListener('change', async e=>{
    if(e.target.id==='trips-file'){
      const file=e.target.files?.[0];if(!file)return;
      try {const data=JSON.parse(await file.text());const arr=Array.isArray(data.awardDeals)?data.awardDeals:null;if(!arr)throw Error('Expected a JSON file containing awardDeals list.');if(arr.length>100)throw Error('Maximum 100 opportunities per import.');
        const cleaned=arr.map((x,i)=>{if(!x||typeof x.name!=='string'||!x.name.trim())throw Error('Missing name in item '+(i+1));const t={name:x.name.trim().slice(0,250),type:['Flight','Hotel'].includes(x.type)?x.type:'Flight',program:String(x.program||'Delta SkyMiles').slice(0,100),dates:String(x.dates||'').slice(0,150),travelers:Number(x.travelers||1),points:Number(x.points||0),cash:Number(x.cash||0),fees:Number(x.fees||0),status:'Watching',url:String(x.url||''),notes:String(x.notes||'').slice(0,3000)};if([t.travelers,t.points,t.cash,t.fees].some(n=>!Number.isFinite(n)||n<0)||t.travelers<1||(t.url&&!safeUrl(t.url)))throw Error('Invalid numbers or URL in item '+(i+1));return t;});
        const fingerprint=t=>[t.name.toLowerCase(),t.dates.toLowerCase(),t.program.toLowerCase(),t.points].join('|');const known=new Set(points.trips.map(fingerprint));const additions=cleaned.filter(t=>{const k=fingerprint(t);if(known.has(k))return false;known.add(k);return true;});if(!additions.length){alert('No new opportunities; duplicates skipped.');return;}if(!confirm('Import '+additions.length+' award opportunities? Existing records will be kept.'))return;const previous=JSON.stringify(points);for(const t of additions)points.trips.push({...t,id:Date.now()+Math.floor(Math.random()*1e9)});if(!persistPoints())points=JSON.parse(previous);pointsEditing=null;renderPoints();alert('Imported '+additions.length+' opportunities.');
      }catch(err){alert('Import failed: '+err.message);}finally{e.target.value='';}return;
    }
    if(e.target.id==='deal-filter'){dealFilter=e.target.value;render();return;}
    if(e.target.id==='deals-file'){
      const file=e.target.files&&e.target.files[0];if(!file)return;
      try{
        const parsed=JSON.parse(await file.text());
        // Accept {deals:[...]}, or a complete Adventure Hub backup.
        const incomingList=Array.isArray(parsed.deals)?parsed.deals:(parsed.format==='adventure-hub-2-backup'&&parsed.data&&Array.isArray(parsed.data.deals)?parsed.data.deals:null);
        if(!incomingList)throw new Error('The JSON file must contain a deals list.');
        if(incomingList.length>500)throw new Error('Please import no more than 500 deals at once.');
        const categories=['Welder','FJ60 trade','Vintage motorcycle','Land Cruiser','Other'];
        const kinds=['For sale','Trade','Both'];
        const statuses=['Watching','Contacted','Negotiating','Passed','Purchased'];
        const cleaned=incomingList.map((v,i)=>{
          if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Invalid listing at position '+(i+1));
          const name=String(v.name||'').trim();
          const url=String(v.url||'').trim();
          const price=(v.price===''||v.price==null)?0:Number(v.price);
          const estimatedValue=(v.estimatedValue===''||v.estimatedValue==null)?0:Number(v.estimatedValue);
          if(!name||name.length>250)throw new Error('Missing or overly long listing title at position '+(i+1));
          if(!Number.isFinite(price)||price<0||!Number.isFinite(estimatedValue)||estimatedValue<0)throw new Error('Invalid price at position '+(i+1));
          if(url&&!safeUrl(url))throw new Error('Invalid listing URL at position '+(i+1));
          return {name,category:categories.includes(v.category)?v.category:'Other',kind:kinds.includes(v.kind)?v.kind:'For sale',price,estimatedValue,location:String(v.location||'').slice(0,250),url, status:statuses.includes(v.status)?v.status:'Watching',notes:String(v.notes||'').slice(0,5000)};
        });
        // Prefer listing URLs for duplicate detection; otherwise compare title and location.
        const fingerprint=v=>v.url&&safeUrl(v.url)?'url:'+safeUrl(v.url).replace(/\/$/,'').toLowerCase():'title:'+v.name.trim().toLowerCase()+'|'+String(v.location||'').trim().toLowerCase();
        const known=new Set(state.deals.map(fingerprint));
        const additions=cleaned.filter(v=>{const key=fingerprint(v);if(known.has(key))return false;known.add(key);return true;});
        const skipped=cleaned.length-additions.length;
        if(!additions.length){alert('No new deals found. '+skipped+' duplicate(s) skipped; existing records were not changed.');return;}
        if(!confirm('Import '+additions.length+' new deal(s)? '+skipped+' duplicate(s) will be skipped. Existing records will be kept.'))return;
        const previous=JSON.stringify(state);
        const existingIds=new Set(state.deals.map(v=>v.id));
        for(const v of additions){let id=Date.now()+Math.floor(Math.random()*1000000);while(existingIds.has(id))id++;existingIds.add(id);state.deals.push({id,...v});}
        if(persist()){editing=null;dealFilter='All';render();alert('Imported '+additions.length+' deal(s). '+skipped+' duplicate(s) skipped.');}
        else state=JSON.parse(previous);
      }catch(err){alert('Could not import deals: '+err.message);}
      finally{e.target.value='';}
      return;
    }

    if(e.target.id==='backup-file'){
      const file=e.target.files&&e.target.files[0];if(!file)return;
      try {
        const parsed=JSON.parse(await file.text());
        if(parsed.format!=='adventure-hub-2-backup'||parsed.version!==1||!parsed.data||!['vehicles','deals','rewards'].every(k=>Array.isArray(parsed.data[k])&&parsed.data[k].every(v=>v&&typeof v.name==='string'&&Number.isFinite(v.id))))throw new Error('This is not a valid Adventure Hub 2.0 backup.');
        if(!confirm('Restore this backup? This will REPLACE the records currently saved on this device. Choose Cancel to keep them.'))return;
        const previous=JSON.stringify(state);
        try {localStorage.setItem(KEY+'-before-restore-'+Date.now(),previous);}catch(err){throw new Error('Could not create a safety copy; restore cancelled.');}
        state={vehicles:parsed.data.vehicles,deals:parsed.data.deals,rewards:parsed.data.rewards};
        if(parsed.pointsExplorer&&Array.isArray(parsed.pointsExplorer.balances)&&Array.isArray(parsed.pointsExplorer.trips)){points=parsed.pointsExplorer;persistPoints();}
        if(!persist()){state=JSON.parse(previous);return;}
        editing=null;nav('home');alert('Backup restored successfully.');
      } catch(err){alert('Could not restore: '+err.message);}
      finally{e.target.value='';}
      return;
    }
    if(e.target.id!=='vehicle-file')return;
    const file=e.target.files&&e.target.files[0]; if(!file)return;
    try {
      const parsed=JSON.parse(await file.text());
      if(!Array.isArray(parsed.vehicles))throw new Error('This file does not contain a vehicles list.');
      const incoming=parsed.vehicles.map(v=>({name:String(v.name||'').trim(),value:Number(v.value||0),notes:String(v.notes||'')}));
      if(incoming.some(v=>!v.name||!Number.isFinite(v.value)))throw new Error('Some vehicle records are invalid.');
      const existing=new Set(state.vehicles.map(v=>v.name.toLowerCase()));
      const additions=incoming.filter(v=>!existing.has(v.name.toLowerCase()) && existing.add(v.name.toLowerCase()));
      if(!additions.length){alert('No new vehicles to import. Existing vehicles were left unchanged.');return;}
      if(!confirm('Add '+additions.length+' vehicle(s) to Cruiser Garage? Existing records will be kept.'))return;
      const before=JSON.stringify(state);
      localStorage.setItem(KEY+'-before-import-'+Date.now(),before);
      const ids=new Set(state.vehicles.map(v=>v.id));
      for(const v of additions){let id=Date.now()+Math.floor(Math.random()*1000000);while(ids.has(id))id++;ids.add(id);state.vehicles.push({id,...v});}
      if(persist()){editing=null;render();alert('Imported '+additions.length+' vehicle(s).');}
      else {state=JSON.parse(before);}
    } catch(err){alert('Could not import: '+err.message);}
    finally {e.target.value='';}
  });
  document.addEventListener('submit',e=>{
    if(e.target.id==='balance-form'){e.preventDefault();const n=Number(new FormData(e.target).get('balance'));if(!Number.isSafeInteger(n)||n<0){alert('Enter a valid nonnegative whole-number balance.');return;}const name=pointsEditing.name;points.balances=points.balances.filter(x=>x.name!==name);points.balances.push({name,balance:n,updated:new Date().toLocaleDateString()});if(persistPoints()){pointsEditing=null;renderPoints();}return;}
    if(e.target.id==='trip-form'){e.preventDefault();const f=new FormData(e.target);const t={id:pointsEditing.id==='new'?Date.now()+Math.floor(Math.random()*1e9):pointsEditing.id};for(const k of ['name','type','program','dates','status','url','notes'])t[k]=String(f.get(k)||'').trim();for(const k of ['travelers','points','cash','fees'])t[k]=Number(f.get(k)||0);if(!t.name||[t.travelers,t.points,t.cash,t.fees].some(n=>!Number.isFinite(n)||n<0)||t.travelers<1||(t.url&&!safeUrl(t.url))){alert('Please check the title, numbers, and URL.');return;}const previous=JSON.stringify(points);if(pointsEditing.id==='new')points.trips.push(t);else points.trips=points.trips.map(x=>x.id===t.id?t:x);if(persistPoints()){pointsEditing=null;renderPoints();}else points=JSON.parse(previous);return;}
    if(e.target.id!=='record-form')return;
    e.preventDefault();const data=new FormData(e.target);const record={id:editing==='new'?Date.now():editing};
    fields[page].forEach(([key,,type])=>{record[key]=type==='number'?Number(data.get(key)||0):String(data.get(key)||'').trim();});
    if(!record.name){alert('Please enter a name.');return;}
    if(page==='deals'&&record.url&&!safeUrl(record.url)){alert('Please enter a valid http or https listing URL.');return;}
    if(page==='deals'&&(record.price<0||record.estimatedValue<0)){alert('Prices cannot be negative.');return;}
    const previous=JSON.stringify(state);
    if(editing==='new')state[page].push(record);else state[page]=state[page].map(x=>x.id===editing?record:x);
    if(persist()){editing=null;render();}else{state=JSON.parse(previous);}
  });
  nav('home');
})();
