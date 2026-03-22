import { useState, useEffect, useCallback, useMemo } from "react";

const DEFAULT_PLATFORMS = [
  { name: "DoorDash", type: "driving" },
  { name: "Uber Eats", type: "driving" },
  { name: "Grubhub", type: "driving" },
  { name: "Instacart", type: "driving" },
];
const IRS_RATE_2025 = 0.70;
const EXPENSE_CATEGORIES = ["Gas & Fuel","Car Maintenance","Car Insurance","Phone & Data","Supplies & Equipment","Parking & Tolls","Food (while working)","Other"];
const PLATFORM_COLORS = {"DoorDash":"#FF3008","Uber Eats":"#06C167","Grubhub":"#F63440","Instacart":"#43B02A","default":"#8B5CF6"};
const SK = {mileage:"gig-mi-v2",shifts:"gig-sh-v2",expenses:"gig-ex-v2",earnings:"gig-er-v2",platforms:"gig-pl-v2",settings:"gig-st-v2"};
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const fmt = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
const fmtN = n => new Intl.NumberFormat("en-US",{minimumFractionDigits:1,maximumFractionDigits:1}).format(n);
const toL = d => new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
const td = () => new Date().toISOString().slice(0,10);
const gc = p => PLATFORM_COLORS[p]||PLATFORM_COLORS.default;
const weekR = () => { const d=new Date(),day=d.getDay(),s=new Date(d); s.setDate(d.getDate()-day); const e=new Date(s); e.setDate(s.getDate()+6); return{start:s.toISOString().slice(0,10),end:e.toISOString().slice(0,10)}; };
const monthR = () => { const d=new Date(); return{start:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`,end:d.toISOString().slice(0,10)}; };
const yearR = () => { const y=new Date().getFullYear(); return{start:`${y}-01-01`,end:`${y}-12-31`}; };
const inR = (date,r) => date>=r.start && date<=r.end;
const calcDur = (s,e) => { const d=new Date(e).getTime()-new Date(s).getTime(); if(d<=0)return{label:"0h 0m",dec:0}; const h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000); return{label:`${h}h ${m}m`,dec:+(d/3600000).toFixed(2)}; };
const liveClock = s => { const d=Date.now()-new Date(s).getTime(),h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000),sec=Math.floor((d%60000)/1000); return`${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; };

// ── FIX #1: Rewritten useStore — localStorage instead of window.storage ──
function useStore(key, fallback) {
  const [data, setData] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored);
    } catch {}
    return fallback;
  });

  const save = useCallback((next) => {
    setData((prev) => {
      const val = typeof next === "function" ? next(prev) : next;
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {
        console.error("Storage save failed:", e);
      }
      return val;
    });
  }, [key]);

  return [data, save];
}

const I={
  road:(s=20)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:s,height:s}}><path d="M4 19L8 5"/><path d="M16 5l4 14"/><line x1="12" y1="6" x2="12" y2="6.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>,
  clock:(s=20)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:s,height:s}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  dollar:(s=20)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:s,height:s}}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  chart:(s=20)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:s,height:s}}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  trend:(s=20)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:s,height:s}}><polyline points="22 12 18 8 14 12"/><polyline points="2 20 8 14 12 18 18 8"/></svg>,
  gear:(s=20)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:s,height:s}}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  plus:(s=20)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{width:s,height:s}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:(s=16)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:s,height:s}}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  dl:(s=18)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:s,height:s}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  play:(s=18)=><svg viewBox="0 0 24 24" fill="currentColor" style={{width:s,height:s}}><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  x:(s=16)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{width:s,height:s}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  edit:(s=16)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:s,height:s}}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
};
const mono={fontFamily:"'JetBrains Mono','SF Mono',monospace"};
const S={
  app:{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:"#0C0F14",color:"#E8E6E1",minHeight:"100vh",maxWidth:520,margin:"0 auto",position:"relative",paddingBottom:80},
  header:{padding:"20px 20px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  title:{fontSize:22,fontWeight:700,letterSpacing:"-0.5px",color:"#F59E0B"},
  sub:{fontSize:12,color:"#6B7280",fontWeight:500,letterSpacing:"0.5px",textTransform:"uppercase",marginTop:2},
  nav:{position:"fixed",bottom:0,left:0,right:0,background:"#141820",borderTop:"1px solid #1E2430",display:"flex",justifyContent:"center",zIndex:100},
  navIn:{display:"flex",maxWidth:520,width:"100%",justifyContent:"space-around"},
  navBtn:a=>({display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 6px",background:"none",border:"none",color:a?"#F59E0B":"#6B7280",cursor:"pointer",fontSize:9,fontWeight:600,letterSpacing:"0.3px",textTransform:"uppercase"}),
  card:{background:"#141820",borderRadius:14,padding:"16px 18px",marginBottom:12},
  ct:{fontSize:13,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.8px"},
  sr:{display:"flex",gap:10,marginBottom:12},
  stat:{flex:1,background:"#1A1F2B",borderRadius:10,padding:"12px 14px"},
  sl:{fontSize:10,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4},
  sv:{fontSize:22,fontWeight:700,...mono,color:"#F1F0EC"},
  ss:{fontSize:11,color:"#6B7280",marginTop:2},
  inp:{width:"100%",background:"#1A1F2B",border:"1px solid #2A3040",borderRadius:10,padding:"12px 14px",color:"#E8E6E1",fontSize:15,fontFamily:"inherit",outline:"none",boxSizing:"border-box"},
  lbl:{fontSize:12,fontWeight:600,color:"#9CA3AF",marginBottom:6,display:"block",letterSpacing:"0.3px"},
  bp:{background:"#F59E0B",color:"#0C0F14",border:"none",borderRadius:10,padding:"14px 24px",fontSize:15,fontWeight:700,cursor:"pointer",width:"100%",fontFamily:"inherit"},
  bs:{background:"#1A1F2B",color:"#E8E6E1",border:"1px solid #2A3040",borderRadius:10,padding:"12px 20px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  bd:{background:"transparent",color:"#EF4444",border:"none",cursor:"pointer",padding:6,display:"flex",alignItems:"center"},
  tag:c=>({display:"inline-block",background:c+"22",color:c,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:6,letterSpacing:"0.3px"}),
  sec:{padding:"0 20px"},
  li:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid #1E2430"},
  empty:{textAlign:"center",padding:"40px 20px",color:"#4B5563",fontSize:14},
  chip:a=>({padding:"8px 16px",borderRadius:20,border:"none",background:a?"#F59E0B":"#1A1F2B",color:a?"#0C0F14":"#9CA3AF",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}),
  modal:{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"},
  mb:{background:"#141820",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,maxHeight:"90vh",overflow:"auto",padding:"24px 20px 40px"},
  mt:{fontSize:18,fontWeight:700,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"},
  timer:{fontSize:42,fontWeight:700,...mono,textAlign:"center",color:"#F59E0B",padding:"20px 0"},
  pr:{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16},
  r2:{display:"flex",gap:10},
  barBg:{height:8,background:"#1A1F2B",borderRadius:4,overflow:"hidden",marginTop:4},
  barF:(p,c)=>({height:"100%",width:`${Math.min(p,100)}%`,background:c,borderRadius:4,transition:"width 0.4s ease"}),
};
const Fonts=()=><style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{background:#0C0F14}input:focus,select:focus,textarea:focus{border-color:#F59E0B!important}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2A3040;border-radius:4px}select option{background:#1A1F2B;color:#E8E6E1}`}</style>;

function Modal({open,onClose,title,children}){if(!open)return null;return(<div style={S.modal} onClick={onClose}><div style={S.mb} onClick={e=>e.stopPropagation()}><div style={S.mt}>{title}<button style={{...S.bd,color:"#9CA3AF"}} onClick={onClose}>{I.x()}</button></div>{children}</div></div>);}
function PP({platforms,value,onChange,allowAll}){return(<div style={S.pr}>{allowAll&&<button style={S.chip(!value)} onClick={()=>onChange("")}>All</button>}{platforms.map(p=>{const n=typeof p==="string"?p:p.name;return<button key={n} style={S.chip(value===n)} onClick={()=>onChange(n)}>{n}</button>;})}</div>);}
function SB({label,value,sub,color}){return(<div style={S.stat}><div style={S.sl}>{label}</div><div style={{...S.sv,color:color||"#F1F0EC"}}>{value}</div>{sub&&<div style={S.ss}>{sub}</div>}</div>);}

// ── FORMS ──
function MileageForm({platforms,onSubmit}){
  const dp=platforms.filter(p=>p.type==="driving");
  const[mi,setMi]=useState("");const[pl,setPl]=useState(dp[0]?.name||"");const[dt,setDt]=useState(td());const[note,setNote]=useState("");const[rt,setRt]=useState(false);
  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><label style={S.lbl}>Miles Driven</label><input type="number" step="0.1" inputMode="decimal" placeholder="0.0" value={mi} onChange={e=>setMi(e.target.value)} style={{...S.inp,fontSize:24,fontWeight:700,...mono}} autoFocus/><div style={{marginTop:8}}><button style={{...S.chip(rt),fontSize:12}} onClick={()=>setRt(!rt)}>{rt?"✓ ":""}Round Trip</button></div></div>
    <div><label style={S.lbl}>Platform</label><PP platforms={dp} value={pl} onChange={setPl}/></div>
    <div><label style={S.lbl}>Date</label><input type="date" value={dt} onChange={e=>setDt(e.target.value)} style={S.inp}/></div>
    <div><label style={S.lbl}>Notes</label><input type="text" placeholder="e.g. Deliveries in Lincoln Park" value={note} onChange={e=>setNote(e.target.value)} style={S.inp}/></div>
    <button style={S.bp} onClick={()=>{const m=parseFloat(mi);if(m>0)onSubmit({miles:rt?m*2:m,platform:pl,date:dt,purpose:note,roundTrip:rt});}}>Log Mileage</button>
  </div>);
}
function ManualShiftForm({platforms,onSubmit}){
  const[pl,setPl]=useState(platforms[0]?.name||"");const[dt,setDt]=useState(td());const[st,setSt]=useState("09:00");const[et,setEt]=useState("13:00");
  const[earn,setEarn]=useState("");const[tips,setTips]=useState("");const[mi,setMi]=useState("");const[note,setNote]=useState("");
  const isDrv=platforms.find(p=>p.name===pl)?.type==="driving";
  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><label style={S.lbl}>Platform</label><PP platforms={platforms} value={pl} onChange={setPl}/></div>
    <div><label style={S.lbl}>Date</label><input type="date" value={dt} onChange={e=>setDt(e.target.value)} style={S.inp}/></div>
    <div style={S.r2}><div style={{flex:1}}><label style={S.lbl}>Start</label><input type="time" value={st} onChange={e=>setSt(e.target.value)} style={S.inp}/></div><div style={{flex:1}}><label style={S.lbl}>End</label><input type="time" value={et} onChange={e=>setEt(e.target.value)} style={S.inp}/></div></div>
    <div style={S.r2}><div style={{flex:1}}><label style={S.lbl}>Base Pay</label><input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={earn} onChange={e=>setEarn(e.target.value)} style={S.inp}/></div><div style={{flex:1}}><label style={S.lbl}>Tips</label><input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={tips} onChange={e=>setTips(e.target.value)} style={S.inp}/></div></div>
    {isDrv&&<div><label style={S.lbl}>Miles (optional)</label><input type="number" step="0.1" inputMode="decimal" placeholder="0.0" value={mi} onChange={e=>setMi(e.target.value)} style={S.inp}/></div>}
    <div><label style={S.lbl}>Notes</label><input type="text" placeholder="e.g. Lunch rush downtown" value={note} onChange={e=>setNote(e.target.value)} style={S.inp}/></div>
    <button style={S.bp} onClick={()=>{const e=parseFloat(earn)||0,t=parseFloat(tips)||0;if(e>0||t>0)onSubmit({platform:pl,date:dt,startTime:`${dt}T${st}:00`,endTime:`${dt}T${et}:00`,earnings:e,tips:t,miles:isDrv?parseFloat(mi)||0:0,note,active:false});}}>Log Past Shift</button>
  </div>);
}
function EndShiftForm({activeShift,onEnd}){
  const[earn,setEarn]=useState("");const[tips,setTips]=useState("");const[mi,setMi]=useState("");const[,tick]=useState(0);
  const isDrv=activeShift?._type==="driving";
  useEffect(()=>{const iv=setInterval(()=>tick(t=>t+1),1000);return()=>clearInterval(iv);},[]);
  if(!activeShift)return null;
  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{textAlign:"center"}}><span style={S.tag(gc(activeShift.platform))}>{activeShift.platform}</span><div style={S.timer}>{liveClock(activeShift.startTime)}</div></div>
    <div style={S.r2}><div style={{flex:1}}><label style={S.lbl}>Base Pay</label><input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={earn} onChange={e=>setEarn(e.target.value)} style={{...S.inp,fontSize:20,fontWeight:700,...mono}} autoFocus/></div><div style={{flex:1}}><label style={S.lbl}>Tips</label><input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={tips} onChange={e=>setTips(e.target.value)} style={{...S.inp,fontSize:20,fontWeight:700,...mono}}/></div></div>
    {isDrv&&<div><label style={S.lbl}>Miles</label><input type="number" step="0.1" inputMode="decimal" placeholder="0.0" value={mi} onChange={e=>setMi(e.target.value)} style={S.inp}/></div>}
    <button style={{...S.bp,background:"#EF4444",color:"#fff"}} onClick={()=>onEnd(earn,tips,mi)}>End Shift</button>
  </div>);
}
function EarningForm({platforms,onSubmit}){
  const[amt,setAmt]=useState("");const[pl,setPl]=useState(platforms[0]?.name||"");const[dt,setDt]=useState(td());const[note,setNote]=useState("");
  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><label style={S.lbl}>Amount</label><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:"#06C167",fontSize:24,fontWeight:700}}>$</span><input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={amt} onChange={e=>setAmt(e.target.value)} style={{...S.inp,fontSize:24,fontWeight:700,...mono}} autoFocus/></div></div>
    <div><label style={S.lbl}>Platform</label><PP platforms={platforms} value={pl} onChange={setPl}/></div>
    <div><label style={S.lbl}>Date</label><input type="date" value={dt} onChange={e=>setDt(e.target.value)} style={S.inp}/></div>
    <div><label style={S.lbl}>Note</label><input type="text" placeholder="e.g. Weekly payout" value={note} onChange={e=>setNote(e.target.value)} style={S.inp}/></div>
    <button style={S.bp} onClick={()=>{const a=parseFloat(amt);if(a>0)onSubmit({amount:a,platform:pl,date:dt,note});}}>Log Earnings</button>
  </div>);
}
function ExpenseForm({onSubmit}){
  const[amt,setAmt]=useState("");const[cat,setCat]=useState(EXPENSE_CATEGORIES[0]);const[dt,setDt]=useState(td());const[desc,setDesc]=useState("");
  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><label style={S.lbl}>Amount</label><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:"#EF4444",fontSize:24,fontWeight:700}}>$</span><input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={amt} onChange={e=>setAmt(e.target.value)} style={{...S.inp,fontSize:24,fontWeight:700,...mono}} autoFocus/></div></div>
    <div><label style={S.lbl}>Category</label><select value={cat} onChange={e=>setCat(e.target.value)} style={S.inp}>{EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
    <div><label style={S.lbl}>Date</label><input type="date" value={dt} onChange={e=>setDt(e.target.value)} style={S.inp}/></div>
    <div><label style={S.lbl}>Description</label><input type="text" placeholder="e.g. Oil change" value={desc} onChange={e=>setDesc(e.target.value)} style={S.inp}/></div>
    <button style={S.bp} onClick={()=>{const a=parseFloat(amt);if(a>0)onSubmit({amount:a,category:cat,date:dt,description:desc});}}>Log Expense</button>
  </div>);
}
function PlatformForm({onSubmit}){
  const[name,setName]=useState("");const[type,setType]=useState("driving");
  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><label style={S.lbl}>Platform Name</label><input type="text" placeholder="e.g. Amazon Flex, Rover, TaskRabbit" value={name} onChange={e=>setName(e.target.value)} style={S.inp} autoFocus/></div>
    <div><label style={S.lbl}>Type</label><div style={{display:"flex",gap:8}}><button style={S.chip(type==="driving")} onClick={()=>setType("driving")}>🚗 Driving</button><button style={S.chip(type==="non-driving")} onClick={()=>setType("non-driving")}>🏠 Non-Driving</button></div><div style={{fontSize:12,color:"#6B7280",marginTop:6}}>{type==="driving"?"Mileage tracking enabled":"No mileage — tutoring, pet sitting, freelance, etc."}</div></div>
    <button style={S.bp} onClick={()=>{if(name.trim())onSubmit(name.trim(),type);}}>Add Platform</button>
  </div>);
}

// ── TAB COMPONENTS ──
function ActiveBanner({shift,onEnd}){
  const[,t]=useState(0);useEffect(()=>{const iv=setInterval(()=>t(x=>x+1),1000);return()=>clearInterval(iv);},[]);
  return(<div style={{...S.card,background:"linear-gradient(135deg,#1A1F2B,#1A2420)",border:"1px solid #06C16744",marginBottom:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:11,fontWeight:700,color:"#06C167",textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>● Live</div><span style={S.tag(gc(shift.platform))}>{shift.platform}</span></div><div style={{fontSize:28,fontWeight:700,...mono}}>{liveClock(shift.startTime)}</div></div>
    <button style={{...S.bp,marginTop:14,background:"#EF4444",color:"#fff"}} onClick={onEnd}>End Shift</button>
  </div>);
}

function DashTab({mileage,shifts,earnings,expenses,platforms,settings,activeShift,onAction}){
  const yr=yearR(),wk=weekR();
  const wkMi=mileage.filter(m=>inR(m.date,wk)).reduce((s,m)=>s+m.miles,0)+shifts.filter(sh=>!sh.active&&inR(sh.date,wk)).reduce((s,sh)=>s+(sh.miles||0),0);
  const yrMi=mileage.filter(m=>inR(m.date,yr)).reduce((s,m)=>s+m.miles,0)+shifts.filter(sh=>!sh.active&&inR(sh.date,yr)).reduce((s,sh)=>s+(sh.miles||0),0);
  const miDed=yrMi*settings.irsRate;
  const wkE=earnings.filter(e=>inR(e.date,wk)).reduce((s,e)=>s+e.amount,0)+shifts.filter(sh=>!sh.active&&inR(sh.date,wk)).reduce((s,sh)=>s+(sh.earnings||0)+(sh.tips||0),0);
  const yrE=earnings.filter(e=>inR(e.date,yr)).reduce((s,e)=>s+e.amount,0)+shifts.filter(sh=>!sh.active&&inR(sh.date,yr)).reduce((s,sh)=>s+(sh.earnings||0)+(sh.tips||0),0);
  const yrX=expenses.filter(e=>inR(e.date,yr)).reduce((s,e)=>s+e.amount,0);
  const recent=useMemo(()=>{const items=[];mileage.slice(0,5).forEach(m=>items.push({date:m.date,text:`${fmtN(m.miles)} mi`,plat:m.platform,sub:m.purpose}));earnings.slice(0,5).forEach(e=>items.push({date:e.date,text:fmt(e.amount),plat:e.platform,sub:e.note}));shifts.filter(sh=>!sh.active).slice(0,5).forEach(sh=>{const tot=(sh.earnings||0)+(sh.tips||0);const dur=sh.endTime?calcDur(sh.startTime,sh.endTime).label:"";items.push({date:sh.date,text:`${fmt(tot)} · ${dur}`,plat:sh.platform,sub:sh.note});});return items.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);},[mileage,earnings,shifts]);
  return(<div style={S.sec}>
    {activeShift&&<ActiveBanner shift={activeShift} onEnd={()=>onAction("endShift")}/>}
    <div style={S.sr}><SB label="This Week" value={fmtN(wkMi)} sub="miles" color="#F59E0B"/><SB label="This Week" value={fmt(wkE)} sub="earned" color="#06C167"/></div>
    <div style={S.card}><div style={S.ct}>{settings.taxYear} Tax Year</div><div style={{marginTop:12}}>
      {[["Total Miles",fmtN(yrMi)],["Mileage Deduction",fmt(miDed),"#F59E0B"],["Gross Earnings",fmt(yrE),"#06C167"],["Other Expenses",fmt(yrX),"#EF4444"]].map(([l,v,c],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #1E2430"}}><span style={{color:"#9CA3AF",fontSize:14}}>{l}</span><span style={{fontWeight:700,...mono,color:c||"#F1F0EC"}}>{v}</span></div>)}
      <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0"}}><span style={{fontWeight:700,fontSize:15}}>Total Deductions</span><span style={{fontWeight:700,...mono,color:"#F59E0B",fontSize:18}}>{fmt(miDed+yrX)}</span></div>
    </div></div>
    <div style={{display:"flex",gap:8,marginBottom:12}}>
      <button style={{...S.bs,flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:13}} onClick={()=>onAction("mileage")}>{I.road(16)} Miles</button>
      <button style={{...S.bs,flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:13}} onClick={()=>onAction("manualShift")}>{I.edit(16)} Past Shift</button>
      {!activeShift&&<button style={{...S.bs,flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:13}} onClick={()=>onAction("startShift")}>{I.play(16)} Go Live</button>}
    </div>
    <div style={S.card}><div style={S.ct}>Recent Activity</div>{recent.length===0&&<div style={S.empty}>No activity yet — start logging!</div>}{recent.map((item,i)=><div key={i} style={{...S.li,borderBottom:i<recent.length-1?"1px solid #1E2430":"none"}}><div><div style={{fontSize:14,fontWeight:600}}>{item.text}{" "}<span style={S.tag(gc(item.plat))}>{item.plat}</span></div>{item.sub&&<div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{item.sub}</div>}</div><div style={{fontSize:12,color:"#6B7280"}}>{toL(item.date)}</div></div>)}</div>
  </div>);
}

function MilesTab({mileage,shifts,settings,platforms,onAction,onDelete}){
  const mo=monthR(),yr=yearR();
  const moM=mileage.filter(m=>inR(m.date,mo)).reduce((s,m)=>s+m.miles,0)+shifts.filter(sh=>!sh.active&&inR(sh.date,mo)).reduce((s,sh)=>s+(sh.miles||0),0);
  const yrM=mileage.filter(m=>inR(m.date,yr)).reduce((s,m)=>s+m.miles,0)+shifts.filter(sh=>!sh.active&&inR(sh.date,yr)).reduce((s,sh)=>s+(sh.miles||0),0);
  return(<div style={S.sec}>
    <div style={S.sr}><SB label="This Month" value={fmtN(moM)} sub="miles"/><SB label="YTD Deduction" value={fmt(yrM*settings.irsRate)} sub={`@ $${settings.irsRate}/mi`} color="#F59E0B"/></div>
    <div style={{marginBottom:12}}><button style={{...S.bp,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>onAction("mileage")}>{I.plus()} Log Mileage</button></div>
    <div style={S.card}><div style={S.ct}>Mileage Log</div>{mileage.length===0&&<div style={S.empty}>No mileage logged yet</div>}{mileage.slice(0,50).map((m,i)=><div key={m.id} style={{...S.li,borderBottom:i<mileage.length-1?"1px solid #1E2430":"none"}}><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16,fontWeight:700,...mono}}>{fmtN(m.miles)} mi</span><span style={S.tag(gc(m.platform))}>{m.platform}</span>{m.roundTrip&&<span style={{...S.tag("#6B7280"),fontSize:9}}>RT</span>}</div>{m.purpose&&<div style={{fontSize:12,color:"#6B7280",marginTop:3}}>{m.purpose}</div>}</div><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{textAlign:"right"}}><div style={{fontSize:12,color:"#6B7280"}}>{toL(m.date)}</div><div style={{fontSize:12,color:"#F59E0B",...mono}}>{fmt(m.miles*settings.irsRate)}</div></div><button style={S.bd} onClick={()=>onDelete(m.id)}>{I.trash()}</button></div></div>)}</div>
  </div>);
}

function ShiftsTab({shifts,platforms,activeShift,onAction,onDeleteShift}){
  return(<div style={S.sec}>
    {activeShift?<ActiveBanner shift={activeShift} onEnd={()=>onAction("endShift")}/>:<div style={{marginBottom:12}}><div style={{...S.ct,marginBottom:10}}>Start a Live Shift</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{platforms.map(p=><button key={p.name} style={{...S.bs,display:"flex",alignItems:"center",gap:6,borderColor:gc(p.name)+"44"}} onClick={()=>onAction("startShiftDirect",p.name)}><span style={{width:8,height:8,borderRadius:"50%",background:gc(p.name)}}/>{p.name}</button>)}</div></div>}
    <div style={{marginBottom:12}}><button style={{...S.bs,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>onAction("manualShift")}>{I.edit()} Log a Past Shift</button></div>
    <div style={S.card}><div style={S.ct}>Shift History</div>{shifts.filter(s=>!s.active).length===0&&<div style={S.empty}>No shifts yet</div>}{shifts.filter(s=>!s.active).slice(0,50).map(sh=>{const dur=sh.endTime?calcDur(sh.startTime,sh.endTime):null;const tot=(sh.earnings||0)+(sh.tips||0);const hr=dur&&dur.dec>0?tot/dur.dec:0;return(<div key={sh.id} style={S.li}><div><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><span style={S.tag(gc(sh.platform))}>{sh.platform}</span>{dur&&<span style={{fontSize:13,color:"#9CA3AF"}}>{dur.label}</span>}{hr>0&&<span style={{fontSize:11,color:"#6B7280"}}>{fmt(hr)}/hr</span>}</div><div style={{fontSize:12,color:"#6B7280",marginTop:3}}>{toL(sh.date)}{sh.tips>0&&<span> · Tips: {fmt(sh.tips)}</span>}{sh.miles>0&&<span> · {fmtN(sh.miles)} mi</span>}</div>{sh.note&&<div style={{fontSize:12,color:"#4B5563",marginTop:2}}>{sh.note}</div>}</div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16,fontWeight:700,...mono,color:"#06C167"}}>{fmt(tot)}</span><button style={S.bd} onClick={()=>onDeleteShift(sh.id)}>{I.trash()}</button></div></div>);})}</div>
  </div>);
}

// ── FIX #3: Defensive array checks in MoneyTab ──
function MoneyTab({earnings,expenses,platforms,onAction,onDeleteEarning,onDeleteExpense}){
  const[sub,setSub]=useState("earnings");const[filter,setFilter]=useState("");
  const safeEarnings = Array.isArray(earnings) ? earnings : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  return(<div style={S.sec}>
    <div style={{display:"flex",gap:8,marginBottom:16}}><button style={S.chip(sub==="earnings")} onClick={()=>setSub("earnings")}>Earnings</button><button style={S.chip(sub==="expenses")} onClick={()=>setSub("expenses")}>Expenses</button></div>
    {sub==="earnings"&&<><PP platforms={platforms} value={filter} onChange={setFilter} allowAll/><div style={{marginBottom:12}}><button style={{...S.bp,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>onAction("earning")}>{I.plus()} Log Earnings</button></div><div style={S.card}><div style={S.ct}>Earnings Log</div>{safeEarnings.filter(e=>!filter||e.platform===filter).length===0&&<div style={S.empty}>No earnings logged</div>}{safeEarnings.filter(e=>!filter||e.platform===filter).slice(0,50).map(e=><div key={e.id} style={S.li}><div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16,fontWeight:700,...mono,color:"#06C167"}}>{fmt(e.amount)}</span><span style={S.tag(gc(e.platform))}>{e.platform}</span></div>{e.note&&<div style={{fontSize:12,color:"#6B7280",marginTop:3}}>{e.note}</div>}</div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:12,color:"#6B7280"}}>{toL(e.date)}</span><button style={S.bd} onClick={()=>onDeleteEarning(e.id)}>{I.trash()}</button></div></div>)}</div></>}
    {sub==="expenses"&&<><div style={{marginBottom:12}}><button style={{...S.bp,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>onAction("expense")}>{I.plus()} Log Expense</button></div><div style={S.card}><div style={S.ct}>Expenses</div>{safeExpenses.length===0&&<div style={S.empty}>No expenses logged</div>}{safeExpenses.slice(0,50).map(e=><div key={e.id} style={S.li}><div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16,fontWeight:700,...mono,color:"#EF4444"}}>{fmt(e.amount)}</span><span style={{...S.tag("#6B7280")}}>{e.category}</span></div>{e.description&&<div style={{fontSize:12,color:"#6B7280",marginTop:3}}>{e.description}</div>}</div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:12,color:"#6B7280"}}>{toL(e.date)}</span><button style={S.bd} onClick={()=>onDeleteExpense(e.id)}>{I.trash()}</button></div></div>)}</div></>}
  </div>);
}

function TrendsTab({shifts,mileage,earnings,platforms,settings}){
  const[period,setPeriod]=useState("month");
  const range=period==="week"?weekR():period==="month"?monthR():yearR();
  const pS=useMemo(()=>shifts.filter(s=>!s.active&&inR(s.date,range)),[shifts,period]);
  const pM=useMemo(()=>mileage.filter(m=>inR(m.date,range)),[mileage,period]);
  const pE=useMemo(()=>earnings.filter(e=>inR(e.date,range)),[earnings,period]);
  const platStats=useMemo(()=>{const st={};platforms.forEach(p=>{st[p.name]={name:p.name,type:p.type,shifts:0,hours:0,earnings:0,tips:0,miles:0};});pS.forEach(sh=>{const s=st[sh.platform];if(!s)return;s.shifts++;s.hours+=sh.endTime?calcDur(sh.startTime,sh.endTime).dec:0;s.earnings+=(sh.earnings||0);s.tips+=(sh.tips||0);s.miles+=(sh.miles||0);});pE.forEach(e=>{const s=st[e.platform];if(s)s.earnings+=e.amount;});pM.forEach(m=>{const s=st[m.platform];if(s)s.miles+=m.miles;});return Object.values(st).filter(s=>s.shifts>0||s.earnings>0).sort((a,b)=>(b.earnings+b.tips)-(a.earnings+a.tips));},[pS,pE,pM,platforms]);
  const dayStats=useMemo(()=>{const d=Array.from({length:7},()=>({count:0,earnings:0,hours:0}));pS.forEach(sh=>{const i=new Date(sh.date+"T12:00:00").getDay();d[i].count++;d[i].earnings+=(sh.earnings||0)+(sh.tips||0);d[i].hours+=sh.endTime?calcDur(sh.startTime,sh.endTime).dec:0;});return d;},[pS]);
  const bestDay=useMemo(()=>{let b=-1,bv=0;dayStats.forEach((d,i)=>{if(d.count>0&&d.hours>0){const a=d.earnings/d.hours;if(a>bv){bv=a;b=i;}}});return b>=0?{day:DAYS[b],hr:bv,cnt:dayStats[b].count}:null;},[dayStats]);
  const worstDay=useMemo(()=>{let w=-1,wv=Infinity;dayStats.forEach((d,i)=>{if(d.count>0&&d.hours>0){const a=d.earnings/d.hours;if(a<wv){wv=a;w=i;}}});return w>=0&&DAYS[w]!==bestDay?.day?{day:DAYS[w],hr:wv}:null;},[dayStats,bestDay]);
  const recentSh=useMemo(()=>pS.filter(sh=>sh.endTime).sort((a,b)=>b.date.localeCompare(a.date)||b.startTime.localeCompare(a.startTime)).slice(0,12).reverse(),[pS]);
  const totE=platStats.reduce((s,p)=>s+p.earnings+p.tips,0);
  const totH=platStats.reduce((s,p)=>s+p.hours,0);
  const avgHr=totH>0?totE/totH:0;
  const totSh=platStats.reduce((s,p)=>s+p.shifts,0);
  const maxDE=Math.max(...dayStats.map(d=>d.earnings),1);
  const maxHr=recentSh.length>0?Math.max(...recentSh.map(sh=>{const d=calcDur(sh.startTime,sh.endTime).dec;return d>0?((sh.earnings||0)+(sh.tips||0))/d:0;}),1):1;
  return(<div style={S.sec}>
    <div style={{...S.pr,marginBottom:12}}><button style={S.chip(period==="week")} onClick={()=>setPeriod("week")}>Week</button><button style={S.chip(period==="month")} onClick={()=>setPeriod("month")}>Month</button><button style={S.chip(period==="year")} onClick={()=>setPeriod("year")}>Year</button></div>
    <div style={S.sr}><SB label="Avg Hourly" value={avgHr>0?fmt(avgHr):"—"} sub={`${totSh} shifts`} color="#F59E0B"/><SB label="Total Earned" value={fmt(totE)} sub={`${fmtN(totH)}h worked`} color="#06C167"/></div>
    {(bestDay||worstDay)&&<div style={{...S.card,background:"linear-gradient(135deg,#1A1F2B,#1F1A14)",border:"1px solid #F59E0B22"}}><div style={{fontSize:12,fontWeight:700,color:"#F59E0B",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>💡 Insights</div>{bestDay&&<div style={{fontSize:14,fontWeight:600,marginBottom:6}}>Best day: <span style={{color:"#06C167"}}>{bestDay.day}s</span> — avg {fmt(bestDay.hr)}/hr over {bestDay.cnt} shifts</div>}{worstDay&&<div style={{fontSize:14,fontWeight:600,color:"#9CA3AF"}}>Weakest: <span style={{color:"#EF4444"}}>{worstDay.day}s</span> — avg {fmt(worstDay.hr)}/hr</div>}</div>}
    {platStats.length>0&&<div style={S.card}><div style={S.ct}>Platform Breakdown</div>{platStats.map(p=>{const tot=p.earnings+p.tips;const hr=p.hours>0?tot/p.hours:0;const tp=tot>0?(p.tips/tot)*100:0;const pct=totE>0?(tot/totE)*100:0;return(<div key={p.name} style={{padding:"14px 0",borderBottom:"1px solid #1E2430"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={S.tag(gc(p.name))}>{p.name}</span><span style={{fontWeight:700,...mono,fontSize:16}}>{fmt(tot)}</span></div><div style={S.barBg}><div style={S.barF(pct,gc(p.name))}/></div><div style={{display:"flex",gap:14,marginTop:8,flexWrap:"wrap"}}><div style={{fontSize:12}}><span style={{color:"#6B7280"}}>Shifts:</span> <span style={{fontWeight:600}}>{p.shifts}</span></div><div style={{fontSize:12}}><span style={{color:"#6B7280"}}>Hours:</span> <span style={{fontWeight:600}}>{fmtN(p.hours)}</span></div><div style={{fontSize:12}}><span style={{color:"#6B7280"}}>$/hr:</span> <span style={{fontWeight:600,color:hr>=avgHr?"#06C167":"#EF4444"}}>{hr>0?fmt(hr):"—"}</span></div><div style={{fontSize:12}}><span style={{color:"#6B7280"}}>Tips:</span> <span style={{fontWeight:600}}>{tp>0?`${tp.toFixed(0)}%`:"—"}</span></div>{p.miles>0&&<div style={{fontSize:12}}><span style={{color:"#6B7280"}}>Miles:</span> <span style={{fontWeight:600}}>{fmtN(p.miles)}</span></div>}</div></div>);})}</div>}
    <div style={S.card}><div style={S.ct}>Earnings by Day</div><div style={{display:"flex",gap:4,alignItems:"flex-end",height:120,marginTop:16,marginBottom:8}}>{dayStats.map((d,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{fontSize:9,color:"#6B7280",...mono}}>{d.earnings>0?`$${Math.round(d.earnings)}`:""}</div><div style={{width:"100%",maxWidth:36,height:`${Math.max((d.earnings/maxDE)*80,d.earnings>0?4:0)}px`,background:d.count>0?"#F59E0B":"#1A1F2B",borderRadius:4}}/><div style={{fontSize:11,color:"#9CA3AF",fontWeight:600}}>{DAYS[i]}</div></div>)}</div></div>
    {recentSh.length>=2&&<div style={S.card}><div style={S.ct}>$/hr — Last {recentSh.length} Shifts</div><div style={{display:"flex",gap:3,alignItems:"flex-end",height:100,marginTop:16,marginBottom:8}}>{recentSh.map((sh,i)=>{const d=calcDur(sh.startTime,sh.endTime).dec;const hr=d>0?((sh.earnings||0)+(sh.tips||0))/d:0;return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{fontSize:9,color:"#6B7280",...mono}}>{hr>0?`$${hr.toFixed(0)}`:""}</div><div style={{width:"100%",maxWidth:28,height:`${Math.max((hr/maxHr)*80,hr>0?4:0)}px`,background:hr>=avgHr?"#06C167":"#EF4444",borderRadius:3,opacity:0.85}}/><div style={{fontSize:8,color:"#4B5563"}}>{toL(sh.date)}</div></div>);})}</div><div style={{display:"flex",justifyContent:"center",gap:16,marginTop:4}}><div style={{fontSize:11,color:"#06C167"}}>■ Above avg</div><div style={{fontSize:11,color:"#EF4444"}}>■ Below avg</div><div style={{fontSize:11,color:"#6B7280"}}>Avg: {fmt(avgHr)}/hr</div></div></div>}
    {totSh===0&&<div style={S.empty}>Log some shifts to see trends.</div>}
  </div>);
}

function TaxTab({mileage,shifts,earnings,expenses,platforms,settings,exportCSV}){
  const yr=yearR();
  const yrMi=mileage.filter(m=>inR(m.date,yr)).reduce((s,m)=>s+m.miles,0)+shifts.filter(sh=>!sh.active&&inR(sh.date,yr)).reduce((s,sh)=>s+(sh.miles||0),0);
  const md=yrMi*settings.irsRate;
  const yrE=earnings.filter(e=>inR(e.date,yr)).reduce((s,e)=>s+e.amount,0)+shifts.filter(sh=>!sh.active&&inR(sh.date,yr)).reduce((s,sh)=>s+(sh.earnings||0)+(sh.tips||0),0);
  const yrX=expenses.filter(e=>inR(e.date,yr)).reduce((s,e)=>s+e.amount,0);
  const net=Math.max(0,yrE-md-yrX);const se=yrE*0.153;const inc=net*0.22;const q=(se+inc)/4;
  const ebp={};platforms.forEach(p=>{ebp[p.name]=0;});earnings.filter(e=>inR(e.date,yr)).forEach(e=>{ebp[e.platform]=(ebp[e.platform]||0)+e.amount;});shifts.filter(sh=>!sh.active&&inR(sh.date,yr)).forEach(sh=>{ebp[sh.platform]=(ebp[sh.platform]||0)+(sh.earnings||0)+(sh.tips||0);});
  const ebc={};expenses.filter(e=>inR(e.date,yr)).forEach(e=>{ebc[e.category]=(ebc[e.category]||0)+e.amount;});
  return(<div style={S.sec}>
    <div style={{...S.card,border:"1px solid #F59E0B33"}}><div style={S.ct}>{settings.taxYear} Tax Summary</div><div style={{marginTop:12}}>
      {[["Gross Income",fmt(yrE),"#06C167"],[`Mileage (${fmtN(yrMi)} mi × $${settings.irsRate})`,`−${fmt(md)}`,"#F59E0B"],["Other Deductions",`−${fmt(yrX)}`,"#F59E0B"]].map(([l,v,c],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #1E2430"}}><span style={{color:"#9CA3AF",fontSize:14}}>{l}</span><span style={{fontWeight:700,...mono,color:c}}>{v}</span></div>)}
      <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #2A3040"}}><span style={{fontWeight:700}}>Net Taxable (est.)</span><span style={{fontWeight:700,...mono,fontSize:18}}>{fmt(net)}</span></div>
      {[["Est. SE Tax (15.3%)",fmt(se),"#EF4444"],["Est. Income Tax (~22%)",fmt(inc),"#EF4444"]].map(([l,v,c],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #1E2430"}}><span style={{color:"#9CA3AF",fontSize:14}}>{l}</span><span style={{fontWeight:700,...mono,color:c}}>{v}</span></div>)}
      <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0"}}><span style={{fontWeight:700,color:"#F59E0B"}}>Est. Quarterly Payment</span><span style={{fontWeight:700,...mono,color:"#F59E0B",fontSize:20}}>{fmt(q)}</span></div>
    </div></div>
    <div style={S.card}><div style={S.ct}>Earnings by Platform</div>{platforms.map(p=>{const a=ebp[p.name]||0;const pct=yrE>0?(a/yrE)*100:0;return(<div key={p.name} style={{padding:"10px 0",borderBottom:"1px solid #1E2430"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:14,fontWeight:600}}>{p.name} {p.type==="non-driving"?"🏠":"🚗"}</span><span style={{fontWeight:700,...mono}}>{fmt(a)}</span></div><div style={S.barBg}><div style={S.barF(pct,gc(p.name))}/></div></div>);})}</div>
    {Object.keys(ebc).length>0&&<div style={S.card}><div style={S.ct}>Expenses by Category</div>{Object.entries(ebc).sort((a,b)=>b[1]-a[1]).map(([c,a])=><div key={c} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #1E2430"}}><span style={{fontSize:14,color:"#9CA3AF"}}>{c}</span><span style={{fontWeight:700,...mono,color:"#EF4444"}}>{fmt(a)}</span></div>)}</div>}
    <button style={{...S.bs,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:16}} onClick={exportCSV}>{I.dl()} Export CSV</button>
  </div>);
}

function SettingsTab({platforms,settings,saveSettings,onAction,onRemovePlatform,exportCSV}){
  return(<div style={S.sec}>
    <div style={S.card}><div style={S.ct}>IRS Mileage Rate</div><div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}><span style={{color:"#9CA3AF",fontSize:20,fontWeight:700}}>$</span><input type="number" step="0.01" value={settings.irsRate} style={{background:"#1A1F2B",border:"1px solid #2A3040",borderRadius:8,padding:"10px 12px",color:"#E8E6E1",fontSize:20,fontWeight:700,...mono,outline:"none",width:120}} onChange={e=>saveSettings(prev=>({...prev,irsRate:parseFloat(e.target.value)||0}))}/><span style={{color:"#6B7280",fontSize:14}}>per mile</span></div></div>
    <div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={S.ct}>Platforms</div><button style={{...S.bs,padding:"6px 14px",fontSize:12}} onClick={()=>onAction("platform")}>{I.plus()}</button></div>{platforms.map(p=><div key={p.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #1E2430"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{width:10,height:10,borderRadius:"50%",background:gc(p.name)}}/><span style={{fontSize:15,fontWeight:600}}>{p.name}</span><span style={{fontSize:11,color:"#6B7280"}}>{p.type==="driving"?"🚗 Driving":"🏠 Non-Driving"}</span></div><button style={S.bd} onClick={()=>onRemovePlatform(p.name)}>{I.trash()}</button></div>)}</div>
    <div style={S.card}><div style={S.ct}>Data</div><div style={{marginTop:12}}><button style={{...S.bs,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}} onClick={exportCSV}>{I.dl()} Export CSV</button><button style={{...S.bs,width:"100%",color:"#EF4444",borderColor:"#EF444433"}} onClick={()=>{if(confirm("Reset ALL data? Cannot be undone.")){Object.values(SK).forEach(k=>{try{localStorage.removeItem(k);}catch{}});window.location.reload();}}}>Reset All Data</button></div></div>
  </div>);
}

// ═══════════════ MAIN APP ═══════════════
export default function GigTaxTracker(){
  const[tab,setTab]=useState("dash");
  const[mileage,saveMi]=useStore(SK.mileage,[]);
  const[shifts,saveSh]=useStore(SK.shifts,[]);
  const[expenses,saveEx]=useStore(SK.expenses,[]);
  const[earnings,saveEr]=useStore(SK.earnings,[]);
  const[platforms,savePl]=useStore(SK.platforms,DEFAULT_PLATFORMS);
  const[settings,saveSt]=useStore(SK.settings,{irsRate:IRS_RATE_2025,taxYear:new Date().getFullYear()});
  const[modal,setModal]=useState(null);
  const[activeShift,setActiveShift]=useState(()=>{
    // Restore active shift on load
    const stored = shifts.find(s=>s.active);
    return stored || null;
  });

  // Sync activeShift when shifts load from storage
  useEffect(()=>{
    const a=shifts.find(s=>s.active);
    if(a && !activeShift) setActiveShift(a);
  },[shifts]);

  const addMi=e=>{saveMi(p=>[{...e,id:uid()},...p]);setModal(null);};
  const delMi=id=>saveMi(p=>p.filter(m=>m.id!==id));
  const addEx=e=>{saveEx(p=>[{...e,id:uid()},...p]);setModal(null);};
  const delEx=id=>saveEx(p=>p.filter(e=>e.id!==id));
  const addEr=e=>{saveEr(p=>[{...e,id:uid()},...p]);setModal(null);};
  const delEr=id=>saveEr(p=>p.filter(e=>e.id!==id));
  const startShift=name=>{const pl=platforms.find(p=>p.name===name);const sh={id:uid(),platform:name,_type:pl?.type||"driving",date:td(),startTime:new Date().toISOString(),active:true,earnings:0,tips:0,miles:0};saveSh(p=>[sh,...p]);setActiveShift(sh);};
  const endShift=(earn,tips,miles)=>{if(!activeShift)return;saveSh(p=>p.map(s=>s.id===activeShift.id?{...s,active:false,endTime:new Date().toISOString(),earnings:parseFloat(earn)||0,tips:parseFloat(tips)||0,miles:parseFloat(miles)||0}:s));setActiveShift(null);setModal(null);};

  // FIX #2: No longer double-logging miles — shift miles stay on the shift record only
  const addManual=e=>{saveSh(p=>[{...e,id:uid()},...p]);setModal(null);};

  const delSh=id=>saveSh(p=>p.filter(s=>s.id!==id));
  const addPl=(n,t)=>{if(n&&!platforms.find(p=>p.name===n))savePl(p=>[...p,{name:n,type:t}]);setModal(null);};
  const remPl=n=>savePl(p=>p.filter(x=>x.name!==n));
  const exportCSV=()=>{let csv="Type,Date,Platform,Description,Miles,Amount,Tips,Category,Duration\n";mileage.forEach(m=>csv+=`Mileage,${m.date},${m.platform},"${(m.purpose||"").replace(/"/g,'""')}",${m.miles},,,,\n`);earnings.forEach(e=>csv+=`Earning,${e.date},${e.platform},"${(e.note||"").replace(/"/g,'""')}",,${e.amount},,,\n`);expenses.forEach(e=>csv+=`Expense,${e.date},,"${(e.description||"").replace(/"/g,'""')}",,${e.amount},,${e.category},\n`);shifts.filter(s=>!s.active).forEach(s=>{const dur=s.endTime?calcDur(s.startTime,s.endTime).label:"";csv+=`Shift,${s.date},${s.platform},"${(s.note||"").replace(/"/g,'""')}",${s.miles||0},${s.earnings||0},${s.tips||0},,${dur}\n`;});const b=new Blob([csv],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`gig-tax-${settings.taxYear}.csv`;a.click();URL.revokeObjectURL(u);};
  const act=(a,d)=>{if(a==="startShiftDirect")startShift(d);else setModal(a);};

  return(<div style={S.app}><Fonts/>
    <div style={S.header}><div><div style={S.title}>GigTracker</div><div style={S.sub}>Tax-ready gig work tracking</div></div><button style={{background:"none",border:"none",color:tab==="settings"?"#F59E0B":"#6B7280",cursor:"pointer",padding:8}} onClick={()=>setTab(tab==="settings"?"dash":"settings")}>{I.gear()}</button></div>
    {tab==="dash"&&<DashTab mileage={mileage} shifts={shifts} earnings={earnings} expenses={expenses} platforms={platforms} settings={settings} activeShift={activeShift} onAction={act}/>}
    {tab==="miles"&&<MilesTab mileage={mileage} shifts={shifts} settings={settings} platforms={platforms} onAction={act} onDelete={delMi}/>}
    {tab==="shifts"&&<ShiftsTab shifts={shifts} platforms={platforms} activeShift={activeShift} onAction={act} onDeleteShift={delSh}/>}
    {tab==="money"&&<MoneyTab earnings={earnings} expenses={expenses} platforms={platforms} onAction={act} onDeleteEarning={delEr} onDeleteExpense={delEx}/>}
    {tab==="trends"&&<TrendsTab shifts={shifts} mileage={mileage} earnings={earnings} platforms={platforms} settings={settings}/>}
    {tab==="tax"&&<TaxTab mileage={mileage} shifts={shifts} earnings={earnings} expenses={expenses} platforms={platforms} settings={settings} exportCSV={exportCSV}/>}
    {tab==="settings"&&<SettingsTab platforms={platforms} settings={settings} saveSettings={saveSt} onAction={act} onRemovePlatform={remPl} exportCSV={exportCSV}/>}
    <div style={S.nav}><div style={S.navIn}>{[{id:"dash",icon:I.chart,l:"Home"},{id:"miles",icon:I.road,l:"Miles"},{id:"shifts",icon:I.clock,l:"Shifts"},{id:"money",icon:I.dollar,l:"Money"},{id:"trends",icon:I.trend,l:"Trends"},{id:"tax",icon:I.chart,l:"Tax"}].map(t=><button key={t.id} style={S.navBtn(tab===t.id)} onClick={()=>setTab(t.id)}>{t.icon()}<span>{t.l}</span></button>)}</div></div>
    <Modal open={modal==="mileage"} onClose={()=>setModal(null)} title="Log Mileage"><MileageForm platforms={platforms} onSubmit={addMi}/></Modal>
    <Modal open={modal==="startShift"} onClose={()=>setModal(null)} title="Start Shift"><div style={{display:"flex",flexDirection:"column",gap:10}}>{platforms.map(p=><button key={p.name} style={{...S.bs,display:"flex",alignItems:"center",gap:10,padding:16}} onClick={()=>{startShift(p.name);setModal(null);}}><span style={{width:12,height:12,borderRadius:"50%",background:gc(p.name)}}/><span style={{fontSize:16,fontWeight:600}}>{p.name}</span><span style={{fontSize:12,color:"#6B7280",marginLeft:"auto"}}>{p.type==="driving"?"🚗":"🏠"}</span></button>)}</div></Modal>
    <Modal open={modal==="endShift"} onClose={()=>setModal(null)} title="End Shift"><EndShiftForm activeShift={activeShift} onEnd={endShift}/></Modal>
    <Modal open={modal==="manualShift"} onClose={()=>setModal(null)} title="Log Past Shift"><ManualShiftForm platforms={platforms} onSubmit={addManual}/></Modal>
    <Modal open={modal==="earning"} onClose={()=>setModal(null)} title="Log Earnings"><EarningForm platforms={platforms} onSubmit={addEr}/></Modal>
    <Modal open={modal==="expense"} onClose={()=>setModal(null)} title="Log Expense"><ExpenseForm onSubmit={addEx}/></Modal>
    <Modal open={modal==="platform"} onClose={()=>setModal(null)} title="Add Platform"><PlatformForm onSubmit={addPl}/></Modal>
  </div>);
}
