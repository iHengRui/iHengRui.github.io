const SEMANTIC_STATES=new Map();
const SEMANTIC_TYPES={
  ProblemSetting:{label:'Problem setting',fill:'#eaf2f6',stroke:'#7596a7'},
  Definition:{label:'Definition',fill:'#fff7de',stroke:'#b19b57'},
  Assumption:{label:'Assumption',fill:'#fff0e4',stroke:'#c0926a'},
  Algorithm:{label:'Algorithm',fill:'#eaf1ff',stroke:'#6f8eba'},
  TheoremStatement:{label:'Theorem',fill:'#e5f5ef',stroke:'#559582'},
  LemmaStatement:{label:'Lemma',fill:'#eef6e7',stroke:'#829c65'},
  Proposition:{label:'Proposition',fill:'#eaf5ec',stroke:'#6e9879'},
  Corollary:{label:'Corollary',fill:'#eaf5ec',stroke:'#6e9879'},
  ProofStep:{label:'Proof step',fill:'#edf0fb',stroke:'#7e8fb8'},
  ProofBlock:{label:'Proof',fill:'#edf0fb',stroke:'#7e8fb8'},
  DerivedFact:{label:'Derived fact',fill:'#eef5f5',stroke:'#759a98'},
  Notation:{label:'Notation',fill:'#f0f3f6',stroke:'#8b9caa'},
  ExternalFact:{label:'External fact',fill:'#f2eef7',stroke:'#9a8cac'},
  Interpretation:{label:'Interpretation',fill:'#f3f0f8',stroke:'#a095af'},
  RetainedSource:{label:'Source text',fill:'#f6f6f6',stroke:'#a2a8ad'},
};
function semanticType(value){
  const key=({theorem:'TheoremStatement',lemma:'LemmaStatement',proof:'ProofBlock'})[value]||value;
  const normalized=String(key||'').replace(/[_ -]/g,'').toLowerCase();
  const match=Object.keys(SEMANTIC_TYPES).find(k=>k.toLowerCase()===normalized);
  return SEMANTIC_TYPES[key]||SEMANTIC_TYPES[match]||{label:value||'Node',fill:'#f1f5f7',stroke:'#8fa4af'};
}
function semanticState(record){
  if(!SEMANTIC_STATES.has(record.record_id))SEMANTIC_STATES.set(record.record_id,{mode:'overview',selected:null,focus:false});
  return SEMANTIC_STATES.get(record.record_id);
}
function semanticElement(name,attrs={},value){
  const element=document.createElementNS('http://www.w3.org/2000/svg',name);
  for(const[key,item]of Object.entries(attrs))element.setAttribute(key,String(item));
  if(value!==undefined)element.textContent=String(value);return element;
}
function semanticLines(value,limit=12,maxLines=2){
  let rest=String(value||'');const lines=[];
  while(rest.length&&lines.length<maxLines){lines.push(rest.slice(0,limit));rest=rest.slice(limit);}
  if(rest.length)lines[lines.length-1]=lines[lines.length-1].slice(0,-1)+'…';return lines;
}
function semanticUnitRaw(unit){return unit.raw_tex||unit.raw||unit.text||'';}
function semanticGraphLayout(nodes,edges,mainId){
  const ids=new Set(nodes.map(n=>n.id)),adj=new Map(nodes.map(n=>[n.id,[]]));
  for(const edge of edges)if(ids.has(edge.source_id)&&ids.has(edge.target_id))adj.get(edge.source_id).push(edge.target_id);
  let nextIndex=0;const index=new Map(),low=new Map(),stack=[],onStack=new Set(),components=[],componentOf=new Map();
  function visit(id){
    index.set(id,nextIndex);low.set(id,nextIndex++);stack.push(id);onStack.add(id);
    for(const target of adj.get(id)){if(!index.has(target)){visit(target);low.set(id,Math.min(low.get(id),low.get(target)));}else if(onStack.has(target))low.set(id,Math.min(low.get(id),index.get(target)));}
    if(low.get(id)===index.get(id)){const group=[];let member;do{member=stack.pop();onStack.delete(member);componentOf.set(member,components.length);group.push(member);}while(member!==id);components.push(group);}
  }
  for(const node of nodes)if(!index.has(node.id))visit(node.id);
  const outgoing=components.map(()=>new Set()),predecessors=components.map(()=>new Set());
  for(const edge of edges){const source=componentOf.get(edge.source_id),target=componentOf.get(edge.target_id);if(source!==undefined&&target!==undefined&&source!==target){outgoing[source].add(target);predecessors[target].add(source);}}
  const mainComponent=componentOf.get(mainId),pending=outgoing.map(x=>x.size),rank=components.map(()=>0),queue=[];
  for(let i=0;i<components.length;i++)if(!pending[i]){rank[i]=i===mainComponent?0:2;queue.push(i);}
  for(let i=0;i<queue.length;i++)for(const source of predecessors[queue[i]]){rank[source]=Math.max(rank[source],rank[queue[i]]+1);if(--pending[source]===0)queue.push(source);}
  const columns=new Map();
  for(const node of nodes){const level=rank[componentOf.get(node.id)];if(!columns.has(level))columns.set(level,[]);columns.get(level).push(node);}
  for(const group of columns.values())group.sort((a,b)=>(a.id===mainId?-1:b.id===mainId?1:0)||(a.start??a.source_units?.[0]?.start??0)-(b.start??b.source_units?.[0]?.start??0)||a.id.localeCompare(b.id));
  const nodeW=188,nodeH=72,gapX=25,gapY=28,pad=24,rows=[];
  for(const[,group]of [...columns].sort((a,b)=>a[0]-b[0]))for(let i=0;i<group.length;i+=4)rows.push(group.slice(i,i+4));
  const width=pad*2+Math.max(1,...rows.map(row=>row.length))*(nodeW+gapX)-gapX,pos=new Map();
  rows.forEach((row,j)=>{const rowWidth=row.length*(nodeW+gapX)-gapX;row.forEach((node,i)=>pos.set(node.id,{x:(width-rowWidth)/2+i*(nodeW+gapX),y:pad+j*(nodeH+gapY),w:nodeW,h:nodeH}));});
  return{pos,width,height:pad*2+rows.length*nodeH+Math.max(0,rows.length-1)*gapY,columns,orientation:'vertical',cycleComponents:components.filter(group=>group.length>1||adj.get(group[0]).includes(group[0]))};
}
function semanticNodeLink(id,nodeMap,onSelect,attrs={},className='semantic-node-link'){
  const node=nodeMap.get(id),button=text('button',id+(node?.title?' · '+node.title:''),className);button.type='button';
  for(const[key,value]of Object.entries(attrs))button.setAttribute(key,value);button.onclick=()=>onSelect(id);return button;
}
function renderSemanticNodeDetail(host,record,id,onSelect,variant=null){
  const fullGraph=record.semantic_graph,fullMap=new Map((fullGraph?.nodes||[]).map(node=>[node.id,node]));
  const variantMap=new Map((variant?.nodes||[]).map(node=>[node.id,node]));
  const graph=variantMap.has(id)?variant:fullGraph;
  const nodeMap=graph===variant?new Map([...fullMap,...variantMap]):fullMap,node=nodeMap.get(id);
  host.replaceChildren();host.dataset.semanticDetailId=node?.id||'';
  if(!node){host.append(text('p','Select a node to read its source and connections.'));return;}
  host.append(text('h3',node.id+' · '+semanticType(node.semantic_type||node.kind).label+' · '+node.title));
  if(node.member_ids?.length>1){const members=text('div','Constituent nodes: ','semantic-composition');for(const member of node.member_ids){members.append(semanticNodeLink(member,fullMap,onSelect,{'data-member-id':member}),document.createTextNode(' '));}host.append(members);}
  const units=node.source_units||[];
  if(units.length){host.append(text('h4','Original source'));units.forEach((unit,index)=>{const pre=text('pre',semanticUnitRaw(unit),'semantic-source-raw');pre.dataset.sourceUnitIndex=index;host.append(pre);});}
  else{const declarations=Array.isArray(node.declaration_text)?node.declaration_text:node.declaration_text?[node.declaration_text]:[];if(declarations.length){host.append(text('h4','Premise'));for(const item of declarations)host.append(text('pre',typeof item==='string'?item:item.raw_tex||item.text||'','semantic-premise-text'));}}
  host.append(text('h4','Supported by'));
  const supporters=[...new Set((graph.edges||[]).filter(edge=>edge.target_id===id).map(edge=>edge.source_id))];
  if(!supporters.length)host.append(text('p','None','semantic-empty'));
  else{const list=text('ul','', 'semantic-relations semantic-dependencies');for(const supporter of supporters){const li=text('li');li.append(semanticNodeLink(supporter,nodeMap,onSelect,{'data-supporter-id':supporter}));list.append(li);}host.append(list);}
  host.append(text('h4','Supports'));
  const targets=[...new Set((graph.edges||[]).filter(edge=>edge.source_id===id).map(edge=>edge.target_id))];
  if(!targets.length)host.append(text('p','None','semantic-empty'));
  else{const list=text('ul','', 'semantic-relations semantic-supported');for(const target of targets){const li=text('li');li.append(semanticNodeLink(target,nodeMap,onSelect,{'data-target-id':target},'semantic-node-link semantic-supported-node'));list.append(li);}host.append(list);}
}
function appendSemanticNodeList(host,record){
  const graph=record.semantic_graph;if(!graph){host.append(text('p','No nodes available.'));return;}
  const state=semanticState(record),section=text('section','', 'semantic-node-list'),count=text('p',graph.nodes.length+' nodes','semantic-count');
  const browser=text('div','', 'semantic-node-browser'),inventory=text('div','', 'semantic-inventory'),detail=text('section','', 'semantic-detail');detail.setAttribute('aria-live','polite');
  section.append(count,browser);browser.append(inventory,detail);host.append(section);
  function select(id){state.selected=id;renderSemanticNodeDetail(detail,record,id,select);for(const card of inventory.querySelectorAll('[data-semantic-card-id]'))card.classList.toggle('selected',card.dataset.semanticCardId===id);}
  for(const node of graph.nodes){const type=semanticType(node.semantic_type||node.kind),card=text('button','', 'semantic-card');card.type='button';card.dataset.semanticCardId=node.id;card.style.setProperty('--type-fill',type.fill);card.style.setProperty('--type-stroke',type.stroke);card.append(text('small',node.id+' · '+type.label),text('strong',node.title));card.onclick=()=>select(node.id);inventory.append(card);}
  select(state.selected||graph.main_result_id||graph.nodes[0]?.id);
}
function appendSemanticGraphView(host,record){
  const graph=record.semantic_graph;if(!graph){host.append(text('p','No graph available.'));return;}
  const state=semanticState(record),controls=text('div','', 'semantic-controls'),mode=text('select');mode.setAttribute('aria-label','Graph view');
  if(!graph.overview)state.mode='full';
  for(const[value,label]of(graph.overview?[['overview','Overview'],['full','Full graph']]:[['full','Full graph']])){const option=text('option',label);option.value=value;option.selected=state.mode===value;mode.append(option);}
  const normal=text('button','Readable size'),fit=text('button','Fit to view'),zin=text('button','＋'),zout=text('button','−'),focus=text('button','Focus support chain'),all=text('button','Show all');
  for(const button of [normal,fit,zin,zout,focus,all])button.type='button';zin.setAttribute('aria-label','Zoom in');zout.setAttribute('aria-label','Zoom out');focus.className='semantic-focus-button';controls.append(mode,normal,fit,zin,zout,focus,all);
  const legend=text('div','', 'semantic-type-legend'),stats=text('div','', 'semantic-count'),focusStatus=text('div','', 'semantic-focus-status'),stage=text('div','', 'semantic-stage'),detail=text('section','', 'semantic-detail');detail.setAttribute('aria-live','polite');
  host.append(text('p','Supporting node → supported node','semantic-direction'),controls,legend,stats,focusStatus,stage,detail);
  let nodes=[],edges=[],layout,svg,view,currentMainId,currentVariant;
  function setView(){svg?.setAttribute('viewBox',[view.x,view.y,view.w,view.h].join(' '));}
  function fitView(){svg.style.width='100%';svg.style.height=stage.clientHeight+'px';stage.scrollTop=0;stage.scrollLeft=0;const ratio=Math.max(1,stage.clientWidth)/Math.max(1,stage.clientHeight);let w=layout.width+24,h=layout.height+24;if(w/h>ratio)h=w/ratio;else w=h*ratio;view={x:-(w-layout.width)/2,y:-(h-layout.height)/2,w,h};setView();}
  function readableView(){const pixelW=Math.max(stage.clientWidth,Math.min(layout.width+24,1000)),w=Math.max(layout.width+24,pixelW),h=layout.height+24;svg.style.width=pixelW+'px';svg.style.height=h+'px';view={x:-(w-layout.width)/2,y:-12,w,h};stage.scrollTop=0;stage.scrollLeft=0;setView();}
  function zoom(factor){if(!view)return;const rx=Math.min(1,(stage.scrollLeft+stage.clientWidth/2)/Math.max(1,svg.clientWidth)),ry=Math.min(1,(stage.scrollTop+stage.clientHeight/2)/Math.max(1,svg.clientHeight)),cx=view.x+view.w*rx,cy=view.y+view.h*ry,w=Math.max(160,Math.min(20000,view.w*factor)),h=view.h*w/view.w;view={x:cx-w*rx,y:cy-h*ry,w,h};setView();}
  function applyFocus(){
    if(!svg)return;
    const ids=new Set(nodes.map(node=>node.id)),selected=ids.has(state.selected)?state.selected:state.mode==='overview'?graph.overview?.collapse_map?.[state.selected]:null,root=selected||(ids.has(currentMainId)?currentMainId:nodes[0]?.id),ancestors=new Set(root?[root]:[]),pending=root?[root]:[],incoming=new Map(nodes.map(node=>[node.id,[]]));
    for(const edge of edges)incoming.get(edge.target_id)?.push(edge.source_id);
    for(let i=0;i<pending.length;i++)for(const id of incoming.get(pending[i])||[])if(!ancestors.has(id)){ancestors.add(id);pending.push(id);}
    for(const node of svg.querySelectorAll('[data-semantic-node-id]')){const active=!state.focus||ancestors.has(node.dataset.semanticNodeId);node.style.opacity=active?'1':'.2';node.dataset.focusState=active?'highlight':'dimmed';}
    for(const path of svg.querySelectorAll('path[data-edge-kind="supports"]')){const active=!state.focus||ancestors.has(path.dataset.sourceId)&&ancestors.has(path.dataset.targetId);path.style.opacity=active?'.85':'.08';path.dataset.focusState=active?'highlight':'dimmed';}
    focus.setAttribute('aria-pressed',String(!!state.focus));focus.classList.toggle('active',!!state.focus);focusStatus.textContent=state.focus?'Focused on '+root+' · '+ancestors.size+' / '+nodes.length+' nodes':'';svg.dataset.focusRoot=state.focus?root||'':'';svg.dataset.focusEnabled=String(!!state.focus);
  }
  function selectNode(id,scroll=false){state.selected=id;renderSemanticNodeDetail(detail,record,id,selectNode,currentVariant);if(svg)for(const element of svg.querySelectorAll('[data-semantic-node-id]'))element.querySelector('rect').setAttribute('stroke-width',element.dataset.semanticNodeId===id?'3':'1.5');applyFocus();if(scroll&&!state.focus)detail.scrollIntoView({behavior:'smooth',block:'start'});}
  normal.onclick=readableView;fit.onclick=fitView;zin.onclick=()=>zoom(.8);zout.onclick=()=>zoom(1.25);focus.onclick=()=>{state.focus=!state.focus;if(!state.selected)state.selected=currentMainId;selectNode(state.selected);};all.onclick=()=>{state.focus=false;applyFocus();};
  function draw(){
    const variant=state.mode==='overview'?(graph.overview||graph):graph;currentVariant=variant;nodes=variant.nodes||[];const ids=new Set(nodes.map(node=>node.id));edges=[...new Map((variant.edges||[]).filter(edge=>ids.has(edge.source_id)&&ids.has(edge.target_id)).map(edge=>[edge.source_id+'|'+edge.target_id,edge])).values()];stage.replaceChildren();legend.replaceChildren();
    if(!nodes.length){stage.append(text('p','No nodes available.'));return;}
    for(const key of new Set(nodes.map(node=>node.semantic_type||node.kind))){const type=semanticType(key),pill=text('span',type.label,'semantic-type-pill');pill.style.setProperty('--type-fill',type.fill);pill.style.setProperty('--type-stroke',type.stroke);legend.append(pill);}
    currentMainId=graph.main_result_id||nodes[0].id;layout=semanticGraphLayout(nodes,edges,currentMainId);stats.textContent=nodes.length+' nodes · '+edges.length+' support links';
    svg=semanticElement('svg',{role:'img','aria-label':'Dependency graph: supporting nodes point to supported nodes','data-direction-convention':'supporter_to_supported'});
    const defs=semanticElement('defs'),marker=semanticElement('marker',{id:'semantic-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto'});marker.append(semanticElement('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#147daf'}));defs.append(marker);svg.append(defs);
    for(const edge of edges){
      const a=layout.pos.get(edge.source_id),b=layout.pos.get(edge.target_id);if(!a||!b)continue;
      const forward=b.y>a.y,sx=a.x+a.w/2,tx=b.x+b.w/2,sy=forward?a.y+a.h:a.y,ty=forward?b.y:b.y+b.h,mid=(sy+ty)/2;
      let d=a.y===b.y?`M ${sx} ${a.y+a.h} C ${sx} ${a.y+a.h+25}, ${tx} ${b.y+b.h+25}, ${tx} ${b.y+b.h}`:`M ${sx} ${sy} C ${sx} ${mid}, ${tx} ${mid}, ${tx} ${ty}`;
      if(edge.source_id===edge.target_id){const x=a.x+a.w,y=a.y+a.h/2;d=`M ${x} ${y-13} C ${x+48} ${y-48}, ${x+48} ${y+48}, ${x} ${y+13}`;}
      const path=semanticElement('path',{d,fill:'none',stroke:'#147daf','stroke-width':1.8,'marker-end':'url(#semantic-arrow)','data-source-id':edge.source_id,'data-target-id':edge.target_id,'data-edge-kind':'supports'});path.append(semanticElement('title',{},edge.source_id+' → '+edge.target_id));svg.append(path);
    }
    for(const node of nodes){
      const p=layout.pos.get(node.id),type=semanticType(node.semantic_type||node.kind),element=semanticElement('g',{'class':'semantic-node','data-semantic-node-id':node.id,tabindex:0,role:'button','aria-label':node.id+' '+type.label+' '+node.title});element.append(semanticElement('rect',{x:p.x,y:p.y,width:p.w,height:p.h,rx:8,fill:type.fill,stroke:type.stroke,'stroke-width':state.selected===node.id?3:1.5}));element.append(semanticElement('text',{x:p.x+10,y:p.y+17,fill:'#496575','font-size':10},node.id+' · '+type.label));
      semanticLines(node.title||node.id).forEach((line,index)=>element.append(semanticElement('text',{x:p.x+10,y:p.y+37+index*16,fill:'#1d3e4c','font-size':13,'font-weight':600},line)));
      element.onclick=()=>{if(!svg.dataset.wasDragged)selectNode(node.id,true);};element.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectNode(node.id,true);}};svg.append(element);
    }
    let drag=null;
    svg.onpointerdown=event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY,view:{...view},moved:false,nodeId:event.target.closest('[data-semantic-node-id]')?.dataset.semanticNodeId};svg.dataset.wasDragged='';svg.setPointerCapture(event.pointerId);};
    svg.onpointermove=event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5){drag.moved=true;svg.dataset.wasDragged='1';}view={...drag.view,x:drag.view.x-dx*drag.view.w/Math.max(1,svg.clientWidth),y:drag.view.y-dy*drag.view.h/Math.max(1,svg.clientHeight)};setView();};
    svg.onpointerup=event=>{if(!drag)return;const clicked=!drag.moved&&drag.nodeId;svg.releasePointerCapture(event.pointerId);drag=null;if(clicked)selectNode(clicked,true);setTimeout(()=>{if(svg)svg.dataset.wasDragged='';},0);};svg.onpointercancel=()=>{drag=null;};svg.addEventListener('wheel',event=>{if(event.ctrlKey){event.preventDefault();zoom(event.deltaY>0?1.12:.89);}},{passive:false});
    stage.append(svg);readableView();selectNode(state.selected);
  }
  mode.onchange=()=>{state.mode=mode.value;draw();};draw();
}
