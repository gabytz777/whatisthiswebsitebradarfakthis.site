(function() {
'use strict';

// ============================================================
// STATE STORE
// ============================================================
const store = {
  _state: {
    auth: { users: null, activeUser: null, success: false, error: null },
    boot: { backgrounds: { lock: null, login: null } },
    account: {
      settings: { background: 'd2luMTBfb2ZmaWNpYWxfd2FsbHBhcGVy.jpg' },
      taskbarApps: ['fsexplorer', 'notepad', 'google'],
      filesystem: null,
      defaultApps: { '*': 'notepad' },
    },
    memory: { appsInstances: {}, programsData: {} },
  },
  _listeners: {},
  _nextId: 1,
  getState: function() { return this._state; },
  get: function(path) {
    let val = this._state;
    path.split('.').forEach(function(k) { if (val) val = val[k]; });
    return val;
  },
  set: function(path, val) {
    var parts = path.split('.');
    var obj = this._state;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = val;
    this._notify(path, val);
  },
  subscribe: function(path, fn) {
    var id = this._nextId++;
    if (!this._listeners[path]) this._listeners[path] = {};
    this._listeners[path][id] = fn;
    return id;
  },
  unsubscribe: function(path, id) {
    if (this._listeners[path]) delete this._listeners[path][id];
  },
  _notify: function(path, val) {
    var list = this._listeners[path];
    if (list) Object.keys(list).forEach(function(k) { list[k](val); });
  },
  dispatch: function(reducer) {
    var newState = reducer(this._state);
    if (newState) {
      Object.keys(newState).forEach(function(key) {
        if (newState[key] !== undefined) {
          store._state[key] = newState[key];
          store._notify(key, newState[key]);
        }
      });
    }
  }
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
var Utils = {
  $: function(id) { return document.getElementById(id); },
  qs: function(sel, ctx) { return (ctx || document).querySelector(sel); },
  qsa: function(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); },
  escapeHtml: function(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
  formatDateTime: function(date, dateOpts, timeOpts) {
    var t = date.toLocaleTimeString([], timeOpts);
    var d = date.toLocaleDateString([], dateOpts);
    return { date: d, time: timeOpts.hour12suffix ? t : t.replace(/\s*[AP]M\s*/i, '') };
  },
  generateId: function(len) {
    len = len || 5;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
    var result = '';
    for (var i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  },
  on: function(el, evt, fn) { el.addEventListener(evt, fn); },
};

// ============================================================
// DATE/TIME HELPERS
// ============================================================
var dateOptions = { weekday: 'short', month: 'long', day: 'numeric' };
var timeOptions = { hour12: true, hour: 'numeric', minute: '2-digit', hour12suffix: true };
var clockTimer = null;

function startClock() {
  function update() {
    var now = new Date();
    var fmt = Utils.formatDateTime(now, dateOptions, timeOptions);
    var el = Utils.qs('.clockTime');
    var el2 = Utils.qs('.clockDate');
    if (el) el.textContent = fmt.time;
    if (el2) el2.textContent = fmt.date;

    var lt = Utils.qs('.lockTimeTitle');
    var ls = Utils.qs('.lockTimeSubtitle');
    if (lt) {
      var lockFmt = Utils.formatDateTime(now, { weekday: 'long', month: 'long', day: 'numeric' }, { hour12: true, hour: 'numeric', minute: '2-digit' });
      lt.textContent = lockFmt.time;
      ls.textContent = lockFmt.date;
    }
  }
  update();
  var sec = (60 - new Date().getSeconds()) * 1000;
  setTimeout(function() {
    update();
    clockTimer = setInterval(update, 60000);
  }, sec);
}

// ============================================================
// STORAGE KEYS
// ============================================================
var STORAGE = {
  USERS: 'PERSISTENT_USERS',
  ACCOUNT: function(u) { return 'ACCOUNT_DATA__' + u; },
  LOCK_BG: 'LOCK_SCREEN_BACKGROUND',
  LOGIN_BG: 'LOGIN_SCREEN_BACKGROUND',
};

// ============================================================
// WALLPAPERS
// ============================================================
var WALLPAPERS = {
  list: [
    { name: '9fa80fd805562a6bc817f01f48b8b93e.jpg', desc: 'Wharariki Beach Cave, Archway Islands' },
    { name: 'd2luMTBfb2ZmaWNpYWxfd2FsbHBhcGVy.jpg', desc: 'Windows 10 Official wallpaper' },
  ],
  defaultIdx: 1,
};

// ============================================================
// STRINGS
// ============================================================
var STRINGS = {
  INCORRECT_PASSWORD: 'The password is incorrect. Try again.',
  LOGIN_LINK_SIGNUP_VIEW: 'Or, even better, sign-in',
  SIGNUP_LINK_LOGIN_VIEW: 'Sign-up options',
  SIGNUP_NAME_VIEW_TITLE: "Who's going to use this PC?",
  SIGNUP_NAME_VIEW_SUBTITLE: 'What name do you want to use?',
  SIGNUP_PASSWORD_VIEW_TITLE: 'Create a super memorable password',
  SIGNUP_PASSWORD_VIEW_SUBTITLE: "Make sure to pick something you'll absolutely remember",
  SUCCESSFUL_LOGIN_WELCOME_TEXT: 'Welcome',
  TASKBAR_SEARCH_PLACEHOLDER: 'Type here to search',
  PC_FILESYSTEM_ROOT_NAME: 'MY PC',
};

// ============================================================
// USER MANAGEMENT
// ============================================================
var UserManager = {
  getUsers: function() {
    var data = localStorage.getItem(STORAGE.USERS);
    return data ? JSON.parse(data) : [];
  },
  saveUsers: function(users) {
    localStorage.setItem(STORAGE.USERS, JSON.stringify(users));
  },
  publicUser: function(user) {
    return { name: user.name, username: user.username };
  },
  createUser: function(name, username, password) {
    var users = this.getUsers();
    users.push({ name: name, username: username, password: password });
    this.saveUsers(users);
    return users;
  },
  authenticate: function(index, password) {
    var users = this.getUsers();
    return users[index] && users[index].password === password;
  },
  getAccount: function(username) {
    var data = localStorage.getItem(STORAGE.ACCOUNT(username));
    return data ? JSON.parse(data) : null;
  },
  saveAccount: function(username, state) {
    localStorage.setItem(STORAGE.ACCOUNT(username), JSON.stringify(state));
  },
};

// ============================================================
// FILE SYSTEM
// ============================================================
var FileSystem = {
  makeNode: function(name, isDir, parent, children, mTime, id) {
    var time = mTime || Date.now();
    var node = {
      id: id || Utils.generateId(),
      name: isDir ? name : (name.indexOf('.') !== -1 ? name.substring(0, name.lastIndexOf('.')) : name),
      extension: (!isDir && name.indexOf('.') !== -1) ? name.substring(name.lastIndexOf('.') + 1) : '',
      isDir: isDir,
      modifiedTime: time,
      createdTime: time,
    };
    return { node: node, parent: parent, children: children || [] };
  },
  initFs: function() {
    var root = this.makeNode('', true, null, ['C:', 'D:'], null, '_root');
    var cDrive = this.makeNode('Local Drive (C:)', true, '_root', [], null, 'C:');
    var dDrive = this.makeNode('Local Drive (D:)', true, '_root', [], null, 'D:');
    var fs = {};
    fs['_root'] = root;
    fs['C:'] = cDrive;
    fs['D:'] = dDrive;
    return fs;
  },
  getChildren: function(fs, parentId) {
    if (!fs[parentId]) return [];
    return fs[parentId].children.map(function(id) { return fs[id]; });
  },
  getChildNodes: function(fs, parentId) {
    if (!fs[parentId]) return [];
    return fs[parentId].children.map(function(id) { return fs[id] ? fs[id].node : null; }).filter(Boolean);
  },
  createItem: function(fs, name, isDir, parentId) {
    var newNode = this.makeNode(name, isDir, parentId);
    var newFs = JSON.parse(JSON.stringify(fs));
    newFs[newNode.node.id] = newNode;
    if (newFs[parentId]) newFs[parentId].children = newFs[parentId].children.concat([newNode.node.id]);
    return newFs;
  },
  renameItem: function(fs, id, newName) {
    var newFs = JSON.parse(JSON.stringify(fs));
    if (newFs[id]) {
      newFs[id].node.name = newName;
    }
    return newFs;
  },
  deleteItems: function(fs, parentId, ids) {
    var newFs = JSON.parse(JSON.stringify(fs));
    if (newFs[parentId]) {
      newFs[parentId].children = newFs[parentId].children.filter(function(cId) { return ids.indexOf(cId) === -1; });
    }
    ids.forEach(function(id) { delete newFs[id]; });
    return newFs;
  },
  copyItems: function(fs, toParentId, itemIds) {
    var newFs = JSON.parse(JSON.stringify(fs));
    var toParent = newFs[toParentId];
    if (!toParent) return newFs;
    itemIds.forEach(function(id) {
      if (newFs[id]) {
        var orig = newFs[id];
        var newId = Utils.generateId();
        var copy = JSON.parse(JSON.stringify(orig));
        copy.node.id = newId;
        copy.node.name = orig.node.name + ' - Copy';
        copy.parent = toParentId;
        newFs[newId] = copy;
        toParent.children.push(newId);
      }
    });
    return newFs;
  },
  moveItems: function(fs, fromParentId, toParentId, itemIds) {
    if (fromParentId === toParentId) return JSON.parse(JSON.stringify(fs));
    var newFs = JSON.parse(JSON.stringify(fs));
    if (newFs[fromParentId]) {
      newFs[fromParentId].children = newFs[fromParentId].children.filter(function(cId) { return itemIds.indexOf(cId) === -1; });
    }
    itemIds.forEach(function(id) {
      if (newFs[id]) newFs[id].parent = toParentId;
    });
    if (newFs[toParentId]) {
      newFs[toParentId].children = newFs[toParentId].children.concat(itemIds);
    }
    return newFs;
  },
};

// ============================================================
// APP DEFINITIONS
// ============================================================
var APP_ICONS = {
  calculator: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3h2v2h-2V6zm-4 0h2v2H8V6zm0 4h2v2H8v-2zm4 0h2v2h-2v-2zm-4 4h2v2H8v-2zm4 0h2v2h-2v-2zm4-8h2v2h-2V6zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>',
  explorer: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>',
  google: '<svg viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>',
  notepad: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-3 16H7v-2h4v2zm6-4H7v-2h10v2zm0-4h-4V4h4v6z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
  paint: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4V3c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V6h1v4H9v11c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-9h8V4h-3z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
  stopwatch: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67zM17 1.01l-1.41 1.41 3.54 3.54 1.41-1.41L17 1.01z"/></svg>',
  notes: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z"/></svg>',
  terminal: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6.41 8.59L10.83 12l-4.42 4.42L8 17.83 13.17 12 8 6.17 6.41 7.59zM18 15h-6v2h6v-2z"/></svg>',
  snake: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h-2v6h2V7zm0 8h-2v2h2v-2z"/></svg>',
  weather: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>',
  music: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
  tictactoe: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h2v2H7V7zm4 0h2v2h-2V7zm4 0h2v2h-2V7zM7 11h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 15h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/></svg>',
  about: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
};

var InstalledApps = {
  calculator: {
    id: 'calculator', name: 'Calculator', icon: APP_ICONS.calculator,
    config: { initWindowWidth: '320px', initWindowHeight: '480px' },
    render: function(win) { renderCalculator(win); },
  },
  calendar: {
    id: 'calendar', name: 'Calendar', icon: APP_ICONS.calendar,
    render: function(win) { renderCalendar(win); },
  },
  fsexplorer: {
    id: 'fsexplorer', name: 'File Explorer', icon: APP_ICONS.explorer,
    perms: { OPEN_DOCUMENT: true },
    render: function(win) { renderExplorer(win); },
  },
  google: {
    id: 'google', name: 'Google', icon: APP_ICONS.google,
    config: { initWindowWidth: '800px', initWindowHeight: '600px' },
    render: function(win) { renderGoogle(win); },
  },
  notepad: {
    id: 'notepad', name: 'Notepad', icon: APP_ICONS.notepad,
    config: { initTitle: 'Untitled - Notepad', initWindowWidth: '480px', initWindowHeight: '480px' },
    render: function(win) { renderNotepad(win); },
  },
  settings: {
    id: 'settings', name: 'Settings', icon: APP_ICONS.settings,
    render: function(win) { renderSettings(win); },
  },
  paint: {
    id: 'paint', name: 'Paint', icon: APP_ICONS.paint,
    config: { initWindowWidth: '600px', initWindowHeight: '480px' },
    render: function(win) { renderPaint(win); },
  },
  clock: {
    id: 'clock', name: 'Clock', icon: APP_ICONS.clock,
    config: { initWindowWidth: '320px', initWindowHeight: '360px' },
    render: function(win) { renderClock(win); },
  },
  stopwatch: {
    id: 'stopwatch', name: 'Stopwatch', icon: APP_ICONS.stopwatch,
    config: { initWindowWidth: '320px', initWindowHeight: '360px' },
    render: function(win) { renderStopwatch(win); },
  },
  notes: {
    id: 'notes', name: 'Notes', icon: APP_ICONS.notes,
    config: { initWindowWidth: '400px', initWindowHeight: '400px' },
    render: function(win) { renderNotes(win); },
  },
  terminal: {
    id: 'terminal', name: 'Terminal', icon: APP_ICONS.terminal,
    config: { initWindowWidth: '600px', initWindowHeight: '400px' },
    render: function(win) { renderTerminal(win); },
  },
  snake: {
    id: 'snake', name: 'Snake', icon: APP_ICONS.snake,
    config: { initWindowWidth: '320px', initWindowHeight: '420px' },
    render: function(win) { renderSnake(win); },
  },
  weather: {
    id: 'weather', name: 'Weather', icon: APP_ICONS.weather,
    config: { initWindowWidth: '360px', initWindowHeight: '400px' },
    render: function(win) { renderWeather(win); },
  },
  music: {
    id: 'music', name: 'Music', icon: APP_ICONS.music,
    config: { initWindowWidth: '400px', initWindowHeight: '400px' },
    render: function(win) { renderMusic(win); },
  },
  tictactoe: {
    id: 'tictactoe', name: 'Tic Tac Toe', icon: APP_ICONS.tictactoe,
    config: { initWindowWidth: '320px', initWindowHeight: '400px' },
    render: function(win) { renderTicTacToe(win); },
  },
  about: {
    id: 'about', name: 'About', icon: APP_ICONS.about,
    config: { initWindowWidth: '400px', initWindowHeight: '320px' },
    render: function(win) { renderAbout(win); },
  },
};

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
var currentScreen = null;
var zIndexCounter = 100;
var programCounter = 0;
var windows = {};

function showScreen(id) {
  var screens = ['bootScreen', 'lockScreen', 'loginScreen', 'newAccountScreen', 'desktop', 'loadingOverlay'];
  screens.forEach(function(s) {
    var el = Utils.$(s);
    if (el) el.classList.toggle('hidden', s !== id);
  });
  currentScreen = id;
}

// ============================================================
// BOOT SEQUENCE
// ============================================================
function startBootSequence() {
  showScreen('bootScreen');
  setTimeout(function() {
    store.set('boot.backgrounds.lock', WALLPAPERS.list[0].name);
    store.set('boot.backgrounds.login', WALLPAPERS.list[WALLPAPERS.defaultIdx].name);
    showLockScreen();
  }, 3000);
}

// ============================================================
// LOCK SCREEN
// ============================================================
function showLockScreen() {
  var bg = store.get('boot.backgrounds.lock');
  var el = Utils.$('lockScreen');
  if (bg) el.style.backgroundImage = 'url(public/images/' + bg + ')';
  el.style.opacity = 1;
  showScreen('lockScreen');
  el.onclick = function() {
    var users = UserManager.getUsers();
    if (users.length > 0) {
      showLoginScreen();
    } else {
      showNewAccountScreen();
    }
  };
}

// ============================================================
// LOGIN SCREEN
// ============================================================
var loginSelectedUser = 0;

function showLoginScreen() {
  var bg = store.get('boot.backgrounds.login');
  Utils.$('loginBg').style.backgroundImage = 'url(public/images/' + bg + ')';
  var users = UserManager.getUsers();
  var publicUsers = users.map(function(u) { return UserManager.publicUser(u); });
  store.set('auth.users', publicUsers);
  loginSelectedUser = 0;
  renderLoginView(publicUsers);
  showScreen('loginScreen');
}

function renderLoginView(users) {
  var user = users[loginSelectedUser] || users[0];
  Utils.$('loginUsername').textContent = user.name;
  Utils.$('loginPassword').value = '';
  Utils.$('loginFeedback').innerHTML = '';

  // User list
  var list = Utils.$('loginUserList');
  list.innerHTML = '';
  if (users.length > 1) {
    users.forEach(function(u, i) {
      var item = document.createElement('div');
      item.className = 'loginUserListItem' + (i === loginSelectedUser ? ' active' : '');
      item.innerHTML = '<div class="loginUserListItemPfp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div><span>' + Utils.escapeHtml(u.name) + '</span>';
      item.onclick = function() { loginSelectedUser = i; renderLoginView(users); };
      list.appendChild(item);
    });
  }

  // Password input
  var pwInput = Utils.$('loginPassword');
  Utils.$('loginArrow').onclick = function() { doLogin(users); };
  pwInput.onkeyup = function(e) { if (e.key === 'Enter') doLogin(users); };

  // Eye toggle
  Utils.$('loginEye').onmousedown = function() { pwInput.type = 'text'; };
  Utils.$('loginEye').onmouseup = function() { pwInput.type = 'password'; };
  Utils.$('loginEye').onmouseleave = function() { pwInput.type = 'password'; };

  // Signup link
  Utils.$('loginSignupLink').onclick = function(e) { e.preventDefault(); showNewAccountScreen(); };
}

function doLogin(users) {
  var pw = Utils.$('loginPassword').value;
  if (UserManager.authenticate(loginSelectedUser, pw)) {
    var user = UserManager.publicUser(users[loginSelectedUser]);
    store.set('auth.activeUser', user);
    store.set('auth.success', true);
    var fb = Utils.$('loginFeedback');
    fb.innerHTML = '<div class="loginSuccess"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><span>' + STRINGS.SUCCESSFUL_LOGIN_WELCOME_TEXT + '</span></div>';
    setTimeout(function() { enterDesktop(user); }, 2000);
  } else {
    var err = { text: STRINGS.INCORRECT_PASSWORD, id: Date.now() };
    Utils.$('loginFeedback').innerHTML = '<div class="loginError"><span>' + err.text + '</span><button class="Button" style="background:rgba(255,255,255,0.2);border:2px solid white">OK</button></div>';
    Utils.qs('.loginError button').onclick = function() {
      Utils.$('loginFeedback').innerHTML = '';
      Utils.$('loginPassword').value = '';
    };
  }
}

// ============================================================
// NEW ACCOUNT
// ============================================================
var naStep = 0;

function showNewAccountScreen() {
  naStep = 0;
  Utils.$('naBackBtn').classList.add('hidden');
  Utils.$('naView1').classList.remove('hidden');
  Utils.$('naView2').classList.add('hidden');
  Utils.$('naView3').classList.add('hidden');
  Utils.$('naView1').style.opacity = 0;
  Utils.$('naName').value = '';
  Utils.$('naPassword').value = '';

  var users = UserManager.getUsers();
  var signinOpt = Utils.$('naSigninOpt');
  signinOpt.style.display = users.length > 0 ? '' : 'none';
  Utils.$('naSigninLink').onclick = function(e) { e.preventDefault(); showLoginScreen(); };

  Utils.$('naNext1').disabled = true;
  Utils.$('naNext2').disabled = true;

  setupNewAccountEvents();
  showScreen('newAccountScreen');
  setTimeout(function() { Utils.$('naView1').style.opacity = 1; }, 50);
}

function setupNewAccountEvents() {
  var nameInput = Utils.$('naName');
  nameInput.oninput = function() {
    Utils.$('naNext1').disabled = !nameInput.value.trim() || isUsernameTaken(nameInput.value.trim());
  };
  Utils.$('naNext1').onclick = function() { goToPasswordStep(); };
  nameInput.onkeyup = function(e) { if (e.key === 'Enter' && !Utils.$('naNext1').disabled) goToPasswordStep(); };

  var pwInput = Utils.$('naPassword');
  pwInput.oninput = function() { Utils.$('naNext2').disabled = !pwInput.value.trim(); };
  Utils.$('naNext2').onclick = function() { finishAccountSetup(); };
  pwInput.onkeyup = function(e) { if (e.key === 'Enter' && !Utils.$('naNext2').disabled) finishAccountSetup(); };

  Utils.$('naBackBtn').onclick = function() { goBackAccountStep(); };
}

function isUsernameTaken(name) {
  var users = UserManager.getUsers();
  return users.some(function(u) { return u.username.toLowerCase() === name.toLowerCase(); });
}

function goToPasswordStep() {
  naStep = 1;
  Utils.$('naBackBtn').classList.remove('hidden');
  Utils.$('naView1').classList.add('hidden');
  Utils.$('naView2').classList.remove('hidden');
  Utils.$('naView2').style.opacity = 0;
  setTimeout(function() { Utils.$('naView2').style.opacity = 1; }, 50);
  Utils.$('naPassword').focus();
}

function goBackAccountStep() {
  if (naStep === 1) {
    naStep = 0;
    Utils.$('naBackBtn').classList.add('hidden');
    Utils.$('naView2').classList.add('hidden');
    Utils.$('naView1').classList.remove('hidden');
    setTimeout(function() { Utils.$('naView1').style.opacity = 1; }, 50);
  }
}

function finishAccountSetup() {
  naStep = 2;
  Utils.$('naView2').classList.add('hidden');
  Utils.$('naView3').classList.remove('hidden');
  var name = Utils.$('naName').value.trim();
  var pw = Utils.$('naPassword').value.trim();
  UserManager.createUser(name, name, pw);
  setTimeout(function() {
    var users = UserManager.getUsers();
    var publicUsers = users.map(function(u) { return UserManager.publicUser(u); });
    store.set('auth.users', publicUsers);
    showLoginScreen();
  }, 2000);
}

// ============================================================
// DESKTOP
// ============================================================
var startMenuOpen = false;

function enterDesktop(user) {
  store.set('auth.success', false);
  var username = user.username;
  var account = UserManager.getAccount(username);
  var defaults = store.get('account');
  if (account) {
    store.set('account.settings', account.settings || defaults.settings);
    var savedApps = account.taskbarApps || [];
    var defaultApps = defaults.taskbarApps || [];
    var merged = defaultApps.slice();
    savedApps.forEach(function(a) { if (merged.indexOf(a) === -1) merged.push(a); });
    store.set('account.taskbarApps', merged);
    store.set('account.filesystem', account.filesystem || FileSystem.initFs());
    store.set('account.defaultApps', account.defaultApps || defaults.defaultApps);
  } else {
    store.set('account.filesystem', FileSystem.initFs());
  }
  store.set('memory.appsInstances', {});
  store.set('memory.programsData', {});

  renderDesktop();
  showScreen('desktop');
}

function renderDesktop() {
  var bg = store.get('account.settings.background');
  Utils.$('desktopWallpaper').style.backgroundImage = 'url(public/images/' + bg + ')';
  renderTaskbar();
  renderStartMenu();
}

// ============================================================
// TASKBAR
// ============================================================
function renderTaskbar() {
  var container = Utils.$('taskbarApps');
  container.innerHTML = '';
  var apps = store.get('account.taskbarApps') || [];
  apps.forEach(function(appId) {
    var app = InstalledApps[appId];
    if (!app) return;
    var el = document.createElement('div');
    el.className = 'taskbarApp';
    el.title = app.name;
    el.innerHTML = app.icon;
    el.onclick = function() { launchProgram(appId); };
    container.appendChild(el);
  });
  updateTaskbarInstances();
}

function updateTaskbarInstances() {
  var appsInstances = store.get('memory.appsInstances') || {};
  var programsData = store.get('memory.programsData') || {};
  var apps = store.get('account.taskbarApps') || [];

  // Add running app IDs not in taskbarApps
  var allAppIds = apps.slice();
  Object.keys(appsInstances).forEach(function(id) {
    if (allAppIds.indexOf(id) === -1) allAppIds.push(id);
  });

  var container = Utils.$('taskbarApps');
  container.innerHTML = '';

  allAppIds.forEach(function(appId) {
    var app = InstalledApps[appId];
    if (!app) return;
    var instances = appsInstances[appId] || [];
    var el = document.createElement('div');
    el.className = 'taskbarApp' + (instances.length > 0 ? ' running' : '');
    el.title = app.name;
    el.innerHTML = app.icon;

    if (instances.length > 0) {
      // Show instance list
      var list = document.createElement('div');
      list.className = 'taskbarAppInstanceList';
      instances.forEach(function(pid) {
        var data = programsData[pid];
        if (!data) return;
        var item = document.createElement('div');
        item.className = 'taskbarAppInstance';
        item.innerHTML = '<span class="taskbarAppInstanceTitle">' + Utils.escapeHtml(data.title || app.name) + '</span><span class="taskbarAppInstanceClose"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></span>';
        item.onclick = function(e) { e.stopPropagation(); focusWindow(pid); };
        Utils.qs('.taskbarAppInstanceClose', item).onclick = function(e) {
          e.stopPropagation();
          closeWindow(pid);
        };
        list.appendChild(item);
      });
      el.appendChild(list);
      el.onclick = function() {
        if (instances.length > 0) focusWindow(instances[instances.length - 1]);
        else launchProgram(appId);
      };
    } else {
      el.onclick = function() { launchProgram(appId); };
    }
    container.appendChild(el);
  });
}

// ============================================================
// START MENU
// ============================================================
function renderStartMenu() {
  var appsContainer = Utils.$('smApps');
  appsContainer.innerHTML = '';

  var appIds = Object.keys(InstalledApps);
  appIds.sort();
  appIds.forEach(function(id) {
    var app = InstalledApps[id];
    var item = document.createElement('div');
    item.className = 'smAppCategoryItem';
    item.innerHTML = '<div class="smAppIcon">' + app.icon + '</div><span class="smAppName">' + app.name + '</span>';
    item.onclick = function() {
      toggleStartMenu(false);
      launchProgram(app.id);
    };
    appsContainer.appendChild(item);
  });

  // Drawer toggle
  var drawer = Utils.$('smDrawer');
  Utils.$('smDrawerToggle').onclick = function() {
    drawer.classList.toggle('open');
  };

  // Drawer items
  Utils.qsa('.smDrawerItem[data-app]').forEach(function(el) {
    el.onclick = function() {
      toggleStartMenu(false);
      launchProgram(el.getAttribute('data-app'));
    };
  });

  // Logout
  Utils.$('smLogout').onclick = function() {
    toggleStartMenu(false);
    doLogout();
  };

  // Windows icon in taskbar
  Utils.$('taskbarWindowsIcon').onclick = function() {
    toggleStartMenu();
  };
}

// ============================================================
// PROMOTIONS
// ============================================================
var Promotions = [];



function toggleStartMenu(forceState) {
  if (forceState !== undefined) {
    startMenuOpen = forceState;
  } else {
    startMenuOpen = !startMenuOpen;
  }
  Utils.$('startMenu').classList.toggle('hidden', !startMenuOpen);
}

// ============================================================
// LOGOUT
// ============================================================
function doLogout() {
  var activeUser = store.get('auth.activeUser');
  if (activeUser) {
    var username = activeUser.username;
    var accountState = {
      settings: store.get('account.settings'),
      taskbarApps: store.get('account.taskbarApps'),
      filesystem: store.get('account.filesystem'),
      defaultApps: store.get('account.defaultApps'),
    };
    UserManager.saveAccount(username, accountState);
  }
  store.set('auth.activeUser', null);
  store.set('auth.success', false);
  store.set('auth.error', null);
  store.set('memory.appsInstances', {});
  store.set('memory.programsData', {});
  windows = {};
  zIndexCounter = 100;

  // Clear program container
  Utils.$('programContainer').innerHTML = '';

  showScreen('loadingOverlay');
  setTimeout(function() {
    showLoginScreen();
  }, 1500);
}

// ============================================================
// WINDOW MANAGEMENT
// ============================================================
function launchProgram(appId, metadata) {
  var app = InstalledApps[appId];
  if (!app) return;

  var pid = 'p' + (programCounter++) + '_' + Date.now() + '_' + Math.floor(Math.random() * 100);
  var title = (metadata && metadata.title) || (app.config && app.config.initTitle) || app.name;
  var programData = {
    pId: pid,
    id: appId,
    title: title,
    name: app.name,
    icon: app.icon,
    config: app.config,
    perms: app.perms,
    render: app.render,
    docId: metadata && metadata.docId,
  };

  var programsData = store.get('memory.programsData') || {};
  programsData[pid] = programData;
  store.set('memory.programsData', programsData);

  var appsInstances = store.get('memory.appsInstances') || {};
  if (!appsInstances[appId]) appsInstances[appId] = [];
  appsInstances[appId].push(pid);
  store.set('memory.appsInstances', appsInstances);

  createWindow(programData);
  updateTaskbarInstances();
}

function createWindow(data) {
  var template = Utils.$('programTemplate');
  var clone = template.cloneNode(true);
  clone.classList.remove('hidden');
  clone.setAttribute('data-pid', data.pId);

  var initW = data.config && data.config.initWindowWidth ? parseInt(data.config.initWindowWidth) : 640;
  var initH = data.config && data.config.initWindowHeight ? parseInt(data.config.initWindowHeight) : 480;
  var vpW = window.innerWidth;
  var vpH = window.innerHeight - 48;
  var left = Math.max(0, (vpW - initW) * 0.25);
  var top = Math.max(0, (vpH - initH) * 0.25);

  clone.style.width = initW + 'px';
  clone.style.height = initH + 'px';
  clone.style.left = left + 'px';
  clone.style.top = top + 'px';
  clone.style.zIndex = ++zIndexCounter;

  // Title bar
  var tb = Utils.qs('.programTitleBar', clone);
  tb.setAttribute('data-pid', data.pId);
  var iconEl = Utils.qs('.titleBarIcon', clone);
  iconEl.innerHTML = data.icon;
  Utils.qs('.titleBarTitle', clone).textContent = data.title;

  // Buttons
  var minimizeBtn = Utils.qs('.minimizeBtn', clone);
  var maximizeBtn = Utils.qs('.maximizeBtn', clone);
  var closeBtn = Utils.qs('.closeBtn', clone);

  minimizeBtn.onclick = function() { minimizeWindow(data.pId); };
  maximizeBtn.onclick = function() { toggleMaximizeWindow(data.pId); };
  closeBtn.onclick = function() { closeWindow(data.pId); };

  // Click to focus
  clone.onmousedown = function() { focusWindow(data.pId); };

  // Drag
  makeDraggable(clone, tb);

  // Render app
  var body = Utils.qs('.programBody', clone);
  data._body = body;
  data._el = clone;

  Utils.$('programContainer').appendChild(clone);
  windows[data.pId] = data;

  if (data.render) data.render(data);

  updateTaskbarInstances();
}

function makeDraggable(el, handle) {
  var dragging = false, startX, startY, origLeft, origTop;
  handle.onmousedown = function(e) {
    if (e.target.closest('.titleBarButtons')) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origLeft = parseInt(el.style.left) || 0;
    origTop = parseInt(el.style.top) || 0;
    e.preventDefault();
  };
  document.onmousemove = function(e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    var vpW = window.innerWidth;
    var vpH = window.innerHeight - 48;
    el.style.left = Math.max(0, Math.min(vpW - 100, origLeft + dx)) + 'px';
    el.style.top = Math.max(0, Math.min(vpH - 40, origTop + dy)) + 'px';
  };
  document.onmouseup = function() { dragging = false; };
}

function focusWindow(pid) {
  if (!windows[pid]) return;
  var el = windows[pid]._el;
  if (el) {
    el.style.zIndex = ++zIndexCounter;
  }
}

function minimizeWindow(pid) {
  if (!windows[pid]) return;
  var el = windows[pid]._el;
  if (el) el.classList.add('hidden');
}

function toggleMaximizeWindow(pid) {
  if (!windows[pid]) return;
  var el = windows[pid]._el;
  if (!el) return;
  var data = windows[pid];
  if (data._isMaximized) {
    el.style.left = data._restoreLeft || '10%';
    el.style.top = data._restoreTop || '10%';
    el.style.width = data._restoreWidth || '640px';
    el.style.height = data._restoreHeight || '480px';
    data._isMaximized = false;
  } else {
    data._restoreLeft = el.style.left;
    data._restoreTop = el.style.top;
    data._restoreWidth = el.style.width;
    data._restoreHeight = el.style.height;
    el.style.left = '0';
    el.style.top = '0';
    el.style.width = '100%';
    el.style.height = '100%';
    data._isMaximized = true;
  }
}

function closeWindow(pid) {
  if (!windows[pid]) return;
  var data = windows[pid];
  var el = data._el;
  if (el) el.remove();
  delete windows[pid];

  var programsData = store.get('memory.programsData') || {};
  delete programsData[pid];
  store.set('memory.programsData', programsData);

  var appsInstances = store.get('memory.appsInstances') || {};
  var appId = data.id;
  if (appsInstances[appId]) {
    appsInstances[appId] = appsInstances[appId].filter(function(p) { return p !== pid; });
    if (appsInstances[appId].length === 0) delete appsInstances[appId];
  }
  store.set('memory.appsInstances', appsInstances);

  updateTaskbarInstances();
}

// ============================================================
// APP RENDERERS
// ============================================================

// --- EXPLORER ---
function renderExplorer(win) {
  var body = win._body;
  var currentDir = '_root';
  var selectedItems = [];
  var clipboard = { mode: -1, items: [] };
  var createMode = false;
  var renameMode = false;

  var fs = store.get('account.filesystem') || FileSystem.initFs();

  function getChildren(parentId) {
    return FileSystem.getChildNodes(fs, parentId);
  }

  function render() {
    body.innerHTML = '';

    // Ribbon
    var ribbon = document.createElement('div');
    ribbon.className = 'ExplorerRibbon';
    ribbon.innerHTML =
      '<div class="ExplorerRibbonCategory">' +
        '<div class="ExplorerRibbonButtons">' +
          '<div class="ExplorerRibbonBtn" data-action="copy"><div class="ExplorerRibbonBtnIcon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></div><span>Copy</span></div>' +
          '<div class="ExplorerRibbonBtn" data-action="paste"><div class="ExplorerRibbonBtnIcon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg></div><span>Paste</span></div>' +
          '<div class="ExplorerRibbonBtn" data-action="cut"><div class="ExplorerRibbonBtnIcon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5z"/></svg></div><span>Cut</span></div>' +
        '</div><div class="ExplorerRibbonLabel">Clipboard</div>' +
      '</div>' +
      '<div class="ExplorerRibbonCategory">' +
        '<div class="ExplorerRibbonButtons">' +
          '<div class="ExplorerRibbonBtn" data-action="delete"><div class="ExplorerRibbonBtnIcon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></div><span>Delete</span></div>' +
          '<div class="ExplorerRibbonBtn" data-action="rename"><div class="ExplorerRibbonBtnIcon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></div><span>Rename</span></div>' +
        '</div><div class="ExplorerRibbonLabel">Organize</div>' +
      '</div>' +
      '<div class="ExplorerRibbonCategory">' +
        '<div class="ExplorerRibbonButtons">' +
          '<div class="ExplorerRibbonBtn" data-action="newfolder"><div class="ExplorerRibbonBtnIcon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg></div><span>New Folder</span></div>' +
          '<div class="ExplorerRibbonBtn" data-action="newfile"><div class="ExplorerRibbonBtnIcon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/></svg></div><span>New Item</span></div>' +
        '</div><div class="ExplorerRibbonLabel">New</div>' +
      '</div>' +
      '<div class="ExplorerRibbonCategory">' +
        '<div class="ExplorerRibbonButtons">' +
          '<div class="ExplorerRibbonBtn" data-action="selectall"><div class="ExplorerRibbonBtnIcon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z"/></svg></div><span>Select all</span></div>' +
          '<div class="ExplorerRibbonBtn" data-action="selectnone"><div class="ExplorerRibbonBtnIcon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm4 8h2v-2H7v2zm-4-4h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm12 12h2v-2h-2v2zm6-18H7v14h14V3zm-2 12H9V5h10v10z"/></svg></div><span>Select none</span></div>' +
        '</div><div class="ExplorerRibbonLabel">Select</div>' +
      '</div>';
    body.appendChild(ribbon);

    // Viewport
    var vp = document.createElement('div');
    vp.className = 'ExplorerViewport';
    body.appendChild(vp);

    // Sidebar
    var sidebar = document.createElement('div');
    sidebar.className = 'ExplorerSidebar';
    var rootItem = document.createElement('div');
    rootItem.className = 'ExplorerSidebarItem' + (currentDir === '_root' ? ' selected' : '');
    rootItem.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 13H3v8h18v-8z"/></svg><span>' + STRINGS.PC_FILESYSTEM_ROOT_NAME + '</span>';
    rootItem.onclick = function() { currentDir = '_root'; selectedItems = []; render(); };
    sidebar.appendChild(rootItem);

    var subItems = document.createElement('div');
    subItems.className = 'ExplorerSidebarSub';
    getChildren('_root').forEach(function(node) {
      if (node && node.isDir) {
        var item = document.createElement('div');
        item.className = 'ExplorerSidebarItem' + (currentDir === node.id ? ' selected' : '');
        item.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg><span>' + Utils.escapeHtml(node.name) + '</span>';
        item.onclick = function() { currentDir = node.id; selectedItems = []; render(); };
        subItems.appendChild(item);
      }
    });
    sidebar.appendChild(subItems);
    vp.appendChild(sidebar);

    // File listing
    var fsEl = document.createElement('div');
    fsEl.className = 'ExplorerFs';
    var items = getChildren(currentDir);
    var isRoot = currentDir === '_root';

    items.forEach(function(node) {
      if (!node) return;
      var item = document.createElement('div');
      item.className = 'ExplorerFsItem' + (selectedItems.indexOf(node.id) !== -1 ? ' selected' : '') + (clipboard.items.indexOf(node.id) !== -1 ? ' cut' : '') + (isRoot ? ' row' : '');
      item.setAttribute('data-id', node.id);

      if (createMode && node.id === '_new') {
        item.innerHTML = (node.isDir ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/></svg>') +
          '<input type="text" class="newNameInput" value="' + Utils.escapeHtml(node.name) + '" autofocus />';
        item.querySelector('input').onkeyup = function(e) {
          if (e.key === 'Enter') {
            var name = this.value.trim();
            if (name) {
              fs = FileSystem.createItem(fs, name, node.isDir, currentDir);
              store.set('account.filesystem', fs);
              createMode = false;
              render();
            }
          }
        };
        item.querySelector('input').onblur = function() {
          createMode = false;
          render();
        };
        setTimeout(function() {
          var inp = item.querySelector('input');
          if (inp) inp.focus();
        }, 50);
      } else if (renameMode && selectedItems.indexOf(node.id) !== -1) {
        item.innerHTML = (node.isDir ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/></svg>') +
          '<input type="text" class="newNameInput" value="' + Utils.escapeHtml(node.name) + '" autofocus />';
        item.querySelector('input').onkeyup = function(e) {
          if (e.key === 'Enter') {
            var name = this.value.trim();
            if (name) {
              fs = FileSystem.renameItem(fs, node.id, name);
              store.set('account.filesystem', fs);
              renameMode = false;
              selectedItems = [];
              render();
            }
          }
        };
        item.querySelector('input').onblur = function() {
          renameMode = false;
          render();
        };
        setTimeout(function() {
          var inp = item.querySelector('input');
          if (inp) inp.focus();
        }, 50);
      } else {
        var nameStr = node.name + (node.extension ? '.' + node.extension : '');
        if (isRoot && node.isDir) {
          item.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg><span>' + Utils.escapeHtml(nameStr) + '</span>';
        } else if (node.isDir) {
          item.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg><span>' + Utils.escapeHtml(nameStr) + '</span>';
        } else {
          item.innerHTML = '<img src="public/icons/MiDocument.svg" alt="File" /><span>' + Utils.escapeHtml(nameStr) + '</span>';
        }
        item.onclick = function(e) { e.stopPropagation(); selectedItems = [node.id]; render(); };
        item.ondblclick = function() {
          if (node.isDir) {
            currentDir = node.id;
            selectedItems = [];
            render();
          } else {
            var defaultAppId = store.get('account.defaultApps')['*'] || 'notepad';
            var app = InstalledApps[defaultAppId];
            if (app && win.onOpenDocument) {
              win.onOpenDocument(node.id, node.name, node.extension);
            } else {
              launchProgram(defaultAppId, { docId: node.id, title: node.name + '.' + node.extension });
            }
          }
        };
      }
      fsEl.appendChild(item);
    });
    vp.appendChild(fsEl);

    // Ribbon actions
    Utils.qsa('[data-action]', ribbon).forEach(function(btn) {
      btn.onclick = function() {
        var action = btn.getAttribute('data-action');
        switch (action) {
          case 'newfolder': createMode = 'dir'; render(); break;
          case 'newfile': createMode = 'file'; render(); break;
          case 'delete':
            if (selectedItems.length > 0) {
              fs = FileSystem.deleteItems(fs, currentDir, selectedItems);
              store.set('account.filesystem', fs);
              selectedItems = [];
              render();
            }
            break;
          case 'rename':
            if (selectedItems.length === 1) { renameMode = true; render(); }
            break;
          case 'copy':
            if (selectedItems.length > 0) { clipboard = { mode: 1, items: selectedItems.slice() }; render(); }
            break;
          case 'cut':
            if (selectedItems.length > 0) { clipboard = { mode: 0, items: selectedItems.slice() }; render(); }
            break;
          case 'paste':
            if (clipboard.items.length > 0 && clipboard.mode === 0) {
              fs = FileSystem.moveItems(fs, store.get('account.filesystem')[clipboard.items[0]] ? store.get('account.filesystem')[clipboard.items[0]].parent : currentDir, currentDir, clipboard.items);
              store.set('account.filesystem', fs);
              clipboard = { mode: -1, items: [] };
              render();
            } else if (clipboard.items.length > 0 && clipboard.mode === 1) {
              fs = FileSystem.copyItems(fs, currentDir, clipboard.items);
              store.set('account.filesystem', fs);
              render();
            }
            break;
          case 'selectall':
            selectedItems = items.filter(Boolean).map(function(n) { return n.id; });
            render();
            break;
          case 'selectnone':
            selectedItems = [];
            render();
            break;
        }
      };
    });
  }

  // Override onOpenDocument to open docs in notepad
  win.onOpenDocument = function(docId, name, ext) {
    launchProgram('notepad', { docId: docId, title: name + '.' + ext });
  };

  render();
}

// --- NOTEPAD ---
function renderNotepad(win) {
  var body = win._body;
  var docId = win.docId;
  var wordWrap = false;
  var STORENAME = 'notepad_docs';

  body.innerHTML =
    '<div class="Notepad">' +
      '<div class="NotepadMenubar">' +
        '<div class="NotepadMenubarItem" data-menu="file">File<div class="NotepadMenubarSubmenu">' +
          '<div class="NotepadMenubarSubmenuItem" data-sub="save">Save</div>' +
          '<div class="NotepadMenubarSubmenuItem" data-sub="exit">Exit</div>' +
        '</div></div>' +
        '<div class="NotepadMenubarItem" data-menu="view">View<div class="NotepadMenubarSubmenu">' +
          '<div class="NotepadMenubarSubmenuItem" data-sub="wordwrap"><span class="ProgramMenubarItemCheck"></span>Word Wrap</div>' +
        '</div></div>' +
      '</div>' +
      '<div class="NotepadContent"><textarea></textarea></div>' +
    '</div>';

  var textarea = Utils.qs('textarea', body);

  // Menubar toggle
  Utils.qsa('.NotepadMenubarItem', body).forEach(function(item) {
    item.onclick = function(e) {
      e.stopPropagation();
      var open = item.classList.contains('open');
      Utils.qsa('.NotepadMenubarItem', body).forEach(function(mi) { mi.classList.remove('open'); });
      if (!open) item.classList.add('open');
    };
  });

  // Close submenus on click outside
  document.onclick = function() {
    Utils.qsa('.NotepadMenubarItem.open', body).forEach(function(mi) { mi.classList.remove('open'); });
  };

  // Submenu actions
  Utils.qsa('[data-sub]', body).forEach(function(sub) {
    sub.onclick = function(e) {
      e.stopPropagation();
      var action = sub.getAttribute('data-sub');
      switch (action) {
        case 'save':
          var content = textarea.value;
          var docs = JSON.parse(localStorage.getItem(STORENAME) || '{}');
          docs[docId || 'untitled'] = content;
          localStorage.setItem(STORENAME, JSON.stringify(docs));
          break;
        case 'exit':
          closeWindow(win.pId);
          break;
        case 'wordwrap':
          wordWrap = !wordWrap;
          textarea.style.whiteSpace = wordWrap ? 'pre-wrap' : 'nowrap';
          var check = Utils.qs('.ProgramMenubarItemCheck', sub);
          check.textContent = wordWrap ? '\u2713' : '';
          break;
      }
      Utils.qsa('.NotepadMenubarItem', body).forEach(function(mi) { mi.classList.remove('open'); });
    };
  });

  // Load content
  if (docId) {
    var docs = JSON.parse(localStorage.getItem(STORENAME) || '{}');
    textarea.value = docs[docId] || '';
  }
}

// --- CALCULATOR ---
function renderCalculator(win) {
  var body = win._body;
  var display = '0';
  var expression = '';
  var result = null;
  var justEvaluated = false;

  function render() {
    body.innerHTML =
      '<div class="Calculator" style="display:flex;flex-direction:column;height:100%">' +
        '<div style="background:#1a1a2e;color:white;text-align:right;padding:20px 16px;font-size:2em;font-family:monospace;min-height:72px;display:flex;flex-direction:column;justify-content:flex-end">' +
          '<div style="font-size:0.5em;color:#888;min-height:20px">' + Utils.escapeHtml(expression) + '</div>' +
          '<div>' + Utils.escapeHtml(display) + '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);flex:1;gap:1px;background:#ccc;padding:1px">' +
          '<button data-action="clear" style="grid-column:span 2;background:#f44336;color:white;border:none;font-size:1.2em;cursor:pointer">C</button>' +
          '<button data-action="backspace" style="background:#ff9800;color:white;border:none;font-size:1.2em;cursor:pointer">DEL</button>' +
          '<button data-action="op" data-value="/" style="background:#3e3c91;color:white;border:none;font-size:1.2em;cursor:pointer">/</button>' +
          '<button data-action="num" data-value="7" style="background:#e0e0e0;border:none;font-size:1.2em;cursor:pointer">7</button>' +
          '<button data-action="num" data-value="8" style="background:#e0e0e0;border:none;font-size:1.2em;cursor:pointer">8</button>' +
          '<button data-action="num" data-value="9" style="background:#e0e0e0;border:none;font-size:1.2em;cursor:pointer">9</button>' +
          '<button data-action="op" data-value="*" style="background:#3e3c91;color:white;border:none;font-size:1.2em;cursor:pointer">*</button>' +
          '<button data-action="num" data-value="4" style="background:#e0e0e0;border:none;font-size:1.2em;cursor:pointer">4</button>' +
          '<button data-action="num" data-value="5" style="background:#e0e0e0;border:none;font-size:1.2em;cursor:pointer">5</button>' +
          '<button data-action="num" data-value="6" style="background:#e0e0e0;border:none;font-size:1.2em;cursor:pointer">6</button>' +
          '<button data-action="op" data-value="-" style="background:#3e3c91;color:white;border:none;font-size:1.2em;cursor:pointer">-</button>' +
          '<button data-action="num" data-value="1" style="background:#e0e0e0;border:none;font-size:1.2em;cursor:pointer">1</button>' +
          '<button data-action="num" data-value="2" style="background:#e0e0e0;border:none;font-size:1.2em;cursor:pointer">2</button>' +
          '<button data-action="num" data-value="3" style="background:#e0e0e0;border:none;font-size:1.2em;cursor:pointer">3</button>' +
          '<button data-action="op" data-value="+" style="background:#3e3c91;color:white;border:none;font-size:1.2em;cursor:pointer">+</button>' +
          '<button data-action="num" data-value="0" style="grid-column:span 2;background:#e0e0e0;border:none;font-size:1.2em;cursor:pointer">0</button>' +
          '<button data-action="decimal" style="background:#e0e0e0;border:none;font-size:1.2em;cursor:pointer">.</button>' +
          '<button data-action="equals" style="background:#2d7d2d;color:white;border:none;font-size:1.2em;cursor:pointer">=</button>' +
        '</div>' +
      '</div>';

    Utils.qsa('[data-action]', body).forEach(function(btn) {
      btn.onclick = function() {
        var action = btn.getAttribute('data-action');
        switch (action) {
          case 'num':
            if (justEvaluated) { display = ''; justEvaluated = false; }
            display = display === '0' ? btn.getAttribute('data-value') : display + btn.getAttribute('data-value');
            break;
          case 'decimal':
            if (justEvaluated) { display = '0.'; justEvaluated = false; return; }
            if (display.indexOf('.') === -1) display += '.';
            break;
          case 'op':
            if (expression && display) {
              expression = expression + display + ' ' + btn.getAttribute('data-value') + ' ';
            } else if (display) {
              expression = display + ' ' + btn.getAttribute('data-value') + ' ';
            }
            display = '0';
            justEvaluated = false;
            break;
          case 'equals':
            if (expression && display) {
              try {
                var fullExpr = expression + display;
                result = Function('"use strict"; return (' + fullExpr + ')')();
                expression = fullExpr + ' =';
                display = String(result);
                justEvaluated = true;
              } catch(e) {
                display = 'Error';
                justEvaluated = true;
              }
            }
            break;
          case 'clear':
            display = '0';
            expression = '';
            result = null;
            justEvaluated = false;
            break;
          case 'backspace':
            if (!justEvaluated) display = display.length > 1 ? display.slice(0, -1) : '0';
            break;
        }
        render();
      };
    });
  }

  render();
}

// --- CALENDAR ---
function renderCalendar(win) {
  var body = win._body;
  var today = new Date();
  var viewYear = today.getFullYear();
  var viewMonth = today.getMonth();

  var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function render() {
    var firstDay = new Date(viewYear, viewMonth, 1).getDay();
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    var todayStr = today.getFullYear() + '-' + today.getMonth() + '-' + today.getDate();

    var cells = '';
    for (var i = 0; i < firstDay; i++) cells += '<div></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var dStr = viewYear + '-' + viewMonth + '-' + d;
      var isToday = dStr === todayStr ? ' style="background:#3e3c91;color:white;border-radius:50%"' : '';
      cells += '<div' + isToday + ' style="text-align:center;padding:8px 0;font-size:14px">' + d + '</div>';
    }

    body.innerHTML =
      '<div class="Calendar" style="display:flex;flex-direction:column;height:100%;font-family:sans-serif">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1a1a2e;color:white">' +
          '<button id="calPrev" style="background:transparent;border:none;color:white;font-size:1.5em;cursor:pointer">&lt;</button>' +
          '<span style="font-size:1.2em;font-weight:600">' + MONTH_NAMES[viewMonth] + ' ' + viewYear + '</span>' +
          '<button id="calNext" style="background:transparent;border:none;color:white;font-size:1.5em;cursor:pointer">&gt;</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(7,1fr);background:#e0e0e0;padding:1px">' +
          DAY_NAMES.map(function(n) { return '<div style="text-align:center;padding:8px 0;font-weight:600;font-size:12px;background:white">' + n + '</div>'; }).join('') +
          cells +
        '</div>' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#888;font-size:14px">' +
          'Lindows Calendar' +
        '</div>' +
      '</div>';

    Utils.$('calPrev').onclick = function() {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      render();
    };
    Utils.$('calNext').onclick = function() {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      render();
    };
  }

  render();
}

// --- SETTINGS ---
function renderSettings(win) {
  var body = win._body;
  var currentBg = store.get('account.settings.background');

  function render() {
    body.innerHTML =
      '<div class="Settings" style="display:flex;flex-direction:column;height:100%;font-family:sans-serif">' +
        '<div style="padding:16px;background:#1a1a2e;color:white">' +
          '<h2 style="font-size:1.2em;font-weight:600">Settings</h2>' +
        '</div>' +
        '<div style="padding:16px;overflow-y:auto;flex:1">' +
          '<h3 style="font-size:1em;margin-bottom:12px;color:#333">Personalization</h3>' +
          '<p style="font-size:14px;color:#666;margin-bottom:12px">Choose your wallpaper</p>' +
          '<div id="wallpaperGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">' +
            WALLPAPERS.list.map(function(wp, i) {
              var selected = wp.name === currentBg ? ' style="border:3px solid #3e3c91;box-shadow:0 0 8px rgba(62,60,145,0.5)"' : ' style="border:3px solid transparent"';
              return '<div class="wallpaperOption" data-wallpaper="' + wp.name + '"' + selected + ' style="cursor:pointer;border-radius:4px;overflow:hidden">' +
                '<div style="height:100px;background:url(public/images/' + wp.name + ');background-size:cover;background-position:center"></div>' +
                '<div style="padding:8px;font-size:12px;text-align:center;background:#f5f5f5;color:#333">' + Utils.escapeHtml(wp.desc) + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';

    Utils.qsa('.wallpaperOption', body).forEach(function(el) {
      el.onclick = function() {
        var wp = el.getAttribute('data-wallpaper');
        currentBg = wp;
        store.set('account.settings.background', wp);
        renderDesktop();
        render();
      };
    });
  }

  render();
}

// --- GOOGLE ---
function renderGoogle(win) {
  var body = win._body;
  var query = '';

  function render() {
    body.innerHTML =
      '<div class="Google" style="display:flex;flex-direction:column;height:100%;font-family:sans-serif">' +
        '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#1a1a2e;flex-shrink:0">' +
          '<input id="googleInput" type="text" placeholder="Search Google..." value="' + Utils.escapeHtml(query) + '" style="flex:1;padding:8px 12px;font-size:14px;border:none;border-radius:4px;outline:none" />' +
          '<button id="googleSearchBtn" style="background:#4285F4;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px">Search</button>' +
        '</div>' +
        '<div style="flex:1;position:relative">' +
          '<iframe id="googleFrame" style="width:100%;height:100%;border:none" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>' +
          '<div id="googleFallback" style="display:none;position:absolute;inset:0;flex-direction:column;align-items:center;justify-content:center;background:#f5f5f5;color:#666;font-size:16px;gap:12px">' +
            '<p>Google cannot be embedded due to security restrictions.</p>' +
            '<button id="googleOpenBtn" style="background:#4285F4;color:white;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:14px">Open Google in new tab</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var input = Utils.$('googleInput');
    var frame = Utils.$('googleFrame');
    var fallback = Utils.$('googleFallback');

    function doSearch() {
      query = input.value.trim();
      if (!query) return;
      var url = 'https://www.google.com/search?igu=1&q=' + encodeURIComponent(query);
      try {
        frame.src = url;
        fallback.style.display = 'none';
        frame.style.display = 'block';
      } catch(e) {
        showFallback();
      }
    }

    function showFallback() {
      frame.style.display = 'none';
      fallback.style.display = 'flex';
    }

    frame.onerror = showFallback;

    Utils.$('googleSearchBtn').onclick = doSearch;
    input.onkeyup = function(e) { if (e.key === 'Enter') doSearch(); };
    Utils.$('googleOpenBtn').onclick = function() {
      var url = 'https://www.google.com/search?q=' + encodeURIComponent(query || '');
      window.open(url, '_blank');
    };

    // Try loading Google homepage
    try {
      frame.src = 'https://www.google.com/webhp?igu=1';
    } catch(e) {
      showFallback();
    }

    // Detect iframe load failure
    setTimeout(function() {
      try {
        if (frame.contentDocument && frame.contentDocument.body.innerHTML.length < 50) {
          showFallback();
        }
      } catch(e) {
        showFallback();
      }
    }, 3000);
  }

  render();
}

// --- PAINT ---
function renderPaint(win) {
  var body = win._body;
  var drawing = false;
  var color = '#000000';
  var size = 4;

  body.innerHTML =
    '<div style="display:flex;flex-direction:column;height:100%">' +
      '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#eee;flex-shrink:0">' +
        '<input id="paintColor" type="color" value="#000000" style="width:40px;height:32px;border:none;cursor:pointer" />' +
        '<input id="paintSize" type="range" min="1" max="20" value="4" style="width:100px" />' +
        '<button id="paintClear" style="padding:4px 12px;cursor:pointer">Clear</button>' +
      '</div>' +
      '<canvas id="paintCanvas" style="flex:1;cursor:crosshair;background:white"></canvas>' +
    '</div>';

  var canvas = Utils.$('paintCanvas');
  var ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  resize();

  canvas.onmousedown = function(e) { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
  canvas.onmousemove = function(e) {
    if (!drawing) return;
    ctx.lineWidth = size;
    ctx.strokeStyle = color;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  };
  canvas.onmouseup = function() { drawing = false; };
  canvas.onmouseleave = function() { drawing = false; };

  Utils.$('paintColor').onchange = function() { color = this.value; };
  Utils.$('paintSize').oninput = function() { size = parseInt(this.value); };
  Utils.$('paintClear').onclick = function() { resize(); };
}

// --- CLOCK ---
function renderClock(win) {
  var body = win._body;
  body.innerHTML = '<canvas id="clockCanvas" style="width:100%;height:100%"></canvas>';
  var canvas = Utils.$('clockCanvas');
  var ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  resize();

  function draw() {
    if (!document.body.contains(canvas)) return;
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    var r = Math.min(cx, cy) - 10;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (var i = 0; i < 12; i++) {
      var a = (i * 30 - 90) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx + (r - 15) * Math.cos(a), cy + (r - 15) * Math.sin(a));
      ctx.lineTo(cx + (r - 5) * Math.cos(a), cy + (r - 5) * Math.sin(a));
      ctx.strokeStyle = i % 3 === 0 ? '#fff' : '#888';
      ctx.lineWidth = i % 3 === 0 ? 3 : 1;
      ctx.stroke();
    }

    var now = new Date();
    var h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds();
    var ha = (h * 30 + m * 0.5 - 90) * Math.PI / 180;
    var ma = (m * 6 - 90) * Math.PI / 180;
    var sa = (s * 6 - 90) * Math.PI / 180;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.5 * Math.cos(ha), cy + r * 0.5 * Math.sin(ha));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.7 * Math.cos(ma), cy + r * 0.7 * Math.sin(ma));
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.8 * Math.cos(sa), cy + r * 0.8 * Math.sin(sa));
    ctx.strokeStyle = '#f44336';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f44336';
    ctx.fill();

    requestAnimationFrame(draw);
  }
  draw();
}

// --- STOPWATCH ---
function renderStopwatch(win) {
  var body = win._body;
  var running = false;
  var time = 0;
  var laps = [];
  var interval = null;

  function format(ms) {
    var m = Math.floor(ms / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    var c = Math.floor((ms % 1000) / 10);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c;
  }

  function render() {
    body.innerHTML =
      '<div style="display:flex;flex-direction:column;height:100%;background:#1a1a2e;color:white;font-family:monospace">' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:3em">' + format(time) + '</div>' +
        '<div style="display:flex;gap:8px;padding:12px;justify-content:center;flex-shrink:0">' +
          '<button id="swStart" style="flex:1;padding:10px;background:#2d7d2d;color:white;border:none;cursor:pointer;font-size:1em;border-radius:4px">' + (running ? 'Stop' : 'Start') + '</button>' +
          '<button id="swLap" style="flex:1;padding:10px;background:#3e3c91;color:white;border:none;cursor:pointer;font-size:1em;border-radius:4px">Lap</button>' +
          '<button id="swReset" style="flex:1;padding:10px;background:#f44336;color:white;border:none;cursor:pointer;font-size:1em;border-radius:4px">Reset</button>' +
        '</div>' +
        (laps.length > 0 ? '<div style="flex:1;overflow-y:auto;padding:8px;border-top:1px solid #444">' + laps.map(function(l, i) { return '<div style="padding:4px 8px;font-size:0.9em;border-bottom:1px solid #333">Lap ' + (i + 1) + ': ' + format(l) + '</div>'; }).join('') + '</div>' : '') +
      '</div>';

    Utils.$('swStart').onclick = function() {
      if (running) { clearInterval(interval); running = false; }
      else { running = true; var start = Date.now() - time; interval = setInterval(function() { if (!document.body.contains(body)) { clearInterval(interval); return; } time = Date.now() - start; render(); }, 30); }
      render();
    };
    Utils.$('swLap').onclick = function() { if (running) { laps.push(time); render(); } };
    Utils.$('swReset').onclick = function() { clearInterval(interval); time = 0; laps = []; running = false; render(); };
  }
  render();
}

// --- NOTES ---
function renderNotes(win) {
  var body = win._body;
  var STORE = 'lindows_notes';
  var notes = JSON.parse(localStorage.getItem(STORE) || '[]');
  var current = -1;

  function save() { localStorage.setItem(STORE, JSON.stringify(notes)); }

  function render() {
    body.innerHTML =
      '<div style="display:flex;flex-direction:column;height:100%">' +
        '<div style="display:flex;gap:4px;padding:6px;background:#eee;flex-shrink:0">' +
          '<button id="notesNew" style="padding:4px 12px;cursor:pointer;background:#3e3c91;color:white;border:none;border-radius:3px">+ New</button>' +
          '<button id="notesDelete" style="padding:4px 12px;cursor:pointer;background:#f44336;color:white;border:none;border-radius:3px">Delete</button>' +
        '</div>' +
        '<div style="display:flex;flex:1;overflow:hidden">' +
          '<div style="width:120px;overflow-y:auto;border-right:1px solid #ccc;background:#f9f9f9;flex-shrink:0">' +
            notes.map(function(n, i) {
              var title = n.substring(0, 20).replace(/\n/g, ' ') || 'Untitled';
              return '<div class="notesItem' + (i === current ? ' selected' : '') + '" data-idx="' + i + '" style="padding:8px;cursor:pointer;font-size:13px;border-bottom:1px solid #ddd;' + (i === current ? 'background:#d5ecfc' : '') + '">' + Utils.escapeHtml(title) + '</div>';
            }).join('') +
          '</div>' +
          '<textarea id="notesEditor" style="flex:1;border:none;padding:8px;font-size:14px;resize:none;outline:none;font-family:sans-serif">' + (current >= 0 ? Utils.escapeHtml(notes[current]) : '') + '</textarea>' +
        '</div>' +
      '</div>';

    Utils.qsa('.notesItem', body).forEach(function(el) {
      el.onclick = function() { current = parseInt(el.getAttribute('data-idx')); render(); };
    });
    var editor = Utils.$('notesEditor');
    editor.oninput = function() { if (current >= 0) { notes[current] = editor.value; save(); } };
    Utils.$('notesNew').onclick = function() { notes.unshift(''); current = 0; save(); render(); };
    Utils.$('notesDelete').onclick = function() { if (current >= 0) { notes.splice(current, 1); current = -1; save(); render(); } };
  }
  if (notes.length > 0) current = 0;
  render();
}

// --- TERMINAL ---
function renderTerminal(win) {
  var body = win._body;
  var history = ['Welcome to Lindows Terminal', 'Type "help" for commands', ''];
  var cmdHistory = [];
  var cmdIdx = -1;

  function runCmd(cmd) {
    var parts = cmd.trim().split(' ');
    var c = parts[0].toLowerCase();
    var out = '';
    switch (c) {
      case 'help': out = 'Commands: help, echo, date, whoami, clear, calc, cal, ver, dir, type, time, exit'; break;
      case 'echo': out = parts.slice(1).join(' '); break;
      case 'date': out = new Date().toDateString(); break;
      case 'time': out = new Date().toLocaleTimeString(); break;
      case 'whoami': out = (store.get('auth.activeUser') || {}).name || 'user'; break;
      case 'ver': out = 'Lindows OS v1.0'; break;
      case 'clear': history = []; return;
      case 'calc': out = 'Try: 2 + 2 = 4'; break;
      case 'cal': out = new Date().toLocaleDateString(); break;
      case 'dir': out = 'Documents  Music  Pictures  Videos'; break;
      case 'type': out = parts.slice(1).join(' ') || 'No text specified'; break;
      case 'exit': out = 'Use the close button to close this window'; break;
      default: out = cmd ? "'" + cmd + "' is not recognized" : '';
    }
    history.push('> ' + cmd);
    if (out) history.push(out);
  }

  function render() {
    body.innerHTML =
      '<div style="display:flex;flex-direction:column;height:100%;background:#0c0c0c;color:#ccc;font-family:monospace;font-size:14px">' +
        '<div id="termOutput" style="flex:1;overflow-y:auto;padding:8px;white-space:pre-wrap"></div>' +
        '<div style="display:flex;padding:4px 8px;background:#1a1a1a;flex-shrink:0">' +
          '<span style="color:#2d7d2d">user@lindows:~$</span>' +
          '<input id="termInput" style="flex:1;background:transparent;border:none;color:#ccc;outline:none;font-family:monospace;font-size:14px;margin-left:4px" autofocus />' +
        '</div>' +
      '</div>';

    var out = Utils.$('termOutput');
    out.innerHTML = history.map(function(l) { return '<div>' + Utils.escapeHtml(l) + '</div>'; }).join('');
    out.scrollTop = out.scrollHeight;

    var input = Utils.$('termInput');
    input.value = '';
    input.focus();

    input.onkeyup = function(e) {
      if (e.key === 'Enter') {
        cmdHistory.push(input.value);
        cmdIdx = -1;
        runCmd(input.value);
        render();
      } else if (e.key === 'ArrowUp') {
        if (cmdHistory.length > 0) {
          cmdIdx = Math.max(0, cmdIdx === -1 ? cmdHistory.length - 1 : cmdIdx - 1);
          input.value = cmdHistory[cmdIdx] || '';
        }
      } else if (e.key === 'ArrowDown') {
        if (cmdIdx < cmdHistory.length - 1) { cmdIdx++; input.value = cmdHistory[cmdIdx]; }
        else { cmdIdx = -1; input.value = ''; }
      }
    };
  }
  render();
}

// --- SNAKE ---
function renderSnake(win) {
  var body = win._body;
  var grid = 15;
  var cols = 18, rows = 18;
  var snake = [{x: 5, y: 5}];
  var dir = {x: 1, y: 0};
  var nextDir = {x: 1, y: 0};
  var food = {x: 10, y: 10};
  var score = 0;
  var gameOver = false;
  var paused = false;
  var loop = null;

  function spawnFood() {
    food = {x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows)};
    for (var i = 0; i < snake.length; i++) { if (snake[i].x === food.x && snake[i].y === food.y) spawnFood(); }
  }

  function step() {
    if (!document.body.contains(body)) { clearInterval(loop); return; }
    if (gameOver || paused) return;
    dir = {x: nextDir.x, y: nextDir.y};
    var head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) { gameOver = true; render(); return; }
    for (var i = 0; i < snake.length; i++) { if (snake[i].x === head.x && snake[i].y === head.y) { gameOver = true; render(); return; } }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { score += 10; spawnFood(); } else snake.pop();
    render();
  }

  function render() {
    var cell = Math.min(Math.floor((body.clientWidth - 20) / cols), Math.floor((body.clientHeight - 60) / rows));
    var w = cell * cols, h = cell * rows;
    body.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;height:100%;background:#1a1a2e;padding:10px">' +
        '<div style="color:white;font-family:monospace;margin-bottom:4px;font-size:14px">Score: ' + score + '</div>' +
        '<canvas id="snakeCanvas" width="' + w + '" height="' + h + '" style="border:1px solid #444"></canvas>' +
        (gameOver ? '<div style="color:#f44336;margin-top:8px;font-size:16px;cursor:pointer" id="snakeRestart">Game Over! Click to restart</div>' : '') +
        '<div style="color:#888;font-size:12px;margin-top:4px">Arrow keys to move | Space to pause</div>' +
      '</div>';

    var canvas = Utils.$('snakeCanvas');
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#2d7d2d';
    snake.forEach(function(s, i) {
      ctx.fillStyle = i === 0 ? '#4caf50' : '#2d7d2d';
      ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
    });

    ctx.fillStyle = '#f44336';
    ctx.fillRect(food.x * cell + 1, food.y * cell + 1, cell - 2, cell - 2);

    var restart = Utils.$('snakeRestart');
    if (restart) restart.onclick = function() { clearInterval(loop); snake = [{x: 5, y: 5}]; dir = {x: 1, y: 0}; nextDir = {x: 1, y: 0}; score = 0; gameOver = false; spawnFood(); loop = setInterval(step, 150); render(); };
  }

  document.onkeydown = function(e) {
    if (e.key === 'ArrowUp' && dir.y !== 1) { e.preventDefault(); nextDir = {x: 0, y: -1}; }
    else if (e.key === 'ArrowDown' && dir.y !== -1) { e.preventDefault(); nextDir = {x: 0, y: 1}; }
    else if (e.key === 'ArrowLeft' && dir.x !== 1) { e.preventDefault(); nextDir = {x: -1, y: 0}; }
    else if (e.key === 'ArrowRight' && dir.x !== -1) { e.preventDefault(); nextDir = {x: 1, y: 0}; }
    else if (e.key === ' ') { e.preventDefault(); paused = !paused; }
  };

  spawnFood();
  loop = setInterval(step, 150);
  render();
}

// --- WEATHER ---
function renderWeather(win) {
  var body = win._body;
  var cities = [
    { name: 'New York', temp: 72, icon: 'sunny' },
    { name: 'London', temp: 56, icon: 'cloudy' },
    { name: 'Tokyo', temp: 68, icon: 'rainy' },
    { name: 'Sydney', temp: 80, icon: 'sunny' },
    { name: 'Paris', temp: 62, icon: 'cloudy' },
    { name: 'Moscow', temp: 45, icon: 'snowy' },
    { name: 'Dubai', temp: 95, icon: 'sunny' },
    { name: 'Toronto', temp: 50, icon: 'snowy' },
  ];
  var current = 0;

  function getIcon(type) {
    if (type === 'sunny') return '<svg viewBox="0 0 24 24" fill="#ff9800" width="48" height="48"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>';
    if (type === 'cloudy') return '<svg viewBox="0 0 24 24" fill="#888" width="48" height="48"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>';
    if (type === 'rainy') return '<svg viewBox="0 0 24 24" fill="#2196f3" width="48" height="48"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM7 14c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1v-6c0-.55.45-1 1-1zm5 0c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1v-6c0-.55.45-1 1-1zm5 0c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1v-6c0-.55.45-1 1-1z"/></svg>';
    if (type === 'snowy') return '<svg viewBox="0 0 24 24" fill="#90caf9" width="48" height="48"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>';
    return '';
  }

  function render() {
    var c = cities[current];
    body.innerHTML =
      '<div style="display:flex;flex-direction:column;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;font-family:sans-serif">' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px;padding:8px;justify-content:center;flex-shrink:0">' +
          cities.map(function(ci, i) { return '<button class="cityBtn" data-idx="' + i + '" style="padding:4px 10px;border-radius:12px;border:none;cursor:pointer;font-size:12px;background:' + (i === current ? '#3e3c91' : '#333') + ';color:white">' + ci.name + '</button>'; }).join('') +
        '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
          getIcon(c.icon) +
          '<div style="font-size:3em;font-weight:300;margin:8px 0">' + c.temp + '&deg;F</div>' +
          '<div style="font-size:1.2em;color:#aaa">' + c.name + '</div>' +
        '</div>' +
      '</div>';
    Utils.qsa('.cityBtn', body).forEach(function(el) { el.onclick = function() { current = parseInt(el.getAttribute('data-idx')); render(); }; });
  }
  render();
}

// --- MUSIC ---
function renderMusic(win) {
  var body = win._body;
  var songs = [
    { title: 'Bohemian Rhapsody', artist: 'Queen', color: '#e91e63' },
    { title: 'Hotel California', artist: 'Eagles', color: '#9c27b0' },
    { title: 'Stairway to Heaven', artist: 'Led Zeppelin', color: '#3f51b5' },
    { title: 'Imagine', artist: 'John Lennon', color: '#009688' },
    { title: 'Billie Jean', artist: 'Michael Jackson', color: '#ff5722' },
    { title: 'Smells Like Teen Spirit', artist: 'Nirvana', color: '#795548' },
    { title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', color: '#607d8b' },
    { title: 'Yesterday', artist: 'The Beatles', color: '#4caf50' },
  ];
  var current = 0;

  function render() {
    body.innerHTML =
      '<div style="display:flex;flex-direction:column;height:100%;background:#1a1a2e;color:white;font-family:sans-serif">' +
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px">' +
          '<div style="width:120px;height:120px;border-radius:50%;background:' + songs[current].color + ';display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:3em">&#9835;</div>' +
          '<div style="font-size:1.2em;text-align:center">' + Utils.escapeHtml(songs[current].title) + '</div>' +
          '<div style="font-size:0.9em;color:#aaa;margin-top:4px">' + Utils.escapeHtml(songs[current].artist) + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:16px;padding:16px;justify-content:center;flex-shrink:0">' +
          '<button id="musicPrev" style="background:transparent;border:2px solid #555;color:white;border-radius:50%;width:48px;height:48px;font-size:1.2em;cursor:pointer">&#9664;</button>' +
          '<button id="musicPlay" style="background:#3e3c91;border:none;color:white;border-radius:50%;width:56px;height:56px;font-size:1.5em;cursor:pointer">&#9654;</button>' +
          '<button id="musicNext" style="background:transparent;border:2px solid #555;color:white;border-radius:50%;width:48px;height:48px;font-size:1.2em;cursor:pointer">&#9654;</button>' +
        '</div>' +
        '<div style="max-height:150px;overflow-y:auto;border-top:1px solid #333">' +
          songs.map(function(s, i) { return '<div class="songItem" data-idx="' + i + '" style="padding:8px 16px;cursor:pointer;display:flex;align-items:center;' + (i === current ? 'background:rgba(62,60,145,0.4)' : '') + '"><div style="width:8px;height:8px;border-radius:50%;background:' + s.color + ';margin-right:12px"></div><div><div>' + Utils.escapeHtml(s.title) + '</div><div style="font-size:12px;color:#888">' + Utils.escapeHtml(s.artist) + '</div></div></div>'; }).join('') +
        '</div>' +
      '</div>';

    Utils.qsa('.songItem', body).forEach(function(el) { el.onclick = function() { current = parseInt(el.getAttribute('data-idx')); render(); }; });
    Utils.$('musicPlay').onclick = function() { /* play/pause - no actual audio files */ };
    Utils.$('musicNext').onclick = function() { current = (current + 1) % songs.length; render(); };
    Utils.$('musicPrev').onclick = function() { current = (current - 1 + songs.length) % songs.length; render(); };
  }
  render();
}

// --- TIC TAC TOE ---
function renderTicTacToe(win) {
  var body = win._body;
  var board = ['', '', '', '', '', '', '', '', ''];
  var player = 'X';
  var gameOver = false;
  var winner = null;

  function checkWin() {
    var lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (var i = 0; i < lines.length; i++) {
      var a = lines[i][0], b = lines[i][1], c = lines[i][2];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) { winner = board[a]; gameOver = true; return; }
    }
    if (board.indexOf('') === -1) { winner = 'Tie'; gameOver = true; }
  }

  function aiMove() {
    var empty = [];
    for (var i = 0; i < 9; i++) { if (board[i] === '') empty.push(i); }
    if (empty.length === 0) return;
    var idx = empty[Math.floor(Math.random() * empty.length)];
    board[idx] = 'O';
    checkWin();
    player = 'X';
    render();
  }

  function render() {
    body.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;height:100%;background:#1a1a2e;padding:16px">' +
        '<div style="color:white;font-size:1.2em;margin-bottom:8px;font-family:sans-serif">' +
          (gameOver ? (winner === 'Tie' ? 'Tie!' : winner + ' wins!') : (player === 'X' ? 'Your turn (X)' : 'Computer thinking...')) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#444;padding:4px;border-radius:4px">' +
          board.map(function(cell, i) {
            var bg = cell === 'X' ? '#3e3c91' : cell === 'O' ? '#2d7d2d' : '#fff';
            return '<div class="tttCell" data-idx="' + i + '" style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:' + bg + ';cursor:pointer;font-size:2em;color:white;border-radius:4px;font-family:sans-serif">' + cell + '</div>';
          }).join('') +
        '</div>' +
        (gameOver ? '<button id="tttRestart" style="margin-top:12px;padding:8px 24px;background:#3e3c91;color:white;border:none;border-radius:4px;cursor:pointer;font-size:1em">Play Again</button>' : '') +
      '</div>';

    Utils.qsa('.tttCell', body).forEach(function(el) {
      el.onclick = function() {
        if (gameOver || player !== 'X') return;
        var idx = parseInt(el.getAttribute('data-idx'));
        if (board[idx] !== '') return;
        board[idx] = 'X';
        checkWin();
        if (!gameOver) { player = 'O'; render(); setTimeout(aiMove, 300); }
        render();
      };
    });
    var restart = Utils.$('tttRestart');
    if (restart) restart.onclick = function() { board = ['', '', '', '', '', '', '', '', '']; player = 'X'; gameOver = false; winner = null; render(); };
  }
  render();
}

// --- ABOUT ---
function renderAbout(win) {
  var body = win._body;
  body.innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;font-family:sans-serif;padding:32px;text-align:center">' +
      '<div style="font-size:4em;margin-bottom:8px">&#9783;</div>' +
      '<div style="font-size:1.8em;font-weight:300">Lindows OS</div>' +
      '<div style="color:#888;margin-top:4px">Version 1.0</div>' +
      '<div style="color:#666;margin-top:16px;font-size:0.9em;max-width:300px">A minimal operating system for browser built with vanilla JavaScript</div>' +
      '<div style="color:#555;margin-top:24px;font-size:0.8em">&#169; 2026 Lindows</div>' +
    '</div>';
}

// ============================================================
// INITIALIZATION
// ============================================================
function init() {
  startClock();
  startBootSequence();
}

document.addEventListener('DOMContentLoaded', init);

})();
