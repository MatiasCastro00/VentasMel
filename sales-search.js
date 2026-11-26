// Column keys are shared by the compact list, the full table and the sort controls.
const salesColumns = [
  {key:'seller', label:'Vendedor', compact:true, value:(row,seller)=>seller?.name},
  {key:'provider', label:'Prepaga', compact:true, value:row=>row.sheet},
  {key:'date', label:'Alta', compact:true, descending:true, value:row=>dateISO(row.values[0]), display:row=>row.date},
  {key:'client', label:'Cliente', compact:true, value:row=>row.values[1]},
  {key:'dni', label:'DNI', value:row=>row.values[8]},
  {key:'phone', label:'Teléfono', value:row=>row.values[12]},
  {key:'people', label:'Cápitas', numeric:true, value:row=>row.values[2]},
  {key:'income', label:'Ingreso', value:row=>row.values[3]},
  {key:'plan', label:'Plan', value:row=>row.values[4]},
  {key:'price', label:'Valor del plan', numeric:true, money:true, value:row=>row.values[5]},
  {key:'discount', label:'Bonificaciones', numeric:true, money:true, value:row=>row.values[10]},
  {key:'gain', label:'Ganancia', compact:true, numeric:true, money:true, value:row=>saleGain(row),
    display:row=>realDisplay(row,row.values[7]!=='' && row.values[7]!=null ? row.values[7] : row.values[6])},
  {key:'multiplier', label:'Multiplicador', numeric:true, value:row=>row.values[11]},
  {key:'payment', label:'Pago', compact:true, value:row=>salePaid(row)?'Pagada':'Pendiente'}
];
const salesCollator = new Intl.Collator('es-AR',{numeric:true,sensitivity:'base'});
let searchOrder = '';
let searchDescending = false;

function comparableValue(column,row,seller) {
  const value=column.value(row,seller);
  if(value==null || value==='')return null;
  if(column.numeric)return typeof value==='number' ? value : existingAmount(value);
  if(column.key==='dni' || column.key==='phone')return String(value).replace(/\D/g,'') || null;
  return String(value);
}

async function copyPhone(phone) {
  try {
    await navigator.clipboard.writeText(phone);
    toast('Teléfono copiado.');
  } catch {
    window.prompt('Copiá este número de teléfono:',phone);
  }
}

function salesButton(label,className,handler) {
  const button=document.createElement('button');
  button.type='button';
  button.className=className;
  button.textContent=label;
  button.addEventListener('click',handler);
  return button;
}

function changeSalesOrder(key) {
  const column=salesColumns.find(item=>item.key===key);
  searchDescending=key===searchOrder ? !searchDescending : !!(column?.numeric || column?.descending);
  searchOrder=key;
  renderResults();
}

function fillSalesValue(cell,column,row,seller) {
  const value=column.value(row,seller);
  if(column.key==='phone' && value){
    const button=salesButton(String(value),'copy-phone',()=>copyPhone(String(value)));
    button.setAttribute('aria-label','Copiar teléfono '+value);
    cell.append(button);
  } else if(column.display)cell.textContent=column.display(row);
  else if(column.money)cell.textContent=displayMoney(value);
  else if(value==null || value==='')cell.textContent='—';
  else cell.textContent=column.key==='multiplier' ? value+'%' : String(value);
}

function renderSaleRecord(body,row,seller,columns,index) {
  const summary=document.createElement('tr');
  const detail=document.createElement('tr');
  detail.id='sale-record-'+index;
  detail.className='sale-record-detail hidden';
  const paid=salePaid(row);
  summary.classList.toggle('paid-sale',paid);
  const act=callback=>{
    if(state.busy || (isLeaderBook() && !activateSeller(seller.id)))return;
    callback();
  };
  let detailButton;
  function toggleRecord() {
    const open=detail.classList.toggle('hidden')===false;
    if(open)buildDetail();
    detailButton.setAttribute('aria-expanded',String(open));
  }
  for(const column of columns){
    const cell=document.createElement('td');
    cell.dataset.label=column.label;
    if(column.key==='client'){
      detailButton=salesButton(row.values[1],'record-toggle',toggleRecord);
      detailButton.setAttribute('aria-expanded','false');
      detailButton.setAttribute('aria-controls',detail.id);
      cell.append(detailButton);
    } else if(column.key==='payment'){
      const button=salesButton(paid?'Pagada':'Marcar pagada','payment-button'+(paid?' is-paid':''),()=>act(()=>setSalePaid(row,!paid)));
      button.setAttribute('aria-label',(paid?'Marcar pendiente':'Marcar pagada')+' · '+row.values[1]);
      cell.append(button);
    } else fillSalesValue(cell,column,row,seller);
    summary.append(cell);
  }
  summary.addEventListener('click',event=>{if(!event.target.closest('button,a') && !window.getSelection()?.toString())toggleRecord();});
  // Build the secondary fields on first opening, including for large books.
  function buildDetail(){
    if(detail.firstChild)return;
    const cell=document.createElement('td');
    cell.colSpan=columns.length;
    const info=document.createElement('dl');
    info.className='sale-facts';
    for(const column of salesColumns.filter(item=>!item.compact)){
      const group=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');
      term.textContent=column.label;
      fillSalesValue(value,column,row,seller);
      group.append(term,value);info.append(group);
    }
    const actions=document.createElement('div');
    actions.className='record-actions';
    actions.append(salesButton('Editar venta','button outline',()=>act(()=>editSale(row))),
      salesButton('Eliminar venta','button outline delete-record',()=>act(()=>deleteSale(row))));
    cell.append(info,actions);detail.append(cell);
  }
  body.append(summary,detail);
}

function renderResults(){
  const leader=isLeaderBook(), picker=$('search-seller'), prepaga=$('search-sheet');
  $('search-seller-row').classList.toggle('hidden',!leader);
  if(leader)updateSellerSelect(picker,'Todos los vendedores',teamSellers.filter(seller=>seller.book));
  const sellers=leader ? teamSellers.filter(seller=>seller.book && (!picker.value || picker.value===seller.id)) : [{book:state}];
  const previous=prepaga.value;
  const names=[...new Set(sellers.flatMap(seller=>seller.book.sheets.map(sheet=>sheet.title)))];
  prepaga.replaceChildren(new Option('Todas las prepagas',''),...names.map(name=>new Option(name,name)));
  if(names.includes(previous))prepaga.value=previous;
  const available=salesColumns.filter(column=>leader || column.key!=='seller');
  if(searchOrder && !available.some(column=>column.key===searchOrder)){searchOrder='';searchDescending=false;}
  const sortColumn=available.find(column=>column.key===searchOrder);
  const columns=$('sales-all-columns').checked ? available : available.filter(column=>column.compact);
  const select=$('sales-order');
  if(select.options.length!==available.length+1)select.replaceChildren(new Option('Orden de la planilla',''),...available.map(column=>new Option(column.label,column.key)));
  select.value=searchOrder;
  $('sales-direction').textContent=searchDescending?'Descendente ↓':'Ascendente ↑';
  $('sales-direction').disabled=!sortColumn;
  const headings=$('sales-headings');
  const focusedKey=headings.contains(document.activeElement)?document.activeElement.dataset.key:null;
  headings.replaceChildren();
  for(const column of columns){
    const th=document.createElement('th'),active=column===sortColumn;
    const button=salesButton(column.label+(active?(searchDescending?' ↓':' ↑'):''),'sort-column',()=>changeSalesOrder(column.key));
    button.dataset.key=column.key;
    th.scope='col';
    if(active)th.setAttribute('aria-sort',searchDescending?'descending':'ascending');
    th.append(button);headings.append(th);
    if(focusedKey===column.key)button.focus({preventScroll:true});
  }
  const filters=searchFilters(),payment=$('search-payment').value;
  $('sales-show-paid').checked=payment!=='pending';
  const activeFilters=[filters.sheet,filters.plan,filters.ingreso,filters.altaFrom,filters.altaTo,
    leader && picker.value, payment].filter(Boolean).length;
  $('search-filter-summary').textContent='Filtros'+(activeFilters?' ('+activeFilters+')':'')+
    (payment==='paid'?' · Pagadas':payment==='pending'?' · Pendientes':'');
  const results=sellers.flatMap(seller=>seller.book.sales.filter(row=>
    matchesSearch(row,filters) && (!payment || salePaid(row)===(payment==='paid'))
  ).map(row=>({row,seller,key:sortColumn ? comparableValue(sortColumn,row,seller) : null})));
  if(sortColumn)results.sort((a,b)=>{
    if(a.key===null || b.key===null)return Number(a.key===null)-Number(b.key===null);
    const diff=sortColumn.numeric ? a.key-b.key : salesCollator.compare(a.key,b.key);
    return searchDescending ? -diff : diff;
  });
  $('result-count').textContent=results.length+(results.length===1?' venta':' ventas');
  const body=$('results-body');body.replaceChildren();
  const fragment=document.createDocumentFragment();
  results.forEach(({row,seller},index)=>renderSaleRecord(fragment,row,seller,columns,index));
  body.append(fragment);
  $('empty-results').classList.toggle('hidden',results.length>0);
}
