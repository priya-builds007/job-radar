'use strict';
// A static, read-only client. Every visible listing comes from generated JSON.
const DATA_URL = '/data/processed_jobs.json';
const $ = id => document.getElementById(id);
const controls = ['search','location','jobType','remote','period','minimum','sort'];
const buckets = ['Today','This Week','This Month','Older','Unknown date'];
let allJobs = [];

function safeLink(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? u.href : null;
  } catch { return null; }
}
function dateBucket(value, now = new Date()) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Unknown date';
  const [y,m,d] = value.split('-').map(Number);
  const day = new Date(y,m-1,d);
  if (day.getFullYear() !== y || day.getMonth() !== m-1 || day.getDate() !== d) return 'Unknown date';
  const current = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  if (day > current) return 'Unknown date';
  if (day.getTime() === current.getTime()) return 'Today';
  const monday = new Date(current);
  monday.setDate(current.getDate() - (current.getDay()+6)%7);
  if (day >= monday) return 'This Week';
  if (day.getFullYear() === current.getFullYear() && day.getMonth() === current.getMonth()) return 'This Month';
  return 'Older';
}
function element(tag, className, value) {
  const el=document.createElement(tag);
  if(className) el.className=className;
  if(value !== undefined) el.textContent=String(value);
  return el;
}
function addOptions(select, values) {
  [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b)).forEach(value=>{
    const opt=element('option','',value); opt.value=value; select.append(opt);
  });
}
function jobCard(job) {
  const card=element('article','job');
  const head=element('div','job-head');
  const top=element('div','');
  top.append(element('span','source',job.source || 'Job board'), element('h4','',job.title || 'Untitled listing'), element('p','company',job.company || 'Company not provided'));
  const score=element('div','score'); score.setAttribute('aria-label',`Fit score ${job.score} out of 100`);
  score.append(element('strong','',job.score),element('small','','FIT / 100'));
  head.append(top,score); card.append(head);
  const meta=element('div','meta');
  [job.location || 'Location not provided',job.job_type || 'Type not provided',job.is_remote===true?'Remote confirmed':'Remote not confirmed',job.date_posted?`Posted ${job.date_posted}`:'Posting date unknown'].forEach(x=>meta.append(element('span','',x)));
  card.append(meta);
  const skills=element('div','skills');
  (Array.isArray(job.matched_skills) && job.matched_skills.length ? job.matched_skills : ['No skills detected in available text']).forEach(s=>skills.append(element('span','skill',s)));
  card.append(skills);
  if(Array.isArray(job.reasons) && job.reasons.length){const why=element('ul','reasons'); job.reasons.forEach(r=>why.append(element('li','',r)));card.append(why);}
  const foot=element('div','job-foot'); foot.append(element('span','',job.date_posted?'Source date · '+job.date_posted:'Source date unavailable'));
  const link=safeLink(job.job_url);
  if(link){const a=element('a','','Open original ↗');a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',`Open original ${job.title || 'job'} listing`);foot.append(a);}
  card.append(foot); return card;
}
function render() {
  const q=$('search').value.trim().toLowerCase();
  const min=Number($('minimum').value);
  const chosen=allJobs.filter(job=>{
    const haystack=[job.title,job.company,job.location,...(job.matched_skills||[])].join(' ').toLowerCase();
    return (!q||haystack.includes(q)) && ($('location').value==='all'||job.location===$('location').value)
      && ($('jobType').value==='all'||job.job_type===$('jobType').value)
      && ($('remote').value==='all'||($('remote').value==='remote'?job.is_remote===true:job.is_remote!==true))
      && ($('period').value==='all'||dateBucket(job.date_posted)===$('period').value)
      && Number(job.score)>=min;
  });
  const dateValue=x=>x.date_posted||'0000-00-00';
  const sort=$('sort').value;
  chosen.sort((a,b)=>sort==='score'?b.score-a.score||dateValue(b).localeCompare(dateValue(a)):sort==='oldest'?dateValue(a).localeCompare(dateValue(b))||b.score-a.score:dateValue(b).localeCompare(dateValue(a))||b.score-a.score);
  $('resultCount').textContent=`${chosen.length} of ${allJobs.length} leads shown`;
  const results=$('results');results.replaceChildren();
  if(!chosen.length){const empty=element('div','empty');empty.append(element('strong','',allJobs.length?'No matching jobs':'No verified jobs yet'),element('p','',allJobs.length?'Try clearing a filter or lowering the minimum score.':'Run the crawler and processor to populate this radar with real data.'));results.append(empty);return;}
  buckets.forEach(label=>{
    const jobs=chosen.filter(x=>dateBucket(x.date_posted)===label);
    if(!jobs.length)return;
    const section=element('section','bucket');const header=element('div','bucket-header');const heading=element('h3','',label);header.append(heading,element('span','count',jobs.length));
    const cards=element('div','cards');jobs.forEach(job=>cards.append(jobCard(job)));section.append(header,cards);results.append(section);
  });
}
async function init(){
  controls.forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
  $('reset').addEventListener('click',()=>{controls.forEach(id=>{if(id==='search')$(id).value='';else $(id).selectedIndex=0;});render();$('search').focus();});
  try{
    const res=await fetch(DATA_URL,{cache:'no-store'});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const payload=await res.json();
    if(!Array.isArray(payload.jobs))throw new Error('No jobs array in data');
    allJobs=payload.jobs.filter(x=>x && x.relevant===true && safeLink(x.job_url) && Number.isFinite(x.score));
    addOptions($('location'),allJobs.map(x=>x.location));addOptions($('jobType'),allJobs.map(x=>x.job_type));
    $('total').textContent=allJobs.length;
    $('recent').textContent=allJobs.filter(x=>['Today','This Week'].includes(dateBucket(x.date_posted))).length;
    $('sources').textContent=new Set(allJobs.map(x=>x.source).filter(Boolean)).size;
    $('sourceStatus').textContent=`${allJobs.length} real leads loaded from ${new Set(allJobs.map(x=>x.source)).size} sources · posting dates shown per card`;
    if(!allJobs.length){$('notice').hidden=false;$('notice').textContent='No relevant listings in the current real-data collection. No demo jobs will be shown.';}
    render();
  }catch(err){$('sourceStatus').textContent='Job data unavailable';$('notice').hidden=false;$('notice').textContent='Could not load processed job data. Run the crawler and processor, then serve the project root with a local web server. No listings are invented as a fallback.';$('total').textContent='0';$('recent').textContent='0';$('sources').textContent='0';render();console.error('Job data load failed:',err);}
}
if(typeof document!=='undefined')init();
if(typeof module!=='undefined')module.exports={dateBucket,safeLink};
