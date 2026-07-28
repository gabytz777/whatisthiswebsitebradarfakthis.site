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
      taskbarApps: ['fsexplorer', 'notepad'],
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
  notepad: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-3 16H7v-2h4v2zm6-4H7v-2h10v2zm0-4h-4V4h4v6z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
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
  notepad: {
    id: 'notepad', name: 'Notepad', icon: APP_ICONS.notepad,
    config: { initTitle: 'Untitled - Notepad', initWindowWidth: '480px', initWindowHeight: '480px' },
    render: function(win) { renderNotepad(win); },
  },
  settings: {
    id: 'settings', name: 'Settings', icon: APP_ICONS.settings,
    render: function(win) { renderSettings(win); },
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
  if (account) {
    store.set('account.settings', account.settings || store.get('account.settings'));
    store.set('account.taskbarApps', account.taskbarApps || store.get('account.taskbarApps'));
    store.set('account.filesystem', account.filesystem || FileSystem.initFs());
    store.set('account.defaultApps', account.defaultApps || store.get('account.defaultApps'));
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
  var categories = {};
  appIds.forEach(function(id) {
    var app = InstalledApps[id];
    var letter = app.name[0].toUpperCase();
    if (!categories[letter]) categories[letter] = [];
    categories[letter].push(app);
  });

  var sortedLetters = Object.keys(categories).sort();
  sortedLetters.forEach(function(letter) {
    var catDiv = document.createElement('div');
    catDiv.className = 'smAppCategory';
    var header = document.createElement('div');
    header.className = 'smAppCategoryHeader';
    header.textContent = letter;
    catDiv.appendChild(header);
    categories[letter].forEach(function(app) {
      var item = document.createElement('div');
      item.className = 'smAppCategoryItem';
      item.innerHTML = '<div class="smAppIcon">' + app.icon + '</div><span class="smAppName">' + app.name + '</span>';
      item.onclick = function() {
        toggleStartMenu(false);
        launchProgram(app.id);
      };
      catDiv.appendChild(item);
    });
    appsContainer.appendChild(catDiv);
  });

  // Promotions
  renderPromotions();

  // Drawer user name
  var activeUser = store.get('auth.activeUser');
  if (activeUser) {
    var label = Utils.qs('.smDrawerItem[data-action="user"] .smDrawerItemLabel');
    if (label) label.textContent = activeUser.name;
  }

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
var Promotions = [
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>', text: 'Google Search', action: 'https://www.google.com/' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-6V5h6v6z"/></svg>', text: 'Amazon', action: 'https://www.amazon.com/' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>', text: 'Chrome', action: 'https://www.google.com/chrome/' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16z"/></svg>', text: 'Dropbox', action: 'https://www.dropbox.com/' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>', text: 'Facebook', action: 'https://www.facebook.com/' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>', text: 'Firefox', action: 'https://www.mozilla.org/firefox/' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>', text: 'Mindows', action: 'https://github.com/' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6 10.5c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6 6 2.69 6 6z"/></svg>', text: 'Skype', action: 'https://www.skype.com/' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>', text: 'Weather', action: 'https://weather.com/' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12v2H6V2zm4 4h4v2h-4V6zm0 4h4v2h-4v-2zm-4 4h12v2H6v-2zm0 4h12v2H6v-2z"/></svg>', text: 'Word', action: 'https://www.microsoft.com/microsoft-365/word' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>', text: 'Steam', action: 'https://store.steampowered.com/' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>', text: 'Camera' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/></svg>', text: 'Windows 11', action: 'https://www.microsoft.com/windows/windows-11' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16z"/></svg>', text: 'News', action: 'https://www.bing.com/news' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>', text: 'Movies' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/></svg>', text: 'Xbox' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>', text: 'Music' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 1L4 9.5V20c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9.5L12.5 1zM12 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>', text: 'Money' },
  { icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>', text: 'Gallery', action: 'https://onedrive.live.com/' },
];

var PROMO_COLORS = ['#3e3c91', '#2d7d2d', '#cc6600', '#cc0000'];

function renderPromotions() {
  var container = Utils.$('smPromo');
  container.innerHTML = '';
  var shuffled = Promotions.slice().sort(function() { return Math.random() - 0.5; });

  var leftSection = document.createElement('div');
  leftSection.className = 'smPromoSection';
  var leftHeader = document.createElement('div');
  leftHeader.className = 'smPromoHeader';
  leftHeader.textContent = 'Life at a glance';
  leftSection.appendChild(leftHeader);
  var leftGrid = document.createElement('div');
  leftGrid.className = 'smPromoGrid';
  shuffled.slice(0, 7).forEach(function(item, i) {
    var el = document.createElement('a');
    el.className = 'smPromoItem' + (i % 5 === 3 ? ' large' : '');
    el.style.background = PROMO_COLORS[Math.floor(Math.random() * 4)];
    el.href = item.action || '#';
    el.target = '_blank';
    el.innerHTML = '<div class="smPromoItemIcon">' + item.icon + '</div><div class="smPromoItemLabel">' + item.text + '</div>';
    leftGrid.appendChild(el);
  });
  leftSection.appendChild(leftGrid);
  container.appendChild(leftSection);

  var rightSection = document.createElement('div');
  rightSection.className = 'smPromoSection';
  var rightHeader = document.createElement('div');
  rightHeader.className = 'smPromoHeader';
  rightHeader.textContent = 'Explore';
  rightSection.appendChild(rightHeader);
  var rightGrid = document.createElement('div');
  rightGrid.className = 'smPromoGrid';
  shuffled.slice(7, 13).forEach(function(item) {
    var el = document.createElement('a');
    el.className = 'smPromoItem';
    el.style.background = PROMO_COLORS[Math.floor(Math.random() * 4)];
    el.href = item.action || '#';
    el.target = '_blank';
    el.innerHTML = '<div class="smPromoItemIcon">' + item.icon + '</div><div class="smPromoItemLabel">' + item.text + '</div>';
    rightGrid.appendChild(el);
  });
  rightSection.appendChild(rightGrid);
  container.appendChild(rightSection);
}

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
  win._body.innerHTML =
    '<div class="Calculator">' +
      '<div><svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg><p>Oops! Mindows must be broken!!</p></div>' +
      '<div><div><p>There seems to be no Calculator installed on the system.</p><p>But wait... you can always add it and send a pull request.</p></div></div>' +
    '</div>';
}

// --- CALENDAR ---
function renderCalendar(win) {
  win._body.innerHTML =
    '<div class="Calender">' +
      '<div><svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg><p>Oops! Mindows must be broken!!</p></div>' +
      '<div><div><p>There seems to be no Calender installed on the system.</p><p>But wait... you can always add it and send a pull request.</p></div></div>' +
    '</div>';
}

// --- SETTINGS ---
function renderSettings(win) {
  win._body.innerHTML =
    '<div class="Settings">' +
      '<div><svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg><p>Oops! Mindows must be broken!!</p></div>' +
      '<div><div><p>There seems to be no Settings installed on the system.</p><p>But wait... you can always add it and send a pull request.</p></div></div>' +
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
