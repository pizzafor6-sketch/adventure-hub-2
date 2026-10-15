'use strict';
(() => {
  const KEY = 'adventure-hub-2-preview-v1';
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
    root.innerHTML='<h1>'+labels[page]+'</h1><p>Save and update your '+(page==='vehicles'?'Land Cruisers and other vehicles':page==='deals'?'potential purchases and trades':'travel points balances')+'.</p><button type="button" class="primary" id="add">+ Add '+(page==='vehicles'?'vehicle':page==='deals'?'deal':'program')+'</button><div id="editor"></div><div class="grid">'+(list.length?list.map(item=>'<article class="card"><h3>'+escapeHTML(item.name)+'</h3><div class="amount">'+(page==='rewards'?Number(item.balance||0).toLocaleString('en-US')+' points':money(page==='vehicles'?item.value:item.price))+'</div><div class="muted">'+escapeHTML(item.notes||'No notes')+'</div><div class="actions"><button type="button" data-edit="'+item.id+'">Edit</button><button type="button" data-delete="'+item.id+'">Delete</button></div></article>').join(''):'<div class="empty">Nothing saved yet. Use the Add button to create your first record.</div>')+'</div>';
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
    if(e.target.closest('#cancel')){editing=null;render();return;}
    const edit=e.target.closest('[data-edit]');if(edit){showEditor(Number(edit.dataset.edit));return;}
    const del=e.target.closest('[data-delete]');if(del){const id=Number(del.dataset.delete);if(confirm('Delete this record?')){state[page]=state[page].filter(x=>x.id!==id);persist();render();}return;}
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
