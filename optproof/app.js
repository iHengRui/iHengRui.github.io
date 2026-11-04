const text=(tag,value='',cls)=>{const element=document.createElement(tag);element.textContent=value??'';if(cls)element.className=cls;return element;};
const TABS=[['context','Context'],['statement','Statement'],['proof','Proof'],['nodes','Nodes'],['graph','Graph']];
const JOURNALS={'Mathematical Programming':'Math. Programming','SIAM Journal on Optimization':'SIOPT','Journal of Optimization Theory and Applications':'JOTA'};
const recordCache=new Map();
let catalogue=[],active=null,tab='context',renderSequence=0;
const title=record=>record.paper.title||record.record_id;
const raw=part=>typeof part==='string'?part:part?.raw_tex||'';
const authorsOf=paper=>(paper.authors||[]).map(author=>typeof author==='string'?author:author.name||[author.given,author.family].filter(Boolean).join(' ')).filter(Boolean).join(', ');

function setupTheme(){
  const toggle=document.getElementById('theme-toggle');
  const update=theme=>{document.documentElement.dataset.theme=theme;const next=theme==='dark'?'light':'dark';toggle.setAttribute('aria-label',`Switch to ${next} theme`);toggle.title=`Switch to ${next} theme`;document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#161817':'#f7f8f5';};
  update(document.documentElement.dataset.theme||'dark');toggle.hidden=false;
  toggle.addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';update(theme);try{localStorage.setItem('zhr-theme',theme);}catch(_){}});
}
function readLocation(){
  const params=new URLSearchParams(location.search),id=params.get('paper'),section=params.get('tab');
  return{id:catalogue.find(item=>item.record_id===id)?.record_id||catalogue[0]?.record_id,section:TABS.some(([key])=>key===section)?section:'context'};
}
function updateLocation(mode){
  const params=new URLSearchParams(location.search);params.set('paper',active);params.set('tab',tab);
  const url=location.pathname+'?'+params.toString()+location.hash;
  if(mode==='push'&&url!==location.pathname+location.search+location.hash)history.pushState(null,'',url);
  else if(mode==='replace')history.replaceState(null,'',url);
}
function renderList(){
  const query=document.getElementById('search').value.trim().toLowerCase(),journal=document.getElementById('journal').value,list=document.getElementById('papers');list.replaceChildren();
  for(const record of catalogue){
    if(query&&![title(record),record.record_id,record.paper.doi,authorsOf(record.paper)].join(' ').toLowerCase().includes(query)||journal&&record.paper.journal!==journal)continue;
    const button=text('button','','paper'+(record.record_id===active?' selected':''));button.type='button';button.dataset.recordId=record.record_id;button.setAttribute('aria-current',record.record_id===active?'true':'false');
    button.append(text('strong',title(record)),text('small',(JOURNALS[record.paper.journal]||record.paper.journal)+' · '+record.record_id));
    button.addEventListener('click',()=>selectRecord(record.record_id,tab,'push'));list.append(button);
  }
  const count=list.children.length;document.getElementById('catalog-status').textContent=`${count} of ${catalogue.length} records`;
  if(!count)list.append(text('div','No matching records. Try a title, author, or arXiv ID.','empty'));
}
function loadingPanel(){const panel=text('div','','loading-panel'),dot=text('span','','loading-dot');panel.append(dot,text('p','Opening the proof…'));return panel;}
async function loadRecord(entry){
  if(recordCache.has(entry.record_id))return recordCache.get(entry.record_id);
  const response=await fetch(entry.url);if(!response.ok)throw new Error(`Record request returned ${response.status}.`);
  const record=await response.json();if(record.record_id!==entry.record_id)throw new Error('The record does not match its catalogue entry.');
  record.semantic_graph={...record.dependency_graph,nodes:record.nodes};recordCache.set(entry.record_id,record);return record;
}
async function selectRecord(id,section=tab,historyMode='replace'){
  const entry=catalogue.find(record=>record.record_id===id);if(!entry)return;
  active=id;tab=section;updateLocation(historyMode);renderList();
  const sequence=++renderSequence,host=document.getElementById('detail');host.setAttribute('aria-busy','true');
  if(!recordCache.has(id))host.replaceChildren(loadingPanel());
  try{const record=await loadRecord(entry);if(sequence!==renderSequence)return;renderDetail(record);host.setAttribute('aria-busy','false');}
  catch(error){if(sequence!==renderSequence)return;host.replaceChildren();const panel=text('div','','error-panel');panel.append(text('h2','This proof could not be loaded.'),text('p','Please try again, or use the dataset downloads below.'));const retry=text('button','Try again','button');retry.type='button';retry.addEventListener('click',()=>selectRecord(id,section,'replace'));panel.append(retry);host.append(panel);host.setAttribute('aria-busy','false');}
}
function appendUnits(parent,part){
  if(!part?.units?.length){parent.append(text('pre',raw(part)));return;}
  for(const unit of part.units){const section=text('section','','unit');section.append(text('pre',unit.raw_tex||''));parent.append(section);}
}
function sourceToolbar(parent,value){
  const toolbar=text('div','','source-toolbar'),copy=text('button','Copy LaTeX','copy-button');copy.type='button';copy.setAttribute('aria-label','Copy original LaTeX source');
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(value);copy.textContent='Copied';setTimeout(()=>{copy.textContent='Copy LaTeX';},1800);}catch(_){copy.textContent='Select source to copy';setTimeout(()=>{copy.textContent='Copy LaTeX';},2200);}});
  toolbar.append(text('span','ORIGINAL LATEX'),copy);parent.append(toolbar);
}
function renderDetail(record){
  const host=document.getElementById('detail'),paper=record.paper;host.replaceChildren();host.scrollTop=0;host.dataset.recordId=record.record_id;
  const kicker=text('div','','record-kicker');kicker.append(text('span',JOURNALS[paper.journal]||paper.journal,'journal-badge'),text('span',record.record_id));host.append(kicker,text('h2',title(record)));
  const authors=authorsOf(paper);if(authors)host.append(text('div',authors,'meta'));
  const metadata=text('div','','meta');metadata.append(document.createTextNode(`${record.nodes.length} nodes`),text('span','·','count-separator'),document.createTextNode(`${record.dependency_graph.edges.length} support links`));host.append(metadata);
  const links=text('div','','record-links');const entry=catalogue.find(item=>item.record_id===record.record_id);
  for(const[label,url]of[['arXiv',paper.abstract_url],['Paper PDF',paper.pdf_url],['DOI',paper.doi?'https://doi.org/'+paper.doi:null],['Record JSON',entry?.url]])if(url){const link=text('a',label+' ↗');link.href=url;link.target='_blank';link.rel='noopener';if(label==='Record JSON')link.setAttribute('download',record.record_id+'.json');links.append(link);}host.append(links);
  const nav=text('nav','','tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Proof record sections');
  for(const[key,label]of TABS){
    const button=text('button',label,tab===key?'active':'');button.type='button';button.id='tab-'+key;button.dataset.tab=key;button.setAttribute('role','tab');button.setAttribute('aria-selected',String(tab===key));button.setAttribute('aria-controls','tabbody');button.tabIndex=tab===key?0:-1;
    button.addEventListener('click',()=>selectRecord(active,key,'push'));
    button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=TABS.findIndex(([name])=>name===key);const next=event.key==='Home'?0:event.key==='End'?TABS.length-1:(index+(event.key==='ArrowRight'?1:-1)+TABS.length)%TABS.length;selectRecord(active,TABS[next][0],'push').then(()=>document.getElementById('tab-'+TABS[next][0])?.focus());});nav.append(button);
  }host.append(nav);
  const body=text('div');body.id='tabbody';body.dataset.section=tab;body.setAttribute('role','tabpanel');body.setAttribute('aria-labelledby','tab-'+tab);host.append(body);
  if(['context','statement','proof'].includes(tab)){sourceToolbar(body,raw(record[tab]));if(tab==='statement')body.append(text('pre',raw(record.statement)));else appendUnits(body,record[tab]);}
  else if(tab==='nodes')appendSemanticNodeList(body,record);
  else appendSemanticGraphView(body,record);
}
async function initialize(){
  setupTheme();
  try{
    const responses=await Promise.all([fetch('data/catalog.json'),fetch('data/summary.json')]);if(responses.some(response=>!response.ok))throw new Error('Catalogue request failed.');
    const [catalog,summary]=await Promise.all(responses.map(response=>response.json()));catalogue=catalog.records;if(!catalogue?.length)throw new Error('The catalogue is empty.');
    for(const journal of [...new Set(catalogue.map(record=>record.paper.journal))].sort()){const option=text('option',journal);option.value=journal;document.getElementById('journal').append(option);}
    for(const[id,value]of [['stat-records',summary.records],['stat-journals',Object.keys(summary.journals).length],['stat-nodes',summary.nodes],['stat-edges',summary.support_edges]])document.getElementById(id).textContent=Number(value).toLocaleString('en-US');
    document.getElementById('search').addEventListener('input',renderList);document.getElementById('journal').addEventListener('change',renderList);
    const locationState=readLocation();await selectRecord(locationState.id,locationState.section,'replace');
    window.addEventListener('popstate',()=>{const state=readLocation();selectRecord(state.id,state.section,'none');});
  }catch(error){document.getElementById('catalog-status').textContent='Catalogue unavailable';document.getElementById('papers').replaceChildren(text('p','Use the downloads below, or refresh to try again.','empty'));const host=document.getElementById('detail');host.setAttribute('aria-busy','false');host.replaceChildren(text('p','The catalogue could not be loaded. The dataset is also available below.','empty'));}
}
initialize();
