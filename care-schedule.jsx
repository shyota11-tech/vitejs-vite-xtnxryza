import { useState, useEffect } from "react";

const DEFAULT_SHIFTS = [
  { id: "s1", label: "야간", start: "00:00", end: "06:00", accent: "#7F77DD", bg: "#EEEDFE", textColor: "#3C3489" },
  { id: "s2", label: "오전", start: "06:00", end: "12:00", accent: "#1D9E75", bg: "#E1F5EE", textColor: "#085041" },
  { id: "s3", label: "오후", start: "12:00", end: "18:00", accent: "#BA7517", bg: "#FAEEDA", textColor: "#633806" },
  { id: "s4", label: "저녁", start: "18:00", end: "24:00", accent: "#378ADD", bg: "#E6F1FB", textColor: "#0C447C" },
];

const SHIFT_COLORS = [
  { accent:"#7F77DD", bg:"#EEEDFE", textColor:"#3C3489" },
  { accent:"#1D9E75", bg:"#E1F5EE", textColor:"#085041" },
  { accent:"#BA7517", bg:"#FAEEDA", textColor:"#633806" },
  { accent:"#378ADD", bg:"#E6F1FB", textColor:"#0C447C" },
  { accent:"#D85A30", bg:"#FAECE7", textColor:"#712B13" },
  { accent:"#D4537E", bg:"#FBEAF0", textColor:"#72243E" },
];

const MEMBER_PALETTE = [
  { bg:"#E1F5EE", text:"#085041", accent:"#1D9E75" },
  { bg:"#E6F1FB", text:"#0C447C", accent:"#378ADD" },
  { bg:"#FAECE7", text:"#712B13", accent:"#D85A30" },
  { bg:"#FBEAF0", text:"#72243E", accent:"#D4537E" },
  { bg:"#EEEDFE", text:"#3C3489", accent:"#7F77DD" },
  { bg:"#FAEEDA", text:"#633806", accent:"#BA7517" },
  { bg:"#EAF3DE", text:"#27500A", accent:"#639922" },
];

const ROLE_PRESETS = [
  "투약 관리","식사 보조","체위 변경","위생 관리","재활 운동",
  "의사 소통","병원 동행","보호자 면담","심리 지원","기저귀 교체",
];

const DAYS = ["일","월","화","수","목","금","토"];
const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

const getWeekDates = (date) => {
  const s = new Date(date);
  s.setDate(s.getDate() - s.getDay());
  s.setHours(0,0,0,0);
  return Array.from({length:7}, (_,i) => { const d = new Date(s); d.setDate(s.getDate()+i); return d; });
};

const getMonthGrid = (date) => {
  const y = date.getFullYear(), m = date.getMonth();
  const first = new Date(y,m,1).getDay(), last = new Date(y,m+1,0).getDate();
  const cells = [];
  for (let i=0; i<first; i++) cells.push({date: new Date(y,m,i-first+1), cur:false});
  for (let i=1; i<=last; i++) cells.push({date: new Date(y,m,i), cur:true});
  while (cells.length % 7) cells.push({date: new Date(y,m+1,cells.length-first-last+1), cur:false});
  while (cells.length < 35) cells.push({date: new Date(y,m+1,cells.length-first-last+1), cur:false});
  return cells;
};

const Modal = ({children, onClose}) => (
  <div onClick={e => e.target === e.currentTarget && onClose()} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"#fff",borderRadius:20,padding:"1.75rem",width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 28px 80px rgba(0,0,0,0.22)"}}>
      {children}
    </div>
  </div>
);

const Label = ({children, sub}) => (
  <div style={{marginBottom:6}}>
    <div style={{fontSize:13,fontWeight:700,color:"#444"}}>{children}</div>
    {sub && <div style={{fontSize:11,color:"#bbb",marginTop:1}}>{sub}</div>}
  </div>
);

const Inp = (props) => (
  <input {...props} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e8e8e8",borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit",...(props.style||{})}} />
);

const Btn = ({children, onClick, style={}}) => (
  <button onClick={onClick} style={{padding:"8px 16px",fontSize:14,border:"1px solid #e0e0e0",borderRadius:9,background:"white",color:"#555",fontFamily:"inherit",cursor:"pointer",...style}}>{children}</button>
);

const PrimaryBtn = ({children, onClick, style={}}) => (
  <button onClick={onClick} style={{padding:"8px 20px",fontSize:14,border:"none",borderRadius:9,background:"#1D9E75",color:"white",fontWeight:700,fontFamily:"inherit",cursor:"pointer",...style}}>{children}</button>
);

const NavBtn = ({children, onClick}) => (
  <button onClick={onClick} style={{width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:"1px solid #e0e0e0",borderRadius:8,background:"white",color:"#555",cursor:"pointer",fontFamily:"inherit"}}>{children}</button>
);

export default function App() {
  const [view, setView] = useState("week");
  const [cur, setCur] = useState(new Date());
  const [data, setData] = useState({});
  const [members, setMembers] = useState([{id:"1",name:"첫째",ci:0},{id:"2",name:"둘째",ci:1}]);
  const [shifts, setShifts] = useState(DEFAULT_SHIFTS);
  const [patient, setPatient] = useState("어머니");
  const [hospitalLink, setHospitalLink] = useState("");
  const [modal, setModal] = useState(null);
  const [shiftForm, setShiftForm] = useState({memberId:"",roles:[],note:"",link:""});
  const [memberForm, setMemberForm] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const todayKey = toKey(new Date());

  useEffect(() => {
    (async () => {
      try {
        const keys = ["care_data","care_members","care_shifts","care_patient","care_hlink"];
        const results = await Promise.allSettled(keys.map(k => window.storage.get(k, true)));
        const [d,m,sh,p,hl] = results;
        if (d.value?.value) setData(JSON.parse(d.value.value));
        if (m.value?.value) setMembers(JSON.parse(m.value.value));
        if (sh.value?.value) setShifts(JSON.parse(sh.value.value));
        if (p.value?.value) setPatient(p.value.value);
        if (hl.value?.value) setHospitalLink(hl.value.value);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const persist = async (key, val) => {
    setSyncing(true);
    try { await window.storage.set(key, typeof val === "string" ? val : JSON.stringify(val), true); }
    catch {}
    setSyncing(false);
  };

  const getC = (ci) => MEMBER_PALETTE[ci % MEMBER_PALETTE.length];
  const getA = (dk, sid) => data[dk]?.[sid];

  const openShift = (dk, sid) => {
    const a = getA(dk, sid);
    setShiftForm({memberId:a?.memberId||"",roles:a?.roles||[],note:a?.note||"",link:a?.link||""});
    setModal({type:"shift", dateKey:dk, shiftId:sid});
  };

  const saveShift = async () => {
    const {dateKey, shiftId} = modal;
    const nd = {...data};
    if (!shiftForm.memberId) {
      if (nd[dateKey]) { delete nd[dateKey][shiftId]; if (!Object.keys(nd[dateKey]).length) delete nd[dateKey]; }
    } else {
      if (!nd[dateKey]) nd[dateKey] = {};
      nd[dateKey][shiftId] = {memberId:shiftForm.memberId, roles:shiftForm.roles, note:shiftForm.note, link:shiftForm.link};
    }
    setData(nd);
    await persist("care_data", nd);
    setModal(null);
  };

  const addMember = async () => {
    if (!memberForm.trim()) return;
    const nm = [...members, {id:Date.now().toString(), name:memberForm.trim(), ci:members.length%MEMBER_PALETTE.length}];
    setMembers(nm); setMemberForm("");
    await persist("care_members", nm);
  };

  const removeMember = async (id) => {
    const nm = members.filter(m => m.id !== id);
    setMembers(nm); await persist("care_members", nm);
  };

  const saveShifts = async (ns) => { setShifts(ns); await persist("care_shifts", ns); };

  const getStats = () => {
    const s = {}; members.forEach(m => { s[m.id] = {total:0, month:0}; });
    const ym = toKey(new Date()).slice(0,7);
    Object.entries(data).forEach(([dk,ds]) => {
      Object.values(ds).forEach(a => {
        if (a.memberId && s[a.memberId]) { s[a.memberId].total++; if (dk.startsWith(ym)) s[a.memberId].month++; }
      });
    });
    return s;
  };

  const nav = (dir) => {
    const d = new Date(cur);
    view === "week" ? d.setDate(d.getDate() + dir*7) : d.setMonth(d.getMonth() + dir);
    setCur(d);
  };

  const title = () => {
    if (view === "week") {
      const wk = getWeekDates(cur); const s = wk[0], e = wk[6];
      return s.getMonth() === e.getMonth()
        ? `${s.getFullYear()}년 ${s.getMonth()+1}월 ${s.getDate()}일 – ${e.getDate()}일`
        : `${s.getFullYear()}년 ${s.getMonth()+1}월 ${s.getDate()}일 – ${e.getMonth()+1}월 ${e.getDate()}일`;
    }
    return `${cur.getFullYear()}년 ${cur.getMonth()+1}월`;
  };

  const stats = getStats();

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:320,fontFamily:"system-ui",color:"#bbb",flexDirection:"column",gap:12}}>
      <div style={{width:28,height:28,border:"3px solid #e0e0e0",borderTop:"3px solid #1D9E75",borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
      스케줄 불러오는 중...
    </div>
  );

  return (
    <div style={{fontFamily:"'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif",maxWidth:1020,margin:"0 auto",padding:"0 1rem 5rem",color:"#111"}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        .sc:hover{background:#f8fffe!important}
        .sc-f:hover{filter:brightness(0.96)}
        .dc:hover{background:#f5fdf9!important}
        button{font-family:inherit;cursor:pointer;transition:all 0.13s}
        input,textarea,select{font-family:inherit}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
        .role-chip:hover{opacity:0.75}
        a{cursor:pointer}
      `}</style>

      {/* ── Header ── */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12,padding:"1.5rem 0 1rem",borderBottom:"1.5px solid #f0f0f0"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:44,height:44,background:"#1D9E75",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🏥</div>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",color:"#1D9E75",textTransform:"uppercase",marginBottom:2}}>가족 간병 공유 스케줄</div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <h1 style={{margin:0,fontSize:22,fontWeight:800,color:"#0d1117"}}>{patient}님 간병 달력</h1>
              {hospitalLink && (
                <a href={hospitalLink} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#378ADD",border:"1px solid #b5d4f4",borderRadius:6,padding:"3px 9px",textDecoration:"none",background:"#E6F1FB",fontWeight:600}}>
                  🔗 병원 링크
                </a>
              )}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#bbb",marginRight:2}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:syncing?"#f59e0b":"#1D9E75",animation:syncing?"spin 1s linear infinite":"none",flexShrink:0}}/>
            {syncing ? "동기화 중..." : "가족 공유 중"}
          </div>
          <Btn onClick={() => setModal({type:"shiftSettings"})}>⏰ 시간 설정</Btn>
          <Btn onClick={() => setModal({type:"member"})}>👥 가족 관리</Btn>
          <Btn onClick={() => setModal({type:"config", pf:patient, lf:hospitalLink})}>⚙ 설정</Btn>
        </div>
      </div>

      {/* ── Member Bar ── */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0.875rem 0"}}>
        {members.map(m => {
          const c = getC(m.ci);
          return (
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 13px",borderRadius:24,background:c.bg,border:`1.5px solid ${c.accent}`}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c.accent}}/>
              <span style={{fontSize:13,fontWeight:700,color:c.text}}>{m.name}</span>
              <span style={{fontSize:11,color:c.text,opacity:0.6}}>이번달 {stats[m.id]?.month||0}회 · 총 {stats[m.id]?.total||0}회</span>
            </div>
          );
        })}
        {members.length === 0 && <div style={{fontSize:13,color:"#ccc"}}>👥 가족 관리에서 구성원을 추가하세요</div>}
      </div>

      {/* ── Nav ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:"1rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <NavBtn onClick={() => nav(-1)}>‹</NavBtn>
          <span style={{fontSize:16,fontWeight:700,minWidth:220,textAlign:"center"}}>{title()}</span>
          <NavBtn onClick={() => nav(1)}>›</NavBtn>
          <button onClick={() => setCur(new Date())} style={{padding:"6px 12px",fontSize:12,border:"1px solid #e0e0e0",borderRadius:8,background:"white",color:"#666"}}>오늘</button>
        </div>
        <div style={{display:"flex",background:"#f4f4f4",borderRadius:10,padding:3,gap:2}}>
          {["week","month"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{padding:"6px 18px",fontSize:13,border:"none",borderRadius:8,background:view===v?"white":"transparent",color:view===v?"#111":"#888",fontWeight:view===v?700:400,boxShadow:view===v?"0 1px 5px rgba(0,0,0,0.12)":"none"}}>
              {v === "week" ? "주별" : "월별"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar ── */}
      {view === "week"
        ? <WeekView dates={getWeekDates(cur)} todayKey={todayKey} data={data} members={members} shifts={shifts} getC={getC} getA={getA} onOpen={openShift}/>
        : <MonthView grid={getMonthGrid(cur)} todayKey={todayKey} data={data} members={members} shifts={shifts} getC={getC} onOpen={openShift} onDayClick={d => {setCur(d); setView("week");}}/>
      }

      {/* ── Modals ── */}
      {modal?.type === "shift" && (
        <Modal onClose={() => setModal(null)}>
          <ShiftModal modal={modal} members={members} shifts={shifts} form={shiftForm} setForm={setShiftForm} getC={getC} onSave={saveShift} onClose={() => setModal(null)}/>
        </Modal>
      )}
      {modal?.type === "member" && (
        <Modal onClose={() => setModal(null)}>
          <MemberModal members={members} stats={stats} form={memberForm} setForm={setMemberForm} getC={getC} onAdd={addMember} onRemove={removeMember} onClose={() => setModal(null)}/>
        </Modal>
      )}
      {modal?.type === "config" && (
        <Modal onClose={() => setModal(null)}>
          <ConfigModal pf={modal.pf} lf={modal.lf}
            onSave={async (pv,lv) => { setPatient(pv); setHospitalLink(lv); await persist("care_patient",pv); await persist("care_hlink",lv); setModal(null); }}
            onClose={() => setModal(null)}/>
        </Modal>
      )}
      {modal?.type === "shiftSettings" && (
        <Modal onClose={() => setModal(null)}>
          <ShiftSettingsModal shifts={shifts} onSave={async ns => { await saveShifts(ns); setModal(null); }} onClose={() => setModal(null)}/>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*             WEEK VIEW                   */
/* ═══════════════════════════════════════ */
function WeekView({dates, todayKey, data, members, shifts, getC, getA, onOpen}) {
  return (
    <div style={{border:"1px solid #e8e8e8",borderRadius:14,overflow:"hidden",background:"white"}}>
      <div style={{display:"flex",borderBottom:"2px solid #eaeaea",background:"#fafafa"}}>
        <div style={{width:84,flexShrink:0,padding:"10px 12px",borderRight:"1px solid #f0f0f0"}}>
          <span style={{fontSize:11,color:"#ccc",fontWeight:700}}>교대</span>
        </div>
        {dates.map((date, i) => {
          const dk = toKey(date); const isToday = dk === todayKey;
          const isSun = date.getDay()===0, isSat = date.getDay()===6;
          return (
            <div key={i} style={{flex:1,textAlign:"center",padding:"10px 4px",borderLeft:"1px solid #f0f0f0",background:isToday?"#f0fdf7":"transparent"}}>
              <div style={{fontSize:11,fontWeight:700,color:isSun?"#E24B4A":isSat?"#378ADD":"#aaa",marginBottom:3}}>{DAYS[date.getDay()]}</div>
              <div style={{width:30,height:30,margin:"0 auto",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,background:isToday?"#1D9E75":"transparent",color:isToday?"white":isSun?"#E24B4A":isSat?"#378ADD":"#222"}}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      {shifts.map(shift => (
        <div key={shift.id} style={{display:"flex",borderBottom:"1px solid #f0f0f0",minHeight:84}}>
          <div style={{width:84,flexShrink:0,padding:"10px 10px",borderRight:"1px solid #f0f0f0",background:shift.bg,display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <div style={{fontSize:13,fontWeight:800,color:shift.accent}}>{shift.label}</div>
            <div style={{fontSize:9,color:shift.accent,opacity:0.7,marginTop:2,lineHeight:1.4}}>{shift.start}<br/>{shift.end}</div>
          </div>
          {dates.map((date, i) => {
            const dk = toKey(date); const isToday = dk === todayKey;
            const a = getA(dk, shift.id);
            const member = a ? members.find(m => m.id === a.memberId) : null;
            const c = member ? getC(member.ci) : null;
            return (
              <div key={i} className={member ? "sc-f" : "sc"} onClick={() => onOpen(dk, shift.id)} style={{flex:1,padding:"8px 4px",cursor:"pointer",borderLeft:"1px solid #f0f0f0",background:member?c.bg:isToday?"rgba(29,158,117,0.04)":"transparent",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",gap:2,transition:"all 0.12s",paddingTop:9}}>
                {member ? (
                  <div style={{textAlign:"center",width:"100%",padding:"0 3px"}}>
                    <div style={{fontSize:11,fontWeight:800,color:"white",background:c.accent,borderRadius:6,padding:"2px 4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{member.name}</div>
                    {a.roles?.slice(0,2).map(r => (
                      <div key={r} style={{fontSize:9,color:c.text,background:"white",borderRadius:4,padding:"1px 4px",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",border:`1px solid ${c.accent}30`}}>{r}</div>
                    ))}
                    {a.roles?.length > 2 && <div style={{fontSize:9,color:"#bbb",marginTop:1}}>+{a.roles.length-2}</div>}
                    {a.note && <div style={{fontSize:9,color:"#999",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%",padding:"0 2px"}}>💬 {a.note}</div>}
                    {a.link && <div style={{fontSize:9,color:"#378ADD",marginTop:1}}>🔗</div>}
                  </div>
                ) : (
                  <span style={{fontSize:22,color:"#e8e8e8",fontWeight:300,lineHeight:1,marginTop:8}}>+</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*             MONTH VIEW                  */
/* ═══════════════════════════════════════ */
function MonthView({grid, todayKey, data, members, shifts, getC, onOpen, onDayClick}) {
  const weeks = [];
  for (let i=0; i<grid.length; i+=7) weeks.push(grid.slice(i,i+7));
  return (
    <div style={{border:"1px solid #e8e8e8",borderRadius:14,overflow:"hidden",background:"white"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"2px solid #eaeaea",background:"#fafafa"}}>
        {DAYS.map((d,i) => (
          <div key={d} style={{textAlign:"center",padding:"10px 0",fontSize:12,fontWeight:700,color:i===0?"#E24B4A":i===6?"#378ADD":"#888"}}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:wi<weeks.length-1?"1px solid #f0f0f0":"none"}}>
          {week.map((cell, di) => {
            const dk = toKey(cell.date); const isToday = dk === todayKey;
            const dayA = data[dk] ? Object.entries(data[dk]) : [];
            const isSun = di===0, isSat = di===6;
            return (
              <div key={di} className="dc" onClick={() => onDayClick(cell.date)} style={{minHeight:102,padding:"7px 6px 6px",borderLeft:di>0?"1px solid #f0f0f0":"none",background:isToday?"#f0fdf7":!cell.cur?"#fafafa":"white",cursor:"pointer",transition:"background 0.12s"}}>
                <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:isToday?800:500,background:isToday?"#1D9E75":"transparent",color:isToday?"white":!cell.cur?"#ccc":isSun?"#E24B4A":isSat?"#378ADD":"#222",marginBottom:4}}>
                  {cell.date.getDate()}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {dayA.slice(0,3).map(([sid,a]) => {
                    const member = members.find(m => m.id === a.memberId);
                    if (!member) return null;
                    const c = getC(member.ci);
                    const shift = shifts.find(s => s.id === sid);
                    return (
                      <div key={sid} onClick={e=>{e.stopPropagation();onOpen(dk,sid);}} style={{fontSize:10,fontWeight:700,padding:"2px 5px",borderRadius:4,background:c.bg,color:c.text,border:`1px solid ${c.accent}40`,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer"}}>
                        {shift?.label} {member.name}
                      </div>
                    );
                  })}
                  {dayA.length > 3 && <div style={{fontSize:10,color:"#bbb"}}>+{dayA.length-3}개 더</div>}
                  {dayA.length === 0 && cell.cur && <div style={{fontSize:10,color:"#e0e0e0"}}>+ 배정</div>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*            SHIFT MODAL                  */
/* ═══════════════════════════════════════ */
function ShiftModal({modal, members, shifts, form, setForm, getC, onSave, onClose}) {
  const shift = shifts.find(s => s.id === modal.shiftId);
  const [y,m,d] = modal.dateKey.split("-");
  const dateStr = `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;

  const toggleRole = (r) => {
    const has = form.roles.includes(r);
    setForm({...form, roles: has ? form.roles.filter(x=>x!==r) : [...form.roles, r]});
  };

  return (
    <div>
      <div style={{marginBottom:"1.25rem",paddingBottom:"1rem",borderBottom:"1px solid #f0f0f0"}}>
        <div style={{fontSize:12,color:"#aaa",fontWeight:600,marginBottom:4}}>{dateStr}</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:shift?.bg,border:`2px solid ${shift?.accent}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:11,fontWeight:800,color:shift?.accent,lineHeight:1}}>{shift?.label}</span>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:800}}>{shift?.label} 간병 배정</div>
            <div style={{fontSize:12,color:"#bbb"}}>{shift?.start} – {shift?.end}</div>
          </div>
        </div>
      </div>

      {/* 담당자 */}
      <div style={{marginBottom:"1.25rem"}}>
        <Label>담당자 선택</Label>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          <ChoiceItem selected={!form.memberId} accent="#1D9E75" bg="#f0fdf7" text="#085041" onClick={() => setForm({...form,memberId:""})}>
            배정 없음 (비우기)
          </ChoiceItem>
          {members.map(m => {
            const c = getC(m.ci);
            return (
              <ChoiceItem key={m.id} selected={form.memberId===m.id} accent={c.accent} bg={c.bg} text={c.text} onClick={() => setForm({...form,memberId:m.id})}>
                {m.name}
              </ChoiceItem>
            );
          })}
        </div>
      </div>

      {/* 주요 역할 */}
      <div style={{marginBottom:"1.25rem"}}>
        <Label sub="해당하는 역할을 모두 선택 (복수 선택 가능)">주요 역할</Label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
          {ROLE_PRESETS.map(r => {
            const sel = form.roles.includes(r);
            return (
              <div key={r} className="role-chip" onClick={() => toggleRole(r)} style={{padding:"5px 11px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.12s",background:sel?"#1D9E75":"#f5f5f5",color:sel?"white":"#666",border:`1.5px solid ${sel?"#1D9E75":"#e8e8e8"}`}}>
                {r}
              </div>
            );
          })}
        </div>
        <CustomRoleInput onAdd={r => setForm({...form, roles:[...new Set([...form.roles,r])]})}/>
        {form.roles.length > 0 && (
          <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:5}}>
            {form.roles.map(r => (
              <span key={r} style={{padding:"3px 10px",borderRadius:14,background:"#E1F5EE",color:"#085041",fontSize:12,fontWeight:700,border:"1px solid #9FE1CB",display:"inline-flex",alignItems:"center",gap:5}}>
                {r}
                <span onClick={() => toggleRole(r)} style={{cursor:"pointer",opacity:0.45,fontSize:14,lineHeight:1}}>×</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 메모 */}
      <div style={{marginBottom:"1rem"}}>
        <Label sub="투약정보, 주의사항, 인수인계 내용 등">메모 / 인수인계</Label>
        <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})}
          placeholder="예: 14시 혈압약 복용 필수, 식사 반드시 확인, 체위 2시간마다 변경..."
          rows={3} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e8e8e8",borderRadius:10,fontSize:13,resize:"vertical",outline:"none",fontFamily:"inherit",lineHeight:1.65}}/>
      </div>

      {/* 링크 */}
      <div style={{marginBottom:"1.5rem"}}>
        <Label sub="투약 안내, 담당의 정보, 참고 문서 URL 등">참고 링크 (선택)</Label>
        <Inp value={form.link} onChange={e=>setForm({...form,link:e.target.value})} placeholder="https://..."/>
        {form.link && (
          <a href={form.link} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#378ADD",marginTop:5,display:"inline-block"}}>🔗 링크 확인</a>
        )}
      </div>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn onClick={onClose}>취소</Btn>
        <PrimaryBtn onClick={onSave}>저장</PrimaryBtn>
      </div>
    </div>
  );
}

function CustomRoleInput({onAdd}) {
  const [v, setV] = useState("");
  return (
    <div style={{display:"flex",gap:6}}>
      <input value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&v.trim()){onAdd(v.trim());setV("");}}}
        placeholder="역할 직접 입력 후 Enter..."
        style={{flex:1,padding:"6px 10px",border:"1.5px dashed #d0d0d0",borderRadius:8,fontSize:13,outline:"none",fontFamily:"inherit",background:"#fafafa"}}/>
      <Btn onClick={()=>{if(v.trim()){onAdd(v.trim());setV("");}}} style={{padding:"6px 12px",fontSize:12}}>추가</Btn>
    </div>
  );
}

function ChoiceItem({selected, accent, bg, text, onClick, children}) {
  return (
    <div onClick={onClick} style={{padding:"9px 14px",borderRadius:10,cursor:"pointer",border:`2px solid ${selected?accent:"#e8e8e8"}`,background:selected?bg:"white",display:"flex",alignItems:"center",gap:10,transition:"all 0.12s"}}>
      <div style={{width:10,height:10,borderRadius:"50%",background:selected?accent:"#ddd",flexShrink:0}}/>
      <span style={{fontSize:14,fontWeight:700,color:selected?text:"#555"}}>{children}</span>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*         SHIFT SETTINGS MODAL            */
/* ═══════════════════════════════════════ */
function ShiftSettingsModal({shifts, onSave, onClose}) {
  const [local, setLocal] = useState(shifts.map(s=>({...s})));
  const update = (id, field, val) => setLocal(local.map(s => s.id===id ? {...s,[field]:val} : s));
  const addShift = () => {
    const ci = local.length % SHIFT_COLORS.length;
    setLocal([...local, {id:Date.now().toString(), label:"새 교대", start:"00:00", end:"06:00", ...SHIFT_COLORS[ci]}]);
  };
  const removeShift = (id) => setLocal(local.filter(s => s.id !== id));
  return (
    <div>
      <h2 style={{margin:"0 0 0.25rem",fontSize:20,fontWeight:800}}>교대 시간 설정</h2>
      <p style={{margin:"0 0 1.25rem",fontSize:13,color:"#aaa"}}>교대 이름과 시작·종료 시간을 자유롭게 조정하세요</p>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:"1.25rem"}}>
        {local.map(shift => (
          <div key={shift.id} style={{padding:"13px 14px",borderRadius:12,background:shift.bg,border:`1.5px solid ${shift.accent}40`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:shift.accent,flexShrink:0}}/>
              <input value={shift.label} onChange={e=>update(shift.id,"label",e.target.value)}
                style={{flex:1,padding:"5px 9px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:14,fontWeight:700,background:"white",outline:"none",fontFamily:"inherit"}}/>
              {local.length > 1 && (
                <button onClick={()=>removeShift(shift.id)} style={{padding:"3px 9px",border:"1px solid #e8e8e8",borderRadius:6,background:"white",fontSize:12,color:"#ccc",cursor:"pointer"}}>삭제</button>
              )}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                <span style={{fontSize:12,color:shift.textColor,fontWeight:600,whiteSpace:"nowrap"}}>시작</span>
                <input type="time" value={shift.start} onChange={e=>update(shift.id,"start",e.target.value)}
                  style={{flex:1,padding:"6px 8px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:13,background:"white",outline:"none",fontFamily:"inherit"}}/>
              </div>
              <span style={{color:"#ccc",fontSize:16}}>→</span>
              <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                <span style={{fontSize:12,color:shift.textColor,fontWeight:600,whiteSpace:"nowrap"}}>종료</span>
                <input type="time" value={shift.end} onChange={e=>update(shift.id,"end",e.target.value)}
                  style={{flex:1,padding:"6px 8px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:13,background:"white",outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addShift} style={{width:"100%",padding:"10px",border:"1.5px dashed #d0d0d0",borderRadius:10,background:"#fafafa",fontSize:13,color:"#aaa",cursor:"pointer",fontFamily:"inherit",marginBottom:"1.25rem"}}>
        + 교대 추가
      </button>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn onClick={onClose}>취소</Btn>
        <PrimaryBtn onClick={()=>onSave(local)}>저장</PrimaryBtn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*           MEMBER MODAL                  */
/* ═══════════════════════════════════════ */
function MemberModal({members, stats, form, setForm, getC, onAdd, onRemove, onClose}) {
  return (
    <div>
      <h2 style={{margin:"0 0 1.25rem",fontSize:20,fontWeight:800}}>가족 구성원 관리</h2>
      <div style={{marginBottom:"1.25rem",display:"flex",flexDirection:"column",gap:8}}>
        {members.map(m => {
          const c = getC(m.ci); const st = stats[m.id];
          return (
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",borderRadius:12,background:c.bg,border:`1.5px solid ${c.accent}40`}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:c.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:15,fontWeight:800,flexShrink:0}}>{m.name[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:c.text}}>{m.name}</div>
                <div style={{fontSize:12,color:c.text,opacity:0.6}}>총 {st?.total||0}회 · 이번달 {st?.month||0}회</div>
              </div>
              <button onClick={()=>onRemove(m.id)} style={{padding:"4px 10px",border:"1px solid #e0e0e0",borderRadius:7,background:"white",fontSize:12,color:"#ccc",cursor:"pointer"}}>삭제</button>
            </div>
          );
        })}
        {members.length === 0 && <div style={{fontSize:13,color:"#ccc",textAlign:"center",padding:"1rem 0"}}>아직 구성원이 없습니다</div>}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:"1.25rem"}}>
        <Inp value={form} onChange={e=>setForm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onAdd()} placeholder="이름 입력 (예: 큰아들, 작은딸)" style={{flex:1}}/>
        <PrimaryBtn onClick={onAdd}>추가</PrimaryBtn>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={onClose}>닫기</Btn></div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*            CONFIG MODAL                 */
/* ═══════════════════════════════════════ */
function ConfigModal({pf, lf, onSave, onClose}) {
  const [pv, setPv] = useState(pf);
  const [lv, setLv] = useState(lf);
  return (
    <div>
      <h2 style={{margin:"0 0 1.25rem",fontSize:20,fontWeight:800}}>앱 설정</h2>
      <div style={{marginBottom:"1rem"}}>
        <Label>환자 이름</Label>
        <Inp value={pv} onChange={e=>setPv(e.target.value)} placeholder="예: 어머니, 홍길동"/>
      </div>
      <div style={{marginBottom:"1.5rem"}}>
        <Label sub="병원 예약 페이지, 홈페이지 등">병원 / 참고 링크</Label>
        <Inp value={lv} onChange={e=>setLv(e.target.value)} placeholder="https://hospital.example.com"/>
        {lv && <a href={lv} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#378ADD",marginTop:5,display:"inline-block"}}>🔗 링크 확인</a>}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn onClick={onClose}>취소</Btn>
        <PrimaryBtn onClick={()=>onSave(pv,lv)}>저장</PrimaryBtn>
      </div>
    </div>
  );
}
