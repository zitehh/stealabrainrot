// script.js
(function(){
  const $ = id => document.getElementById(id);

  async function fetchJSON(url){
    try{
      const r = await fetch(url);
      if(!r.ok) return { error: 'HTTP ' + r.status };
      return await r.json();
    } catch(e){
      return { error: e.message || String(e) };
    }
  }

  function ipToReverse(ip){ if(!ip) return null; if(ip.includes('.')) return ip.split('.').reverse().join('.') + '.in-addr.arpa'; return null; }

  async function measurePing(ip, timeout = 3000){
    return new Promise(res => {
      const img = new Image();
      let start = performance.now();
      let done = false;
      img.onload = () => { if(done) return; done = true; res(Math.round(performance.now() - start)); };
      img.onerror = () => { if(done) return; done = true; res(null); };
      setTimeout(()=>{ if(done) return; done = true; res(null); }, timeout);
      try { img.src = 'https://' + ip + '/favicon.ico?cache=' + Math.random(); }
      catch(e){ img.src = 'http://' + ip + '/favicon.ico?cache=' + Math.random(); }
    });
  }

  // pobierz IP i wszystkie dane; zaczynamy fetch natychmiast po załadowaniu documentu
  async function fetchAllData(){
    try{
      const ipRes = await fetchJSON('https://api.ipify.org?format=json');
      if(!ipRes || ipRes.error || !ipRes.ip) {
        return { error: 'Nie udało się pobrać publicznego IP', ipRes };
      }
      const ip = ipRes.ip;
      // równoległe pobierania szczegółów
      const ipwhoisP = fetchJSON('https://ipwhois.app/json/' + encodeURIComponent(ip));
      const rdapP = fetchJSON('https://rdap.org/ip/' + encodeURIComponent(ip));
      const [ipwhois, rdap, ping] = await Promise.all([ipwhoisP, rdapP, measurePing(ip)]);
      return { ip, ipwhois, rdap, ping };
    }catch(e){
      return { error: String(e) };
    }
  }

  // aktualizacja UI z obiektu danych
  function showData(obj){
    if(!obj || obj.error){
      $('myIp').textContent = obj && obj.ip ? obj.ip : 'Brak danych';
      $('rawResponses').textContent = obj && obj.error ? obj.error : 'Brak odpowiedzi';
      $('rawSide').textContent = $('rawResponses').textContent;
      return;
    }
    const info = obj.ipwhois || {};
    $('myIp').textContent = obj.ip || '—';
    $('country').textContent = info.country || '—';
    $('city').textContent = info.city || '—';
    $('isp').textContent = info.isp || info.org || '—';
    $('ping').textContent = obj.ping !== null ? (obj.ping + ' ms') : 'n/a';
    $('timezone').textContent = info.timezone || '—';
    $('utc').textContent = info.timezone_gmt || '—';
    $('hostname').textContent = info.reverse || '—';
    $('org').textContent = info.org || '—';
    $('currency').textContent = info.currency || '—';
    $('continent').textContent = info.continent || '—';
    $('rawResponses').textContent = JSON.stringify({ ipwhois: info, rdap: obj.rdap || null }, null, 2);
    $('rawSide').textContent = $('rawResponses').textContent;
  }

  // fake loader: animacja + jednoczesne rozpoczęcie fetchAllData
  function startFakeLoaderAndFetch(){
    const totalFiles = 100;
    let files = 0;
    const duration = 900; // min. czas loadera w ms (możesz ustawić krótszy/dłuższy)
    const interval = 20;
    const steps = Math.ceil(duration / interval);
    const incrFileEvery = Math.max(1, Math.floor(steps / totalFiles));
    const bar = $('progressBar');
    const pctEl = $('percent');
    const fileEl = $('fileCount');
    const consoleEl = $('fakeConsole');

    const lines = [
      'Sprawdzanie podpisów paczek',
      'Weryfikacja sum kontrolnych (SHA256)',
      'Pobieranie UI pakietów',
      'Ładowanie modułu sieciowego',
      'Inicjalizacja silnika renderującego',
      'Wczytywanie bazy map',
      'Aktualizacja serwerów',
      'Weryfikacja certyfikatów TLS',
      'Pobieranie brainrotów',
      'Optymalizacja tekstur',
      'Finalizacja'
    ];

    // rozpocznij fetch natychmiast
    const fetchPromise = fetchAllData();

    let step = 0;
    const t = setInterval(()=>{
      step++;
      const pct = Math.min(100, Math.round((step/steps)*100));
      if(bar) bar.style.width = pct + '%';
      if(pctEl) pctEl.textContent = pct + '%';
      if(step % incrFileEvery === 0 && files < totalFiles){
        files++;
        if(fileEl) fileEl.textContent = 'Pobrano ' + files + '/' + totalFiles;
      }
      if(Math.random() > 0.65){
        const ln = lines[Math.floor(Math.random()*lines.length)];
        consoleEl.textContent += '\n' + ln;
        consoleEl.scrollTop = consoleEl.scrollHeight;
      }
      if(step >= steps){
        clearInterval(t);
        // po minimum animacji — czekamy na fetch, ale nie dłużej niż 2s od tego momentu
        (async ()=>{
          const race = await Promise.race([
            fetchPromise,
            new Promise(resolve => setTimeout(()=>resolve({ timeout: true }), 2000))
          ]);
          // jeśli fetchPromise nie zdążył, nadal go poczekamy: await fetchPromise (co chwila uaktualni UI)
          const data = (race && race.timeout) ? await fetchPromise : race;
          // pokaż aplikację i dane
          showApp();
          showData(data);
        })();
      }
    }, interval);
  }

  function showApp(){
    const app = $('app');
    const loader = $('loader');
    if(app) app.style.visibility = 'visible';
    if(loader) loader.style.display = 'none';
  }

  // start loader + fetch natychmiast przy załadowaniu DOM
  document.addEventListener('DOMContentLoaded', function(){
    // pokaz loader (on top) i rusz fetch+animację
    const loaderEl = $('loader');
    if(loaderEl) loaderEl.style.display = 'flex';
    startFakeLoaderAndFetch();
  });

})();
