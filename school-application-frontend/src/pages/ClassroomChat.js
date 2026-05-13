import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/* ── Design tokens ── */
const T = {
  navy:'#0B1F3A', navyLight:'#1E3D6B',
  gold:'#D4A843', goldLight:'#F0C96A',
  bg:'#EEF1F8', white:'#FFFFFF',
  border:'#DDE3EE', muted:'#7A8BA0', text:'#1A2B3C',
};
const BASE = '%REACT_APP_API_URL%';

const PALETTE = ['#6C63FF','#E0457B','#0097B2','#FF6B35','#00B89F','#9B5DE5','#F97316','#0EA5E9'];
const senderColor = (name='') => {
  let h=0;
  for (let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  return PALETTE[Math.abs(h)%PALETTE.length];
};
const initials = (name='') => name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?';

/* Get logged-in student ID from JWT — reliable even if two students have same name */
const getMyId = () => {
  try { return JSON.parse(atob(localStorage.getItem('studentToken').split('.')[1])).id ?? null; }
  catch { return null; }
};

const authH = () => ({ Authorization:`Bearer ${localStorage.getItem('studentToken')}` });
const jsonH = () => ({ 'Content-Type':'application/json', ...authH() });

/* Timestamp */
const fmtTime = (iso) => {
  const d=new Date(iso), now=new Date(), ms=now-d;
  if (ms<60_000)    return 'Just now';
  if (ms<3_600_000) return `${Math.floor(ms/60_000)}m ago`;
  if (d.toDateString()===now.toDateString())
    return d.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
};

const REACTIONS = ['👍','❤️','😂','🔥','🎉','👀','😮','😢'];

export default function ClassroomChat() {
  const { classId } = useParams();
  const navigate    = useNavigate();
  const numGrade    = parseInt((classId||'').replace(/[^0-9]/g,'')) || 0;
  const myId        = getMyId();

  const [msgs,     setMsgs]     = useState([]);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState('');
  /* Reaction picker: { msgId } or null */
  const [rxPicker, setRxPicker] = useState(null);
  /* Reply state: { id, senderName, preview } or null */
  const [replyTo,  setReplyTo]  = useState(null);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const taRef     = useRef(null);
  const lastIdRef = useRef(0);

  /* ── Fetch / poll ── */
  const fetchMsgs = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/student/chat/${numGrade}`, { headers:authH() });
      if (res.status===401) { navigate('/student-login'); return; }
      if (!res.ok) return;
      const data = await res.json();
      setMsgs(data);
      const maxId = data.length ? Math.max(...data.map(m=>m.id)) : 0;
      if (maxId > lastIdRef.current) {
        lastIdRef.current = maxId;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 60);
      }
    } catch {}
  }, [numGrade, navigate]);

  useEffect(() => {
    fetchMsgs();
    const iv = setInterval(fetchMsgs, 3000);
    return () => clearInterval(iv);
  }, [fetchMsgs]);

  /* ── Resize textarea ── */
  const resize = () => {
    const el = taRef.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120)+'px';
  };

  /* ── Send ── */
  const send = useCallback(async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true); setError('');
    try {
      const body = { message: t };
      if (replyTo) body.replyToId = replyTo.id;

      const res = await fetch(`${BASE}/api/student/chat/${numGrade}`, {
        method:'POST', headers:jsonH(), body:JSON.stringify(body),
      });
      if (!res.ok) { const e=await res.json(); setError(e.message||'Failed'); setSending(false); return; }
      const msg = await res.json();
      setMsgs(prev => [...prev, msg]);
      lastIdRef.current = msg.id;
      setText(''); setReplyTo(null);
      setTimeout(() => { resize(); bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, 50);
      inputRef.current?.focus();
    } catch { setError('Network error — try again'); }
    setSending(false);
  }, [text, sending, numGrade, replyTo]);

  const handleKey = (e) => { if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } };

  /* ── React (toggle) ── */
  const react = async (msgId, emoji) => {
    setRxPicker(null);
    try {
      const res = await fetch(`${BASE}/api/student/chat/${numGrade}/react`, {
        method:'POST', headers:jsonH(), body:JSON.stringify({ messageId:msgId, emoji }),
      });
      if (res.ok) {
        const { reactions, myReactions } = await res.json();
        setMsgs(prev => prev.map(m => m.id===msgId ? {...m, reactions, myReactions} : m));
      }
    } catch {}
  };

  /* Group consecutive messages from same sender */
  const grouped = msgs.map((m,i) => ({
    ...m,
    isFirst: i===0 || msgs[i-1].senderId!==m.senderId,
    isLast:  i===msgs.length-1 || msgs[i+1].senderId!==m.senderId,
  }));

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:T.bg, fontFamily:"'DM Sans','Segoe UI',sans-serif", overflow:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *{box-sizing:border-box}
        @keyframes pop  {0%{transform:scale(.85);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
        @keyframes fade {from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin {to{transform:rotate(360deg)}}
        .bubble   {animation:pop  .22s cubic-bezier(.34,1.56,.64,1) both}
        .fade-in  {animation:fade .18s ease both}
        .back-btn {background:rgba(255,255,255,.13);border:none;border-radius:12px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;flex-shrink:0;transition:background .15s}
        .back-btn:hover{background:rgba(255,255,255,.22)}
        .msg-action{background:none;border:none;cursor:pointer;padding:3px 5px;border-radius:7px;font-size:0.9rem;opacity:0.45;transition:opacity .15s,background .15s}
        .msg-action:hover{opacity:1;background:rgba(11,31,58,.08)}
        .rx-btn{background:none;border:none;cursor:pointer;font-size:1.2rem;padding:3px 6px;border-radius:8px;transition:transform .1s}
        .rx-btn:hover{transform:scale(1.3)}
        .send-btn{transition:background .15s,transform .1s}
        .send-btn:active{transform:scale(.93)}
        textarea{font-family:inherit;resize:none}
        textarea:focus{outline:none}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#BCC8DC;border-radius:4px}
      `}</style>

      {/* ══ TOP BAR ══ */}
      <div style={{ background:T.navy, padding:'10px 16px', display:'flex', alignItems:'center', gap:12, flexShrink:0, boxShadow:'0 3px 16px rgba(11,31,58,.28)' }}>
        <button className="back-btn" onClick={()=>navigate(-1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ width:44, height:44, borderRadius:'14px', background:`linear-gradient(135deg,${T.gold},${T.goldLight})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.navy} strokeWidth="2" strokeLinecap="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:T.white, fontWeight:700, fontSize:'0.95rem', lineHeight:1.2 }}>Grade {numGrade} Chat</div>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ECCA3', flexShrink:0 }}/>
            <span style={{ color:T.goldLight, fontSize:'0.7rem', fontWeight:500 }}>Live · syncs across all devices</span>
          </div>
        </div>
        <div style={{ background:'rgba(255,255,255,.12)', borderRadius:'10px', padding:'5px 10px', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.goldLight} strokeWidth="2.2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span style={{ color:'rgba(255,255,255,.85)', fontSize:'0.72rem', fontWeight:600 }}>{msgs.length}</span>
        </div>
      </div>

      {/* ══ MESSAGES ══ */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px 6px' }}
        onClick={() => { setRxPicker(null); }}>
        {msgs.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:18, textAlign:'center', padding:'40px 24px' }}>
            <div style={{ width:90, height:90, borderRadius:'28px', background:T.navy, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="1.6" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:'1.15rem', color:T.text, marginBottom:6 }}>No messages yet</div>
              <div style={{ color:T.muted, fontSize:'0.875rem', lineHeight:1.5 }}>Be the first to say hi! 👋</div>
            </div>
            <button onClick={()=>inputRef.current?.focus()} style={{ background:T.navy, color:'white', border:'none', borderRadius:'14px', padding:'11px 28px', fontSize:'0.88rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Start the conversation ✨
            </button>
          </div>
        ) : grouped.map(m => {
          const isMe  = String(m.senderId) === String(myId);
          const color = senderColor(m.senderName);
          const ini   = initials(m.senderName);
          const rxEntries = Object.entries(m.reactions||{}).filter(([,c])=>c>0);
          const myRx = m.myReactions || [];
          const showPicker = rxPicker?.msgId === m.id;

          const r=20, s=5;
          const myRad   = `${m.isFirst?r:s}px ${r}px ${m.isLast?r:s}px ${r}px`;
          const yourRad = `${r}px ${m.isFirst?r:s}px ${r}px ${m.isLast?r:s}px`;

          return (
            <div key={m.id} className="fade-in"
              style={{ display:'flex', flexDirection:isMe?'row-reverse':'row', alignItems:'flex-end', gap:8, marginBottom:m.isLast?16:3 }}>

              {/* Avatar */}
              <div style={{ width:34, height:34, borderRadius:'11px', flexShrink:0, background:(!isMe&&m.isLast)?color:'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700, color:'white' }}>
                {!isMe&&m.isLast?ini:''}
              </div>

              <div style={{ maxWidth:'75%', display:'flex', flexDirection:'column', alignItems:isMe?'flex-end':'flex-start' }}>

                {/* Sender name */}
                {m.isFirst && !isMe && (
                  <div style={{ fontSize:'0.72rem', fontWeight:700, color, marginBottom:4, paddingLeft:2 }}>
                    {m.senderName}
                    {m.senderType==='teacher' && <span style={{ marginLeft:5, fontSize:'0.62rem', background:T.gold+'30', color:T.gold, padding:'1px 6px', borderRadius:'5px', fontWeight:800 }}>Teacher</span>}
                  </div>
                )}

                {/* Action buttons row (reply + react) */}
                <div style={{ display:'flex', alignItems:'flex-end', gap:4, flexDirection:isMe?'row-reverse':'row', position:'relative' }}>

                  {/* ── THE BUBBLE ── */}
                  <div className="bubble" style={{
                    background: isMe ? T.navyLight : T.white,
                    color:      isMe ? '#fff'       : T.text,
                    borderRadius: isMe ? myRad : yourRad,
                    padding:    '0',
                    border:     isMe ? 'none' : `1px solid ${T.border}`,
                    wordBreak:  'break-word',
                    userSelect: 'text',
                    maxWidth:   '100%',
                    overflow:   'hidden',
                  }}>

                    {/* ── REPLY QUOTE (if this message is a reply) ── */}
                    {m.replyToId && m.replyToPreview && (
                      <div style={{
                        margin: '8px 12px 0',
                        padding: '7px 10px',
                        borderRadius: '10px',
                        borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.45)' : senderColor(m.replyToSender||'')}`,
                        background: isMe ? 'rgba(255,255,255,0.12)' : 'rgba(11,31,58,0.05)',
                        cursor: 'pointer',
                      }}
                        onClick={() => {
                          // Scroll to original message
                          document.getElementById(`msg-${m.replyToId}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
                        }}
                      >
                        <div style={{ fontSize:'0.68rem', fontWeight:700, color: isMe ? 'rgba(255,255,255,0.75)' : senderColor(m.replyToSender||''), marginBottom:2 }}>
                          ↩ {m.replyToSender}
                        </div>
                        <div style={{ fontSize:'0.78rem', color: isMe ? 'rgba(255,255,255,0.65)' : T.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>
                          {m.replyToPreview}
                        </div>
                      </div>
                    )}

                    {/* ── MESSAGE TEXT ── */}
                    <div style={{ padding: m.replyToId ? '6px 12px 10px' : '9px 14px', fontSize:'0.9rem', lineHeight:1.5 }}>
                      {m.message}
                    </div>
                  </div>

                  {/* ── ACTION BUTTONS (Reply + React) ── */}
                  <div style={{ display:'flex', flexDirection:'column', gap:2, paddingBottom:2, position:'relative' }}>

                    {/* Reply button */}
                    <button className="msg-action" title="Reply"
                      onClick={(e) => { e.stopPropagation(); setReplyTo({ id:m.id, senderName:m.senderName, preview:m.message.slice(0,100) }); inputRef.current?.focus(); setRxPicker(null); }}>
                      ↩
                    </button>

                    {/* React button */}
                    <button className="msg-action" title="React"
                      onClick={(e) => { e.stopPropagation(); setRxPicker(p => p?.msgId===m.id ? null : { msgId:m.id }); }}>
                      🙂
                    </button>

                    {/* ── REACTION PICKER ── */}
                    {showPicker && (
                      <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', [isMe?'right':'left']:'calc(100% + 6px)', bottom:0, background:T.white, border:`1px solid ${T.border}`, borderRadius:'20px', padding:'6px 10px', display:'flex', gap:2, boxShadow:'0 6px 20px rgba(11,31,58,.16)', zIndex:20, whiteSpace:'nowrap' }}>
                        {REACTIONS.map(e => (
                          <button key={e} className="rx-btn"
                            style={{ background: myRx.includes(e) ? T.navy+'18' : 'none', borderRadius:8 }}
                            onClick={() => react(m.id, e)}>
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── REACTION PILLS ── */}
                {rxEntries.length > 0 && (
                  <div style={{ display:'flex', gap:4, marginTop:5, flexWrap:'wrap', justifyContent:isMe?'flex-end':'flex-start' }}>
                    {rxEntries.map(([emoji, count]) => {
                      const mine = myRx.includes(emoji);
                      return (
                        <button key={emoji}
                          onClick={() => react(m.id, emoji)}
                          style={{
                            background: mine ? T.navyLight : T.white,
                            border: `1.5px solid ${mine ? T.navyLight : T.border}`,
                            borderRadius:'12px', padding:'3px 8px',
                            fontSize:'0.8rem', cursor:'pointer',
                            display:'flex', alignItems:'center', gap:4,
                            fontFamily:'inherit', transition:'all .15s',
                          }}>
                          <span>{emoji}</span>
                          <span style={{ fontSize:'0.7rem', fontWeight:700, color: mine ? T.white : T.muted }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Timestamp */}
                {m.isLast && (
                  <div style={{ fontSize:'0.65rem', color:T.muted, marginTop:4, padding:'0 4px' }}>{fmtTime(m.createdAt)}</div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div style={{ background:'#FEE2E2', borderTop:'1px solid #FCA5A5', padding:'8px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontSize:'0.82rem', color:'#B91C1C' }}>⚠️ {error}</span>
          <button onClick={()=>setError('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#B91C1C', fontSize:'1rem' }}>✕</button>
        </div>
      )}

      {/* ── REPLY PREVIEW BAR ── */}
      {replyTo && (
        <div style={{ background:'#F0F4FF', borderTop:`2px solid ${T.navyLight}`, padding:'8px 14px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:3, alignSelf:'stretch', background:T.navyLight, borderRadius:3, flexShrink:0 }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:T.navyLight, marginBottom:2 }}>↩ Replying to {replyTo.senderName}</div>
            <div style={{ fontSize:'0.8rem', color:T.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{replyTo.preview}</div>
          </div>
          <button onClick={()=>setReplyTo(null)} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:'1.1rem', padding:'2px 6px', borderRadius:6 }}>✕</button>
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div style={{ background:T.white, borderTop:`1px solid ${T.border}`, padding:'10px 14px', display:'flex', gap:10, alignItems:'flex-end', flexShrink:0 }}>
        <div style={{ flex:1, background:'#F3F5FB', borderRadius:'20px', padding:'10px 16px', border:'1.5px solid transparent', transition:'border-color .18s', display:'flex', alignItems:'flex-end', gap:8 }}
          onFocusCapture={e=>e.currentTarget.style.borderColor=T.navyLight}
          onBlurCapture={e=>e.currentTarget.style.borderColor='transparent'}>
          <textarea
            ref={el=>{taRef.current=el; inputRef.current=el;}}
            rows={1} value={text}
            onChange={e=>{setText(e.target.value); resize();}}
            onKeyDown={handleKey}
            placeholder={replyTo ? `Reply to ${replyTo.senderName}…` : 'Message your class…  (Enter to send)'}
            style={{ flex:1, border:'none', background:'transparent', fontSize:'0.9rem', color:T.text, lineHeight:1.45, maxHeight:120, overflow:'auto', padding:0, minHeight:22 }}
          />
        </div>
        <button className="send-btn" onClick={send} disabled={!text.trim()||sending}
          style={{ width:46, height:46, borderRadius:'14px', border:'none', background:text.trim()&&!sending?T.navy:'#C8D3E4', cursor:text.trim()&&!sending?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {sending
            ? <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'white', borderRadius:'50%', animation:'spin .6s linear infinite' }}/>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          }
        </button>
      </div>

      {/* Close pickers on outside click */}
      {rxPicker && <div onClick={()=>setRxPicker(null)} style={{ position:'fixed', inset:0, zIndex:5 }}/>}
    </div>
  );
}