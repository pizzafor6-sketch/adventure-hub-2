'use strict';
(() => {
  const KEY = 'adventure-hub-2-preview-v1'; // Keep existing saved records
  const labels = { vehicles:'Cruiser Garage', deals:'Deal Hunter', rewards:'Points Explorer' };
  const fields = {
    vehicles:[['name','Vehicle name','text'],['value','Estimated value ($)','number'],['notes','Notes','textarea']],
    deals:[['name','Deal or trade','text'],['price','Asking price ($)','number'],['notes','Notes / link','textarea']],
    rewards:[['name','Program name','text'],['balance','Points balance','number'],['notes','Notes','textarea']]
  };
  let state = {vehicles:[],deals:[],rewards:[]};
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if(saved && ['vehicles','deals','rewards'].every(k=>Array.isArray(saved[k]))) state=saved; } catch(err) { console.warn('Saved data could not be loaded',err); }
  let page='home'; let editing=null;
  const root=document.getElementById('content');
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'$'+Number(n||0).toLocaleString('en-US');
  function persist(){ try {localStorage.setItem(KEY,JSON.stringify(state));return true;} catch(e){alert('Could not save. Please check browser storage settings.');return false;} }
  function nav(next){page=next;editing=null;document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);b.setAttribute('aria-current',b.dataset.page===page?'page':'false');});render();}
  function render(){
    if(page==='home'){
      root.innerHTML='<h1>Your adventures, organized.</h1><p>Choose a section to manage your vehicles, potential deals, or rewards balances.</p><div class="grid">'+Object.keys(labels).map(k=>'<article class="card"><h3>'+labels[k]+'</h3><div class="amount">'+state[k].length+' saved</div><button type="button" class="primary" data-go="'+k+'">Open '+labels[k]+'</button></article>').join('')+'</div>';
      return;
    }
    const list=state[page];
    root.innerHTML='<h1>'+labels[page]+'</h1><p>Save and update your '+(page==='vehicles'?'Land Cruisers and other vehicles':page==='deals'?'potential purchases and trades':'travel points balances')+'.</p><button type="button" class="primary" id="add">+ Add '+(page==='vehicles'?'vehicle':page==='deals'?'deal':'program')+'</button>'+(page==='vehicles'?'<button type="button" id="import-vehicles">Import vehicles from file</button><input type="file" id="vehicle-file" accept=".json,application/json" hidden>':'')+'<div id="editor"></div><div class="grid">'+(list.length?list.map(item=>'<article class="card"><h3>'+escapeHTML(item.name)+'</h3><div class="amount">'+(page==='rewards'?Number(item.balance||0).toLocaleString('en-US')+' points':money(page==='vehicles'?item.value:item.price))+'</div><div class="muted">'+escapeHTML(item.notes||'No notes')+'</div><div class="actions"><button type="button" data-edit="'+item.id+'">Edit</button><button type="button" data-delete="'+item.id+'">Delete</button></div></article>').join(''):'<div class="empty">Nothing saved yet. Use the Add button to create your first record.</div>')+'</div>';
    if(editing!==null) showEditor(editing);
  }
  function showEditor(id){
    editing=id;
    const item=state[page].find(x=>x.id===id)||{};
    const inputs=fields[page].map(([key,label,type])=>'<label for="f-'+key+'">'+label+'</label>'+(type==='textarea'?'<textarea id="f-'+key+'" name="'+key+'">'+escapeHTML(item[key]||'')+'</textarea>':'<input id="f-'+key+'" name="'+key+'" type="'+type+'" '+(key==='name'?'required ':'')+'value="'+escapeHTML(item[key]??'')+'">')).join('');
    document.getElementById('editor').innerHTML='<div class="panel"><h2>'+(id==='new'?'Add record':'Edit record')+'</h2><form id="record-form">'+inputs+'<div class="actions"><button class="primary" type="submit">Save record</button><button type="button" id="cancel">Cancel</button></div></form></div>';
    document.getElementById('f-name').focus();
  }
  document.addEventListener('click',e=>{
    const go=e.target.closest('[data-page],[data-go]');if(go){nav(go.dataset.page||go.dataset.go);return;}
    if(e.target.closest('#add')){showEditor('new');return;}
    if(e.target.closest('#import-vehicles')){document.getElementById('vehicle-file').click();return;}
    if(e.target.closest('#cancel')){editing=null;render();return;}
    const edit=e.target.closest('[data-edit]');if(edit){showEditor(Number(edit.dataset.edit));return;}
    const del=e.target.closest('[data-delete]');if(del){const id=Number(del.dataset.delete);if(confirm('Delete this record?')){state[page]=state[page].filter(x=>x.id!==id);persist();render();}return;}
  });
  document.addEventListener('change', async e=>{
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
    if(e.target.id!=='record-form')return;
    e.preventDefault();const data=new FormData(e.target);const record={id:editing==='new'?Date.now():editing};
    fields[page].forEach(([key,,type])=>{record[key]=type==='number'?Number(data.get(key)||0):String(data.get(key)||'').trim();});
    if(!record.name){alert('Please enter a name.');return;}
    if(editing==='new')state[page].push(record);else state[page]=state[page].map(x=>x.id===editing?record:x);
    if(persist()){editing=null;render();}
  });
  nav('home');
})();
