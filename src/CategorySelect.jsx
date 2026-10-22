import React,{useState} from 'react';
const NEW='__mesa_new_category__';
export function CategorySelect({categories,value,defaultValue='',onChange,name,label='Categoría',disabled=false,required=false}){
 const [internal,setInternal]=useState(defaultValue),[creating,setCreating]=useState(false);
 const current=value===undefined?internal:value;
 const options=[...new Set([...categories.map(c=>c.name),...(current?[current]:[])])];
 function update(next){if(value===undefined)setInternal(next);onChange?.(next)}
 return <label>{label}<select disabled={disabled} required={required} value={creating?NEW:current} onChange={e=>{if(e.target.value===NEW){setCreating(true);update('')}else{setCreating(false);update(e.target.value)}}}><option value="">Selecciona una categoría</option>{options.map(category=><option key={category} value={category}>{category}</option>)}<option value={NEW}>+ Nueva categoría</option></select>{creating&&<input aria-label="Nombre de la nueva categoría" autoFocus disabled={disabled} required={required} maxLength="40" value={current} onChange={e=>update(e.target.value)} placeholder="Ej. Chifa, Helados, Menú"/>}{name&&<input type="hidden" name={name} value={current}/>}</label>;
}
