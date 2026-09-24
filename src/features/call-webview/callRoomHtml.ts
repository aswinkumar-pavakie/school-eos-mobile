// A self-contained LiveKit call room as one HTML page, meant to run inside a
// react-native-webview. It exists so video calls work in Expo Go, which
// can't load the native WebRTC module the regular call screens need
// (@livekit/react-native). The room speaks the same protocol as the native
// and website rooms, so all three can be in one call together: the same
// LiveKit room, chat over the "lk.chat" text-stream topic, and the
// "handRaised" participant attribute for raised hands.
//
// The page talks back to React Native only through
// window.ReactNativeWebView.postMessage (see WebViewCallRoom.tsx): leave,
// end (host), mute (host moderation -- the actual mute is a backend call, not
// something the page can do), error, disconnected.
//
// Names and chat text are only ever written with textContent, never
// innerHTML, so nothing a participant types can inject markup.

export type CallRoomMode = 'meeting' | 'class';

export interface CallRoomOptions {
  url: string;
  token: string;
  mode: CallRoomMode;
  /** Teacher: ends the class for everyone and can mute students. */
  canModerate: boolean;
  /** Student/parent side of a class: shows the raise-hand button. */
  canRaiseHand: boolean;
  waitingText: string;
}

// Pinned to the version this app already depends on so the page behaves the
// same as the native screens.
const LIVEKIT_CLIENT_SRC = 'https://cdn.jsdelivr.net/npm/livekit-client@2.22.3/dist/livekit-client.umd.js';

const STYLE = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;background:#0B1220;color:#fff;font-family:-apple-system,Roboto,"Segoe UI",sans-serif;overflow:hidden}
#stage{position:absolute;inset:0 0 88px 0;padding:8px}
#stage.pip .tile{display:none}
#stage.pip .tile.main{display:block;position:absolute;inset:8px;border-radius:16px}
#stage.pip .tile.self{display:block;position:absolute;right:16px;bottom:16px;width:104px;height:144px;border-radius:12px;z-index:3;box-shadow:0 4px 16px rgba(0,0,0,.5)}
#stage.grid{display:grid;gap:8px;grid-template-columns:repeat(2,1fr);grid-auto-rows:1fr;align-content:stretch}
#stage.grid.many{grid-template-columns:repeat(3,1fr)}
.tile{position:relative;background:#16213A;overflow:hidden;border:2px solid transparent;border-radius:14px}
.tile.speaking{border-color:#3DDC97}
.tile video{width:100%;height:100%;object-fit:cover;display:block;background:#000}
.tile.self video{transform:scaleX(-1)}
.tile .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;background:#16213A}
.tile .av{width:64px;height:64px;border-radius:32px;background:#2A3A5C;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;color:#BCD0F5}
.tile .nm{position:absolute;left:8px;bottom:8px;max-width:75%;padding:3px 8px;border-radius:8px;background:rgba(0,0,0,.55);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile .badges{position:absolute;right:8px;top:8px;font-size:15px}
#wait{position:absolute;left:0;right:0;top:38%;text-align:center;color:#8494AB;font-size:15px;padding:0 32px;z-index:1;pointer-events:none}
#pill{position:absolute;top:14px;left:14px;z-index:5;background:rgba(0,0,0,.55);padding:6px 11px;border-radius:999px;font-size:12.5px;font-weight:600}
#banner{position:absolute;top:50px;left:14px;right:14px;z-index:5;background:#7A3B14;color:#FFE7CF;padding:9px 12px;border-radius:10px;font-size:12.5px;line-height:1.4}
#bar{position:absolute;left:0;right:0;bottom:0;height:88px;padding-bottom:env(safe-area-inset-bottom,0);display:flex;align-items:center;justify-content:center;gap:12px;background:#0B1220}
.btn{width:52px;height:52px;border-radius:26px;border:0;background:#26344F;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;position:relative}
.btn.off{background:#5B2A2A}
.btn.on{background:#9A6A12}
.btn.leave{background:#D33F3F}
.btn .dot{position:absolute;top:8px;right:8px;width:10px;height:10px;border-radius:5px;background:#3DDC97}
#sheet{position:absolute;left:0;right:0;bottom:0;max-height:70%;z-index:10;background:#16213A;border-radius:18px 18px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom,0));display:flex;flex-direction:column;gap:10px}
#sheet[hidden]{display:none}
#sheet .hd{display:flex;align-items:center;justify-content:space-between;font-weight:700;font-size:15px}
#sheet .x{border:0;background:#26344F;color:#fff;width:30px;height:30px;border-radius:15px;font-size:15px}
.list{overflow:auto;display:flex;flex-direction:column;gap:8px;max-height:46vh}
.row{display:flex;align-items:center;gap:10px}
.row .rav{width:34px;height:34px;border-radius:17px;background:#2A3A5C;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex:0 0 34px}
.row .rnm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}
.row .rmt{border:0;background:#26344F;color:#fff;border-radius:8px;padding:7px 11px;font-size:12px;font-weight:600}
.row .rst{font-size:12px;color:#8494AB}
.msg{background:#1F2D49;border-radius:10px;padding:8px 10px;font-size:13.5px;line-height:1.4;word-break:break-word}
.msg .who{display:block;font-size:11px;color:#8FA6D4;margin-bottom:2px;font-weight:600}
.msg.mine{background:#25457F}
#chatform{display:flex;gap:8px}
#chatin{flex:1;min-width:0;border:0;border-radius:10px;padding:11px 12px;font-size:14px;background:#0B1220;color:#fff}
#chatsend{border:0;border-radius:10px;background:#3B6FE0;color:#fff;font-weight:700;padding:0 16px}
#overlay{position:absolute;inset:0;z-index:20;background:#0B1220;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;font-size:15px}
#overlay[hidden]{display:none}
`;

const SCRIPT = `
(function () {
  var CFG = __CONFIG__;
  var $ = function (id) { return document.getElementById(id); };
  function post(m) { try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} }
  window.addEventListener('error', function (e) { post({ type: 'error', message: String((e && e.message) || 'Unexpected error') }); });
  function log(m) { post({ type: 'log', message: String(m) }); }
  ['log', 'warn', 'error'].forEach(function (k) { var orig = console[k]; console[k] = function () { try { log(k + ': ' + Array.prototype.slice.call(arguments).join(' ')); } catch (e) {} if (orig) orig.apply(console, arguments); }; });
  log('page loaded');

  var LK = window.LivekitClient;
  if (!LK) { post({ type: 'error', message: 'Could not load the video engine. Check your internet connection and try again.' }); return; }

  var isClass = CFG.mode === 'class';
  var room = new LK.Room({ adaptiveStream: true, dynacast: true });
  var tiles = {};
  var audioBox = $('audio');
  var stage = $('stage');
  var chatMessages = [];
  var unread = 0;
  var panel = null;
  var handRaised = false;
  var ended = false;

  function initials(name) { return String(name || '?').trim().slice(0, 2).toUpperCase(); }
  function displayName(p) { return p.name || p.identity; }
  function allParticipants() {
    var list = [room.localParticipant];
    room.remoteParticipants.forEach(function (p) { list.push(p); });
    return list;
  }

  function makeTile(p) {
    var el = document.createElement('div'); el.className = 'tile';
    var video = document.createElement('video'); video.autoplay = true; video.playsInline = true; video.muted = true;
    var ph = document.createElement('div'); ph.className = 'ph';
    var av = document.createElement('div'); av.className = 'av';
    ph.appendChild(av);
    var nm = document.createElement('div'); nm.className = 'nm';
    var badges = document.createElement('div'); badges.className = 'badges';
    el.appendChild(video); el.appendChild(ph); el.appendChild(nm); el.appendChild(badges);
    return { el: el, video: video, ph: ph, av: av, nm: nm, badges: badges, track: null };
  }

  function cameraTrack(p) {
    var pub = p.getTrackPublication(LK.Track.Source.Camera);
    return pub && pub.track && !pub.isMuted ? pub.track : null;
  }

  function render() {
    var all = allParticipants();
    var seen = {};
    all.forEach(function (p) {
      seen[p.identity] = true;
      var t = tiles[p.identity];
      if (!t) { t = tiles[p.identity] = makeTile(p); stage.appendChild(t.el); }
      var track = cameraTrack(p);
      if (t.track !== track) {
        if (t.track) t.track.detach(t.video);
        if (track) track.attach(t.video);
        t.track = track;
      }
      t.ph.style.display = track ? 'none' : 'flex';
      t.av.textContent = initials(displayName(p));
      t.nm.textContent = displayName(p) + (p.isLocal ? ' (you)' : '');
      var badges = '';
      if (p.attributes && p.attributes.handRaised === 'true') badges += '\\u270B ';
      if (!p.isMicrophoneEnabled) badges += '\\uD83D\\uDD07';
      t.badges.textContent = badges;
      t.el.classList.toggle('self', !!p.isLocal);
      t.el.classList.toggle('speaking', !!p.isSpeaking && !p.isLocal);
    });
    Object.keys(tiles).forEach(function (id) {
      if (!seen[id]) { if (tiles[id].track) tiles[id].track.detach(tiles[id].video); tiles[id].el.remove(); delete tiles[id]; }
    });

    var remotes = all.filter(function (p) { return !p.isLocal; });
    var grid = isClass && all.length >= 3;
    stage.className = grid ? (all.length > 4 ? 'grid many' : 'grid') : 'pip';
    if (!grid) {
      Object.keys(tiles).forEach(function (id) { tiles[id].el.classList.remove('main'); });
      if (remotes[0] && tiles[remotes[0].identity]) tiles[remotes[0].identity].el.classList.add('main');
    }
    $('wait').style.display = remotes.length === 0 ? 'block' : 'none';
    $('pill').textContent = isClass ? (all.length + ' in class') : (remotes.length ? 'Connected' : 'Waiting');
    $('mic').className = 'btn' + (room.localParticipant.isMicrophoneEnabled ? '' : ' off');
    $('cam').className = 'btn' + (room.localParticipant.isCameraEnabled ? '' : ' off');
    if (panel === 'people') renderPeople();
  }

  function renderPeople() {
    var box = $('peoplelist'); box.textContent = '';
    allParticipants().forEach(function (p) {
      var row = document.createElement('div'); row.className = 'row';
      var av = document.createElement('div'); av.className = 'rav'; av.textContent = initials(displayName(p));
      var nm = document.createElement('div'); nm.className = 'rnm'; nm.textContent = displayName(p) + (p.isLocal ? ' (you)' : '');
      row.appendChild(av); row.appendChild(nm);
      if (p.attributes && p.attributes.handRaised === 'true') { var h = document.createElement('div'); h.textContent = '\\u270B'; row.appendChild(h); }
      var muted = !p.isMicrophoneEnabled;
      if (CFG.canModerate && !p.isLocal) {
        var b = document.createElement('button'); b.className = 'rmt'; b.textContent = muted ? 'Unmute' : 'Mute';
        b.onclick = function () { post({ type: 'mute', identity: p.identity, muted: !muted }); };
        row.appendChild(b);
      } else {
        var s = document.createElement('div'); s.className = 'rst'; s.textContent = muted ? 'Muted' : ''; row.appendChild(s);
      }
      box.appendChild(row);
    });
    $('peoplecount').textContent = 'In class \\u00B7 ' + allParticipants().length;
  }

  function addChat(from, text, mine) {
    chatMessages.push({ from: from, text: text, mine: mine });
    var m = document.createElement('div'); m.className = 'msg' + (mine ? ' mine' : '');
    var who = document.createElement('span'); who.className = 'who'; who.textContent = mine ? 'You' : from;
    var body = document.createElement('span'); body.textContent = text;
    m.appendChild(who); m.appendChild(body);
    var box = $('chatlist'); box.appendChild(m); box.scrollTop = box.scrollHeight;
    if (!mine && panel !== 'chat') { unread++; $('chatdot').style.display = 'block'; }
  }

  function openPanel(name) {
    panel = panel === name ? null : name;
    $('sheet').hidden = panel === null;
    $('peoplewrap').style.display = panel === 'people' ? 'flex' : 'none';
    $('chatwrap').style.display = panel === 'chat' ? 'flex' : 'none';
    if (panel === 'people') renderPeople();
    if (panel === 'chat') { unread = 0; $('chatdot').style.display = 'none'; }
  }

  function safe(fn) { return function () { try { var r = fn.apply(null, arguments); if (r && r.catch) r.catch(function () {}); } catch (e) {} }; }

  function showBanner(text) { var b = $('banner'); b.textContent = text; b.style.display = text ? 'block' : 'none'; }

  var RE = LK.RoomEvent;
  [RE.ParticipantConnected, RE.ParticipantDisconnected, RE.TrackMuted, RE.TrackUnmuted,
   RE.LocalTrackPublished, RE.LocalTrackUnpublished, RE.ParticipantAttributesChanged,
   RE.ParticipantNameChanged, RE.ActiveSpeakersChanged].forEach(function (ev) { if (ev) room.on(ev, safe(render)); });

  room.on(RE.TrackSubscribed, safe(function (track) {
    if (track.kind === 'audio') { audioBox.appendChild(track.attach()); }
    render();
  }));
  room.on(RE.TrackUnsubscribed, safe(function (track) {
    if (track.kind === 'audio') { track.detach().forEach(function (el) { el.remove(); }); }
    render();
  }));
  room.on(RE.Disconnected, function (reason) {
    var name = LK.DisconnectReason && LK.DisconnectReason[reason] !== undefined ? LK.DisconnectReason[reason] : String(reason);
    log('disconnected: ' + name);
    if (!ended) post({ type: 'disconnected', reason: name });
  });

  if (isClass) {
    if (room.registerTextStreamHandler) {
      room.registerTextStreamHandler('lk.chat', async function (reader, info) {
        var text = await reader.readAll();
        var p = room.remoteParticipants.get(info.identity);
        addChat(p ? displayName(p) : info.identity, text, false);
      });
    }
    // Older clients send chat as a JSON data-channel message instead.
    room.on(RE.DataReceived, safe(function (payload, participant, kind, topic) {
      if (topic !== 'lk.chat') return;
      var parsed = JSON.parse(new TextDecoder().decode(payload));
      if (parsed && typeof parsed.message === 'string') addChat(participant ? displayName(participant) : 'Someone', parsed.message, false);
    }));
  }

  $('mic').onclick = safe(function () { return room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled).then(render); });
  $('cam').onclick = safe(function () { return room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled).then(render); });
  $('leave').onclick = function () {
    ended = true;
    try { room.disconnect(); } catch (e) {}
    post({ type: CFG.canModerate && isClass ? 'end' : 'leave' });
  };
  if (isClass) {
    $('people').onclick = function () { openPanel('people'); };
    $('chat').onclick = function () { openPanel('chat'); };
    $('peopleclose').onclick = function () { openPanel(null); };
    $('chatclose').onclick = function () { openPanel(null); };
    $('chatform').onsubmit = function (e) {
      e.preventDefault();
      var input = $('chatin'); var text = input.value.trim(); if (!text) return;
      input.value = '';
      room.localParticipant.sendText(text, { topic: 'lk.chat' }).then(function () { addChat('You', text, true); }).catch(function () { showBanner('Message not sent.'); });
    };
    if (CFG.canRaiseHand) {
      $('hand').onclick = safe(function () {
        handRaised = !handRaised;
        $('hand').className = 'btn' + (handRaised ? ' on' : '');
        return room.localParticipant.setAttributes({ handRaised: handRaised ? 'true' : 'false' });
      });
    }
  }
  document.body.addEventListener('click', function () { try { room.startAudio(); } catch (e) {} });

  (async function () {
    log('connecting to ' + CFG.url);
    try {
      await room.connect(CFG.url, CFG.token);
    } catch (e) {
      log('connect failed: ' + (e && e.message));
      post({ type: 'error', message: 'Could not connect to the call' + (e && e.message ? ' (' + e.message + ')' : '') + '.' });
      return;
    }
    log('connected');
    $('overlay').hidden = true;
    post({ type: 'connected' });
    try { room.startAudio(); } catch (e) {}
    render();
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(true);
    } catch (e) {
      showBanner('Camera or microphone is blocked. Allow access in your phone settings to be seen and heard.');
    }
    render();
  })();
})();
`;

function buildBar(opts: CallRoomOptions): string {
  const isClass = opts.mode === 'class';
  return [
    '<button id="mic" class="btn" aria-label="Microphone">\uD83C\uDFA4</button>',
    '<button id="cam" class="btn" aria-label="Camera">\uD83D\uDCF7</button>',
    isClass ? '<button id="people" class="btn" aria-label="People">\uD83D\uDC65</button>' : '',
    isClass && opts.canRaiseHand ? '<button id="hand" class="btn" aria-label="Raise hand">\u270B</button>' : '',
    isClass ? '<button id="chat" class="btn" aria-label="Chat">\uD83D\uDCAC<span id="chatdot" class="dot" style="display:none"></span></button>' : '',
    `<button id="leave" class="btn leave" aria-label="${opts.canModerate && isClass ? 'End class' : 'Leave'}">\uD83D\uDCDE</button>`,
  ].join('');
}

const SHEET = `
<div id="sheet" hidden>
  <div id="peoplewrap" style="display:none;flex-direction:column;gap:10px">
    <div class="hd"><span id="peoplecount">In class</span><button id="peopleclose" class="x">\u2715</button></div>
    <div id="peoplelist" class="list"></div>
  </div>
  <div id="chatwrap" style="display:none;flex-direction:column;gap:10px">
    <div class="hd"><span>Class chat</span><button id="chatclose" class="x">\u2715</button></div>
    <div id="chatlist" class="list"></div>
    <form id="chatform"><input id="chatin" placeholder="Message the class" autocomplete="off" /><button id="chatsend" type="submit">Send</button></form>
  </div>
</div>`;

/** Builds the call-room page. The connection details are embedded as JSON
 * with "<" escaped so a token or name can never close the script tag. */
export function buildCallRoomHtml(opts: CallRoomOptions): string {
  const config = JSON.stringify({
    url: opts.url,
    token: opts.token,
    mode: opts.mode,
    canModerate: opts.canModerate,
    canRaiseHand: opts.canRaiseHand,
  }).replace(/</g, '\\u003c');

  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
    `<style>${STYLE}</style></head><body>`,
    '<div id="stage" class="pip"></div>',
    `<div id="wait"></div>`,
    '<div id="pill">Connecting…</div>',
    '<div id="banner" style="display:none"></div>',
    `<div id="bar">${buildBar(opts)}</div>`,
    SHEET,
    '<div id="audio" hidden></div>',
    '<div id="overlay"><div>Connecting…</div></div>',
    `<script src="${LIVEKIT_CLIENT_SRC}"></script>`,
    `<script>document.getElementById('wait').textContent=${JSON.stringify(opts.waitingText).replace(/</g, '\\u003c')};</script>`,
    `<script>${SCRIPT.replace('__CONFIG__', () => config)}</script>`,
    '</body></html>',
  ].join('');
}
