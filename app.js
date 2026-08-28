const KEY="routiny.activities.v1";
const HISTORY_KEY="routiny.history.v1";
const THEME_KEY="routiny.theme";
let activities = JSON.parse(localStorage.getItem(KEY) || "null") || [
  {id:1,name:"Shower",icon:"🚿",time:"07:30",duration:0,repeat:"Every day",repeatDays:[],reminder:10,createdDate:todayKey()},
  {id:2,name:"Reading",icon:"📖",time:"16:30",duration:30,repeat:"Every day",repeatDays:[],reminder:10,createdDate:todayKey()},
  {id:3,name:"Gym",icon:"🏋️",time:"18:00",duration:60,repeat:"Every day",repeatDays:[],reminder:10,createdDate:todayKey()},
  {id:4,name:"Tidy Room",icon:"🧹",time:"20:00",duration:20,repeat:"Every day",repeatDays:[],reminder:10,createdDate:todayKey()},
  {id:5,name:"Get Ready for Bed",icon:"🛏️",time:"21:30",duration:15,repeat:"Every day",repeatDays:[],reminder:10,createdDate:todayKey()}
];
let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null") || {};
let currentScreen="today";
let timer=null, timerState=null;
let selectedDate = new Date();

function todayKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function save(){localStorage.setItem(KEY,JSON.stringify(activities))}
function saveHistory(){localStorage.setItem(HISTORY_KEY,JSON.stringify(history))}
function record(action,id,date=todayKey()){
  history[date] ||= {};
  history[date][id]=action;
  saveHistory();
}
function isScheduled(a,d=new Date()){
  const day=d.getDay(); // 0 Sunday
  if(a.repeat==="Just today") return (a.createdDate||todayKey())===todayKey(d);
  if(a.repeat==="Every day") return true;
  if(a.repeat==="Weekdays") return day>=1 && day<=5;
  if(a.repeat==="Weekends") return day===0 || day===6;
  if(a.repeat==="Custom") return (a.repeatDays||[]).includes(String(day));
  return true;
}
function dayActivities(d=new Date()){
  const key=todayKey(d);
  return activities.filter(a=>isScheduled(a,d)).map(a=>({
    ...a,
    done: history[key]?.[a.id]==="done",
    skipped: history[key]?.[a.id]==="skipped"
  }));
}
function fmtTime(t){
  const [h,m]=t.split(":").map(Number); const d=new Date(); d.setHours(h,m,0,0);
  return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
}
function durationText(m){
  if(!m)return "No timer";
  if(m<60)return `${m} min`;
  return `${Math.floor(m/60)} hr${m>=120?"s":""}${m%60?` ${m%60} min`:""}`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function streakFor(id){
  let streak=0, d=new Date();
  for(let i=0;i<365;i++){
    const scheduled=activities.find(a=>a.id===id);
    if(!scheduled || !isScheduled(scheduled,d)) {d.setDate(d.getDate()-1);continue}
    const k=todayKey(d);
    if(history[k]?.[id]==="done") streak++;
    else break;
    d.setDate(d.getDate()-1);
  }
  return streak;
}
function dateLabel(d){
  return d.toLocaleDateString([], {weekday:"long",day:"numeric",month:"long"});
}
function render(){
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.screen===currentScreen));
  const root=document.getElementById("screen");
  if(currentScreen==="today") root.innerHTML=todayHTML();
  if(currentScreen==="schedule") root.innerHTML=scheduleHTML();
  if(currentScreen==="habits") root.innerHTML=habitsHTML();
  if(currentScreen==="stats") root.innerHTML=statsHTML();
  if(currentScreen==="more") root.innerHTML=moreHTML();
  bind();
}
function todayHTML(){
  const list=dayActivities(selectedDate);
  const done=list.filter(a=>a.done).length, pct=Math.round(done/Math.max(list.length,1)*100);
  const isToday=todayKey(selectedDate)===todayKey();
  return `<section class="hero"><h1>${isToday?"Good morning 👋":"Your day"}</h1><p>${dateLabel(selectedDate)}</p>
  <div class="quick-actions"><button id="prevDay">‹ Previous</button><button id="todayBtn">Today</button><button id="nextDay">Next ›</button></div></section>
  <div class="card progress-card"><div class="row space"><strong>${isToday?"TODAY":dateLabel(selectedDate).toUpperCase()}</strong><span>${pct}%</span></div><p class="small">${done} of ${list.length} completed</p><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>
  <div class="section-title">ACTIVITIES</div>${list.length?list.map(a=>activityCard(a,selectedDate)).join(""):`<div class="empty">No activities scheduled for this day.</div>`}`;
}
function activityCard(a,d){
  return `<div class="card activity ${a.skipped?"is-skipped":""}">
    <button class="check ${a.done?"done":""}" data-complete="${a.id}" data-date="${todayKey(d)}">${a.done?"✓":""}</button>
    <div class="emoji">${a.icon}</div><div class="activity-main">
      <div class="activity-title ${a.done?"done-text":""}">${escapeHtml(a.name)}</div>
      <div class="activity-meta">${fmtTime(a.time)}${a.duration?` · ${durationText(a.duration)}`:""}${a.skipped?" · Skipped today":""}</div>
      <div class="quick-actions">
        ${a.duration&&!a.done&&!a.skipped&&todayKey(d)===todayKey()?`<button data-start="${a.id}">▶ Start</button>`:""}
        ${!a.done&&!a.skipped&&todayKey(d)===todayKey()?`<button data-skip="${a.id}">Skip today</button>`:""}
        ${a.done&&todayKey(d)===todayKey()?`<button data-undo="${a.id}">Undo</button>`:""}
        <button data-edit="${a.id}">Edit</button>
      </div>
    </div>
  </div>`;
}
function scheduleHTML(){
  const sorted=[...dayActivities(selectedDate)].sort((a,b)=>a.time.localeCompare(b.time));
  return `<section class="hero"><h1>Schedule</h1><p>Plan your day and look ahead.</p>
  <div class="quick-actions"><button id="prevDay">‹ Previous</button><button id="todayBtn">Today</button><button id="nextDay">Next ›</button></div></section>
  <div class="card"><div class="row space"><strong>${selectedDate.toLocaleDateString([], {month:"long",year:"numeric"})}</strong><span class="badge">${selectedDate.getDate()}</span></div>
  <div class="calendar" style="margin-top:15px">${Array.from({length:7},(_,i)=>{const d=new Date(selectedDate);d.setDate(selectedDate.getDate()-selectedDate.getDay()+i);return `<div class="day ${todayKey(d)===todayKey()?"today":""}" data-caldate="${todayKey(d)}">${d.toLocaleDateString([], {weekday:"short"})}<br><b>${d.getDate()}</b></div>`}).join("")}</div></div>
  <div class="section-title">${dateLabel(selectedDate).toUpperCase()}</div>${sorted.length?sorted.map(a=>`<div class="card activity"><div class="emoji">${a.icon}</div><div class="activity-main"><div class="activity-title">${escapeHtml(a.name)}</div><div class="activity-meta">${fmtTime(a.time)}${a.duration?` · ${durationText(a.duration)}`:""} · ${escapeHtml(a.repeat)}</div></div>${a.done?`<span class="badge">Done</span>`:""}</div>`).join(""):`<div class="empty">Nothing scheduled.</div>`}`;
}
function habitsHTML(){
  return `<section class="hero"><h1>Habits</h1><p>Keep your routine going.</p></section>
  ${activities.map(a=>`<div class="card routine-card" data-edit="${a.id}"><div class="row"><div class="emoji">${a.icon}</div><div class="activity-main"><strong>${escapeHtml(a.name)}</strong><div class="activity-meta">${escapeHtml(a.repeat)} · <span class="streak">🔥 ${streakFor(a.id)} day streak</span></div></div><span>›</span></div><div class="progress-track"><div class="progress-fill" style="width:${a.repeat==="Just today"?0:Math.min(100,streakFor(a.id)*8)}%"></div></div></div>`).join("")}`;
}
function statsHTML(){
  const list=dayActivities(), done=list.filter(a=>a.done).length, pct=Math.round(done/Math.max(list.length,1)*100);
  const best=Math.max(0,...activities.map(a=>streakFor(a.id)));
  return `<section class="hero"><h1>Stats</h1><p>Your progress at a glance.</p></section>
  <div class="card" style="text-align:center"><div class="small">TODAY</div><div class="big-stat">${pct}%</div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>
  <div class="stat-grid"><div class="card"><div class="small">Completed</div><strong>${done} / ${list.length}</strong></div><div class="card"><div class="small">Best current streak</div><strong>${best} day${best===1?"":"s"} 🔥</strong></div></div>
  <div class="section-title">RECENT DAYS</div><div class="card"><div class="calendar">${Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(13-i));const l=dayActivities(d);const p=Math.round(l.filter(a=>history[todayKey(d)]?.[a.id]==="done").length/Math.max(l.length,1)*100);return `<div class="day ${todayKey(d)===todayKey()?"today":""} ${p===100&&l.length?"done":""}">${d.getDate()}<br><span class="small">${p}%</span></div>`}).join("")}</div></div>`;
}
function moreHTML(){
  return `<section class="hero"><h1>More</h1><p>Customise Routiny.</p></section>
  <div class="card"><div class="row space"><strong>🔔 Notifications</strong><span class="badge">Browser</span></div><p class="small">Browser permission can be enabled here. Full scheduled iPhone push notifications will be connected after free hosting and push setup.</p><button class="secondary" id="requestNotify">Enable Notifications</button></div>
  <div class="card"><div class="toggle-row"><strong>🌙 Dark mode</strong><button class="switch ${localStorage.getItem(THEME_KEY)==="dark"?"on":""}" id="themeToggle" aria-label="Dark mode"></button></div><p class="small">Your appearance preference is saved on this device.</p></div>
  <div class="card"><strong>About Routiny</strong><p class="small">Build routines. Stay consistent. Feel better every day.</p><span class="small">V1.2 prototype</span></div>`;
}
function bind(){
  document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>{currentScreen=b.dataset.screen;render()});
  document.querySelectorAll("[data-complete]").forEach(b=>b.onclick=()=>{
    const a=activities.find(x=>x.id==b.dataset.complete), d=b.dataset.date;
    const already=history[d]?.[a.id]==="done";
    record(already?"undone":"done",a.id,d);render();
  });
  document.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>openTimer(Number(b.dataset.start)));
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openForm(Number(b.dataset.edit)));
  document.querySelectorAll("[data-skip]").forEach(b=>b.onclick=()=>{
    record("skipped",Number(b.dataset.skip));render();toast("Skipped for today");
  });
  document.querySelectorAll("[data-undo]").forEach(b=>b.onclick=()=>{
    record("undone",Number(b.dataset.undo));render();
  });
  const rn=document.getElementById("requestNotify"); if(rn) rn.onclick=requestNotifications;
  const tt=document.getElementById("themeToggle"); if(tt) tt.onclick=toggleTheme;
  const prev=document.getElementById("prevDay"); if(prev) prev.onclick=()=>{selectedDate.setDate(selectedDate.getDate()-1);render()};
  const next=document.getElementById("nextDay"); if(next) next.onclick=()=>{selectedDate.setDate(selectedDate.getDate()+1);render()};
  const today=document.getElementById("todayBtn"); if(today) today.onclick=()=>{selectedDate=new Date();render()};
  document.querySelectorAll("[data-caldate]").forEach(b=>b.onclick=()=>{selectedDate=new Date(b.dataset.caldate+"T12:00:00");render()});
}
document.getElementById("addBtn").onclick=()=>openForm();
function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches ||
         window.navigator.standalone === true;
}

function urlBase64ToUint8Array(base64String){
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);

  return Uint8Array.from(
    [...rawData].map(char => char.charCodeAt(0))
  );
}

async function requestNotifications(){

  // iPhone/iPad check
  const isAppleDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // iPhone needs Routiny installed on the Home Screen
  if(isAppleDevice && !isStandalone()){
    toast("Open Routiny from your Home Screen first.");

    alert(
      "To enable Routiny notifications on iPhone:\n\n" +
      "1. Open Routiny in Safari\n" +
      "2. Tap Share\n" +
      "3. Tap Add to Home Screen\n" +
      "4. Open Routiny using the new Home Screen icon\n" +
      "5. Try Enable Notifications again"
    );

    return;
  }

  // Check browser support
  if(
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ){
    toast("Push notifications aren't supported here.");
    return;
  }

  // Ask iPhone for permission
  const permission = await Notification.requestPermission();

  if(permission !== "granted"){
    toast("Notification permission wasn't granted.");
    return;
  }

  try{

    const registration = await navigator.serviceWorker.ready;

    const vapidPublicKey =
      "BJ7U80oNynsBZAl7wJInEKljHMiB3_56ts0Lql6UV2lrC2Ge8-4vrDRsVsCo-FweyVuYlif1zRMZwxlc7H3iO0A";

    let subscription =
      await registration.pushManager.getSubscription();

    if(!subscription){

      subscription =
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(vapidPublicKey)
        });

    }

    // Save subscription locally for now
    localStorage.setItem(
      "routiny.pushSubscription",
      JSON.stringify(subscription)
    );
const response = await fetch(
  "https://routiny-notifications.psmithlaing.workers.dev/subscribe",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(subscription)
  }
);

if (!response.ok) {
  throw new Error("Could not register subscription with Routiny server");
}
    toast("Notifications enabled! 🔔");

    console.log("Routiny push subscription:", subscription);

  }catch(error){

    console.error(error);

    toast("Couldn't enable notifications yet.");

  }
}
function openForm(id=null){
  const a=id?activities.find(x=>x.id===id):{name:"",icon:"🏋️",time:"18:00",duration:60,repeat:"Every day",repeatDays:[],reminder:10};
  const icons=["🏋️","🚿","📖","🧹","💧","🛏️","🎮","🎸","🧘","❤️","🧠","⏰"];
  const days=[["1","M"],["2","T"],["3","W"],["4","T"],["5","F"],["6","S"],["0","S"]];
  const custom=a.repeatDays||[];
  document.getElementById("modalRoot").innerHTML=`<div class="modal-backdrop"><div class="sheet">
    <button class="close" id="closeModal">×</button><h2>${id?"Edit Activity":"Add Activity"}</h2>
    <div class="form-card">
      <div class="field"><label>Activity name</label><input id="fName" value="${escapeHtml(a.name)}" placeholder="e.g. Gym"></div>
      <div class="field"><label>Choose icon</label><div class="icon-grid">${icons.map(i=>`<button class="icon-choice ${i===a.icon?"selected":""}" data-icon="${i}">${i}</button>`).join("")}</div></div>
      <div class="field"><label>Time</label><input id="fTime" type="time" value="${a.time}"></div>
      <div class="field"><label>Duration</label><select id="fDuration"><option value="0">No timer</option>${[5,10,15,20,30,45,60,90,120].map(m=>`<option value="${m}" ${a.duration==m?"selected":""}>${durationText(m)}</option>`).join("")}</select></div>
      <div class="field"><label>Repeat</label><select id="fRepeat">${["Just today","Every day","Weekdays","Weekends","Custom"].map(x=>`<option ${a.repeat===x?"selected":""}>${x}</option>`).join("")}</select></div>
      <div class="field" id="customDaysWrap" style="display:${a.repeat==="Custom"?"block":"none"}"><label>Days</label><div class="icon-grid" style="grid-template-columns:repeat(7,1fr)">${days.map(([v,l])=>`<button class="day-choice ${custom.includes(v)?"selected":""}" data-day="${v}">${l}</button>`).join("")}</div></div>
      <div class="field"><label>Reminder</label><select id="fReminder">${[0,5,10,15,30,60].map(m=>`<option value="${m}" ${a.reminder==m?"selected":""}>${m===0?"At activity time":`${m} minute${m===1?"":"s"} before`}</option>`).join("")}</select></div>
      <div class="notice">💡 “Just today” creates a one-day activity. Recurring activities now only appear on the days they are actually scheduled.</div>
      <button class="primary" id="saveActivity">${id?"Save Changes":"Add Activity"}</button>
      ${id?`<button class="link-btn" id="deleteActivity" style="margin-top:14px;width:100%">Delete Activity</button>`:""}
    </div></div></div>`;
  document.getElementById("closeModal").onclick=closeModal;
  document.querySelectorAll("[data-icon]").forEach(btn=>btn.onclick=()=>{document.querySelectorAll("[data-icon]").forEach(x=>x.classList.remove("selected"));btn.classList.add("selected")});
  document.getElementById("fRepeat").onchange=e=>document.getElementById("customDaysWrap").style.display=e.target.value==="Custom"?"block":"none";
  document.querySelectorAll("[data-day]").forEach(btn=>btn.onclick=()=>btn.classList.toggle("selected"));
  document.getElementById("saveActivity").onclick=()=>{
    const icon=document.querySelector("[data-icon].selected")?.dataset.icon||"🏋️";
    const repeat=document.getElementById("fRepeat").value;
    const repeatDays=[...document.querySelectorAll("[data-day].selected")].map(x=>x.dataset.day);
    const old=id?activities.find(x=>x.id===id):null;
    const data={name:document.getElementById("fName").value.trim()||"Activity",icon,time:document.getElementById("fTime").value,duration:Number(document.getElementById("fDuration").value),repeat,repeatDays,reminder:Number(document.getElementById("fReminder").value),createdDate:old?.createdDate||todayKey()};
    if(id) Object.assign(old,data);
    else {data.id=Date.now();activities.push(data)}
    save();closeModal();render();
  };
  const del=document.getElementById("deleteActivity"); if(del) del.onclick=()=>{activities=activities.filter(x=>x.id!==id);save();closeModal();render()};
}
function closeModal(){document.getElementById("modalRoot").innerHTML=""}
function openTimer(id){
  const a=activities.find(x=>x.id===id); if(!a?.duration)return;
  timerState={id,total:a.duration*60,remaining:a.duration*60,running:false,startedAt:null};
  document.getElementById("modalRoot").innerHTML=`<div class="modal-backdrop"><div class="sheet">
    <button class="close" id="closeTimer">×</button><div class="timer-wrap">
      <div class="timer-title">${a.icon} ${escapeHtml(a.name)}</div><div class="timer-sub">${durationText(a.duration)}</div>
      <div class="timer-circle"><svg viewBox="0 0 245 245"><defs><linearGradient id="grad"><stop offset="0"/><stop offset="1"/></linearGradient></defs><circle class="timer-bg" cx="122.5" cy="122.5" r="108"/><circle class="timer-progress" id="timerProgress" cx="122.5" cy="122.5" r="108" stroke-dasharray="678.6" stroke-dashoffset="678.6"/></svg><div class="timer-content"><div class="timer-time" id="timerTime"></div><div class="timer-label">TIME LEFT</div></div></div>
      <div class="timer-stats"><span id="timerDone">0:00 done</span><span id="timerLeft"></span></div>
      <div class="timer-buttons"><button class="primary" id="timerToggle">▶ Start</button><button class="secondary" id="addFive">+ 5 min</button><button class="secondary" id="finishEarly">Finish Early</button></div>
    </div></div></div>`;
  document.getElementById("closeTimer").onclick=stopTimer;
  document.getElementById("timerToggle").onclick=toggleTimer;
  document.getElementById("addFive").onclick=()=>{timerState.total+=300;timerState.remaining+=300;updateTimerUI()};
  document.getElementById("finishEarly").onclick=()=>completeTimer(true);
  updateTimerUI();
}
function toggleTimer(){
  if(!timerState.running){
    timerState.running=true; timerState.startedAt=Date.now()-((timerState.total-timerState.remaining)*1000);
    document.getElementById("timerToggle").textContent="Ⅱ Pause";
    timer=setInterval(()=>{
      timerState.remaining=Math.max(0,timerState.total-Math.floor((Date.now()-timerState.startedAt)/1000));
      updateTimerUI();
      if(timerState.remaining<=0) completeTimer(false);
    },250);
  }else{
    timerState.running=false; clearInterval(timer);
    document.getElementById("timerToggle").textContent="▶ Resume";
  }
}
function updateTimerUI(){
  if(!timerState)return;
  const r=timerState.remaining, done=timerState.total-r;
  const f=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const pct=Math.max(0,Math.min(1,done/timerState.total));
  const circle=document.getElementById("timerProgress"); if(circle) circle.style.strokeDashoffset=678.6*(1-pct);
  const tt=document.getElementById("timerTime"); if(tt)tt.textContent=f(Math.max(0,r));
  const tl=document.getElementById("timerLeft"); if(tl)tl.textContent=`${f(Math.max(0,r))} left`;
  const td=document.getElementById("timerDone"); if(td)td.textContent=`${f(Math.max(0,done))} done`;
}
function completeTimer(early){
  clearInterval(timer);
  const a=activities.find(x=>x.id===timerState.id); record("done",a.id);save();
  const spent=timerState.total-timerState.remaining;
  document.getElementById("modalRoot").innerHTML=`<div class="modal-backdrop"><div class="sheet"><div class="complete"><div class="complete-icon">✓</div><h2>${early?"Session Finished":"Session Complete"} 🎉</h2><p class="small">${early?"You finished early.":"You completed your session."}</p><div class="card"><div class="small">TIME COMPLETED</div><strong>${Math.floor(spent/60)}:${String(spent%60).padStart(2,"0")}</strong></div><button class="primary" id="doneComplete">Done</button></div></div></div>`;
  document.getElementById("doneComplete").onclick=()=>{closeModal();render()};
}
function stopTimer(){clearInterval(timer);closeModal()}
function toggleTheme(){
  const dark=localStorage.getItem(THEME_KEY)!=="dark";
  localStorage.setItem(THEME_KEY,dark?"dark":"light");
  applyTheme(dark);
  render();
}
function applyTheme(dark){
  if(dark){
    document.documentElement.style.setProperty("--bg","#101014");document.documentElement.style.setProperty("--card","#1B1B21");document.documentElement.style.setProperty("--text","#F7F7FA");document.documentElement.style.setProperty("--muted","#A2A2AE");document.documentElement.style.setProperty("--line","#2B2B33");
  }else{
    document.documentElement.style.setProperty("--bg","#F7F7FA");document.documentElement.style.setProperty("--card","#FFFFFF");document.documentElement.style.setProperty("--text","#15151A");document.documentElement.style.setProperty("--muted","#777783");document.documentElement.style.setProperty("--line","#E8E8EE");
  }
}
function toast(text){const x=document.createElement("div");x.className="toast";x.textContent=text;document.body.appendChild(x);setTimeout(()=>x.remove(),2200)}

window.ROUTINY_PUSH_CONFIG = {
  vapidPublicKey: "BJ7U80oNynsBZAl7wJInEKljHMiB3_56ts0Lql6UV2lrC2Ge8-4vrDRsVsCo-FweyVuYlif1zRMZwxlc7H3iO0A"
};
applyTheme(localStorage.getItem(THEME_KEY)==="dark");

// Register the PWA service worker when served from a secure origin or localhost.
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}))}
render();
