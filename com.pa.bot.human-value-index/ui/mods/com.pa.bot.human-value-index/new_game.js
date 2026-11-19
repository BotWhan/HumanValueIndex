const HVIURL = 'http://nuttygroup.org:27395/?';
const HVIPASSWORDFILE = 'coui:/client_mods/HVI_password.txt';
const HVIPASSWORDFILE_HOST = 'coui://client_mods/HVI_password.txt';
const HVIPASSWORDFILE_MOD = 'coui://ui/mods/com.pa.bot.human-value-index/HVI_password.txt';
const HVIPASSWORDFILE_ALT = 'coui:/HVI_password.txt';

var hviPassword = ko.observable('');
var hviProbesLeft = 4;
var hviRefreshTags = [];

function getWordRatingOriginal(rating) {
  if (rating <= -1000) {
    return "Wow you're a real comedian";
  } else if (rating <= -100) {
    return "Its getting old";
  } else if (rating <= -10) {
    return "I'm seeing a trend";
  } else if (rating <= 0) {
    return "LMAO BAD";
  } else if (rating <= 3) {
    return "Bronze";
  } else if (rating <= 4) {
    return "Casual";
  } else if (rating <= 5) {
    return "Alright";
  } else if (rating <= 6.8) {
    return "Good";
  } else if (rating <= 6.9) {
    return ":(";
  } else if (rating <= 7.9) {
    return "Plat";
  } else if (rating <= 99) {
    return "Menace";
  }
  return "I see you, Broom";
}

function hviAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hviAccept(data) {
  var pw = String(data).replace(/^\s+|\s+$/g, '');
  if (!hviPassword() && pw.length > 0) {
    hviPassword(pw);
    try {
      window.localStorage.setItem('hvi_password', pw);
    } catch (e) {}
  }
  hviRefreshAllTags();
}

function hviRefreshAllTags() {
  for (var idx = 0; idx < hviRefreshTags.length; idx++) {
    try {
      hviRefreshTags[idx]();
    } catch (e) {}
  }
}

function hviSettle() {
  hviProbesLeft = hviProbesLeft - 1;
  if (hviProbesLeft > 0) {
    return;
  }
  if (!hviPassword()) {
    var stored = null;
    try {
      stored = window.localStorage.getItem('hvi_password');
    } catch (e) {}
    if (stored) {
      hviPassword(stored);
    }
  }
  model.determineAuth();
  model.update();
  hviRefreshAllTags();
}

function hviFetch(requestUrl) {
  $.ajax({
    url: requestUrl,
    dataType: 'text',
    timeout: 5000,
    success: function (data) {
      if (typeof data === 'string' && data.replace(/\s/g, '').length > 0) {
        hviAccept(data);
      }
      hviSettle();
    },
    error: function () {
      hviSettle();
    }
  });
}

hviFetch(HVIPASSWORDFILE);
hviFetch(HVIPASSWORDFILE_HOST);
hviFetch(HVIPASSWORDFILE_MOD);
hviFetch(HVIPASSWORDFILE_ALT);

var updateindex = ko.observable(0);

model.determineAuth = function () {
  $.getJSON(HVIURL + "case=3&authentication=" + model.uberId() + "&password=" + encodeURIComponent(hviPassword()), function (result) {
    auth(result === true || result === 'true');
  });
};
var auth = ko.observable();
model.determineAuth();

model.update = function () {
  $.get(HVIURL + "uberid=" + encodeURIComponent(model.uberId()), function (update) {
    if (update != updateindex()) {
      updateindex(update);
    }
  });
};
setInterval(function () {
  model.update();
  hviRefreshAllTags();
  if (auth() !== true) {
    model.determineAuth();
  }
}, 20000);

function hviTargetId(slot, cb) {
  var pid = slot.playerId();
  if (slot.__hviUberId && slot.__hviUberIdFor === pid) {
    cb(String(slot.__hviUberId), true);
    return;
  }
  if (/^\d{8,}$/.test(String(pid))) {
    cb(String(pid), false);
    return;
  }
  var name = slot.playerName();
  if (!name) {
    cb(null);
    return;
  }
  api.net.ubernet('/GameClient/UserId?' + $.param({ TitleDisplayName: name }), 'GET', 'text').then(function (r) {
    var id = null;
    try {
      id = JSON.parse(r).UberId;
    } catch (e) {}
    if (id) {
      slot.__hviUberId = id;
      slot.__hviUberIdFor = pid;
    }
    cb(id || null, true);
  }, function () {
    cb(null);
  });
}

model.humanRatings = function (slot) {
  if (slot.__hviRatings) {
    return slot.__hviRatings;
  }
  var badges = ko.observable([]);
  var ratingLine = ko.observable('');
  var linePrefix = ko.observable('');
  var ratingClass = ko.observable('');
  var lastRating = '';
  var lastHviName = '';
  var reqSeq = 0;
  var fetchedFor = null;
  var refreshTimer = null;

  function rebuildLine() {
    var name = slot.playerName() ? String(slot.playerName()) : '';
    var showHviName = lastHviName && lastHviName.toLowerCase() !== name.toLowerCase();
    var prefix = '';
    if (showHviName) {
      prefix = (name ? ' | ' : '') + lastHviName;
    }
    var ratingText = lastRating;
    if (ratingText && (name || showHviName)) {
      ratingText = ' | ' + ratingText;
    }
    linePrefix(prefix);
    ratingLine(ratingText);
    var value = parseFloat(lastRating);
    if (!isFinite(value)) {
      ratingClass('');
    } else if (value < 4) {
      ratingClass('hvi-r-low');
    } else if (value < 7) {
      ratingClass('hvi-r-mid');
    } else {
      ratingClass('hvi-r-high');
    }
  }

  function clearData() {
    lastRating = '';
    lastHviName = '';
    rebuildLine();
    badges([]);
  }

  function fetchRatings(gotPlayerId, seq, allowNameFallback) {
    $.ajax({
      url: HVIURL + "case=0&uberid=" + encodeURIComponent(gotPlayerId) + "&name=" + encodeURIComponent(slot.playerName()),
      dataType: 'json',
      timeout: 5000,
      success: function (profile) {
        if (seq !== reqSeq) {
          return;
        }
        if (profile.name != "not registered") {
          lastRating = String(profile.rating) + ', ' + getWordRatingOriginal(profile.rating);
          lastHviName = profile.name ? String(profile.name) : '';
          slot.__hviUberId = gotPlayerId;
          slot.__hviUberIdFor = slot.playerId();
        } else if (allowNameFallback) {
          resolveByName(seq, gotPlayerId);
          return;
        } else if (auth() == true) {
          lastHviName = '';
          lastRating = 'C';
        } else {
          lastHviName = '';
          lastRating = '';
        }
        rebuildLine();
      },
      error: function () {
        if (seq !== reqSeq) {
          return;
        }
        lastRating = 'server offline';
        rebuildLine();
      }
    });
    $.ajax({
      url: HVIURL + "case=4&uberid=" + encodeURIComponent(gotPlayerId) + "&authentication=" + encodeURIComponent(model.uberId()) + "&password=" + encodeURIComponent(hviPassword()),
      dataType: 'json',
      timeout: 5000,
      success: function (data) {
        if (seq !== reqSeq) {
          return;
        }
        badges(data && data.badges ? data.badges : []);
      },
      error: function () {
        if (seq !== reqSeq) {
          return;
        }
        badges([]);
      }
    });
  }

  function resolveByName(seq, triedId) {
    var name = slot.playerName();
    if (!name) {
      return;
    }
    api.net.ubernet('/GameClient/UserId?' + $.param({ TitleDisplayName: name }), 'GET', 'text').then(function (r) {
      if (seq !== reqSeq) {
        return;
      }
      var id = null;
      try {
        id = JSON.parse(r).UberId;
      } catch (e) {}
      if (!id) {
        lastRating = 'server offline';
        rebuildLine();
        return;
      }
      slot.__hviUberId = id;
      slot.__hviUberIdFor = slot.playerId();
      if (triedId && String(id) === String(triedId)) {
        lastHviName = '';
        lastRating = (auth() == true) ? 'C' : '';
        rebuildLine();
        return;
      }
      fetchRatings(id, ++reqSeq, false);
    }, function () {
      if (seq !== reqSeq) {
        return;
      }
      lastRating = 'server offline';
      rebuildLine();
    });
  }

  function get() {
    var seq = ++reqSeq;
    var name = slot.playerName();
    if (!name) {
      fetchedFor = null;
      clearData();
      return;
    }
    var pid = slot.playerId();
    if (fetchedFor !== pid) {
      lastRating = '';
      lastHviName = '';
      badges([]);
      fetchedFor = pid;
    }
    rebuildLine();
    hviTargetId(slot, function (id, confirmed) {
      if (seq !== reqSeq) {
        return;
      }
      if (!id) {
        lastRating = 'server offline';
        rebuildLine();
        return;
      }
      fetchRatings(id, seq, !confirmed);
    });
  }
  function scheduleRefresh() {
    if (refreshTimer) {
      return;
    }
    refreshTimer = setTimeout(function () {refreshTimer = null;get();}, 0);
  }

  slot.playerName.subscribe(scheduleRefresh);
  slot.playerId.subscribe(scheduleRefresh);
  get();
  hviRefreshTags.push(get);
  updateindex.subscribe(function () {
    get();
  });
  slot.__hviRatings = { badges: badges, ratingLine: ratingLine, linePrefix: linePrefix, ratingClass: ratingClass };
  return slot.__hviRatings;
}
function hviNameClick(slot) {
  if (slot.ai()) {
    return;
  }
  notesBox(slot);
}

function hviNameRightClick(slot) {
  if (slot.ai()) {
    return;
  }
  editBox(slot);
}

$('div.slot-player-text.truncate').each(function () {
  var bind = this.getAttribute('data-bind');
  if (bind && bind.indexOf('hviNameClick') === -1 && bind.indexOf('editBox') === -1) {
    this.setAttribute('data-bind', bind +
      ', click: function(){hviNameClick(slot)}, event: { contextmenu: function(data, event){ hviNameRightClick(slot); event.preventDefault(); return false; } }, clickBubble: false');
  }
});

var hviKoOpen = '<!-- ko if: (!slot.ai() && slot.playerName() && (typeof slot.playerId() != "undefined")) --><!-- ko with: model.humanRatings(slot) -->';
var hviKoClose = '<!-- /ko --><!-- /ko -->';

$('div.slot-player-text.truncate').before(
  hviKoOpen +
  '<span class="hvi-badges"><!-- ko foreach: badges --><span class="hvi-badge" data-bind="text: $data"></span><!-- /ko --></span>' +
  hviKoClose);

$('div.slot-player-text.truncate').after(
  hviKoOpen +
  '<span class="hvi-line" data-bind="click: function(){notesBox(slot)}, event: { contextmenu: function(data, event){ editBox(slot); event.preventDefault(); return false; } }">' +
  '<span class="hvi-prefix" data-bind="text: linePrefix"></span>' +
  '<span class="hvi-ratingline" data-bind="text: ratingLine, css: ratingClass"></span>' +
  '</span>' +
  hviKoClose);

var hviEditorSlot = null;
var hviEditorTarget = null;
var hviEditorBadges = [];

function editBox(slot) {
  if (!hviPassword()) {
    return;
  }
  hviEditorSlot = slot;
  hviEditorTarget = null;
  resolveEditorId(slot);
}

function resolveEditorId(slot) {
  hviTargetId(slot, function (id) {
    if (hviEditorSlot !== slot) {
      return;
    }
    if (!id) {
      hviRenderEditor();
      return;
    }
    hviEditorTarget = id;
    hviRenderEditor();
  });
}

function hviRenderEditor() {
  var slot = hviEditorSlot;
  if (!slot || !hviPassword()) {
    return;
  }
  setInputBox();
  var header = document.getElementById('editPlayerBoxheader');
  var data = document.getElementById('data');
  if (!header || !data) {
    return;
  }
  header.innerHTML = '<h3>' + hviAttr(slot.playerName()) + '</h3>';
  if (!hviEditorTarget) {
    data.innerHTML = '<div class="hvi-editor-msg">server offline — could not resolve player id</div>' +
      '<button type="button" id="closeButton" onclick="document.getElementById(\'editPlayerBox\').remove()"><small>X</small></button>';
    return;
  }
  var target = hviEditorTarget;
  var profileName = '';
  var pending = 2;

  function done() {
    pending = pending - 1;
    if (pending > 0) {
      return;
    }
    hviFillControls(profileName);
  }

  $.ajax({
    url: HVIURL + "case=0&uberid=" + target + "&name=" + encodeURIComponent(slot.playerName()),
    dataType: 'json',
    timeout: 5000,
    success: function (p) {
      if (p && p.name && p.name != "not registered") {
        profileName = p.name;
      }
    },
    complete: done
  });
  $.ajax({
    url: HVIURL + "case=4&uberid=" + target + "&authentication=" + encodeURIComponent(model.uberId()) + "&password=" + encodeURIComponent(hviPassword()),
    dataType: 'json',
    timeout: 5000,
    success: function (d) {
      hviEditorBadges = (d && d.badges) ? d.badges : [];
    },
    complete: done
  });
}

function hviFillControls(profileName) {
  var data = document.getElementById('data');
  if (!data) {
    return;
  }
  var badgeHtml = '';
  for (var idx = 0; idx < hviEditorBadges.length; idx++) {
    var badge = String(hviEditorBadges[idx]);
    badgeHtml += '<span class="hvi-badge-item">' + hviAttr(badge) +
      '<button type="button" onclick="hviRemoveBadge(\'' + badge.replace(/'/g, "\\'") + '\')"><small>X</small></button></span>';
  }
  data.innerHTML = '<div class="hvi-field"><input type="number" id="newRating" placeholder="New rating" autocomplete="off" style="width:90px" />' +
    '<button type="button" onclick="hviSubmitRating()"><small>Rate</small></button></div>' +
    '<div class="hvi-field"><input type="text" id="newName" placeholder="HVI name" autocomplete="off" style="width:150px" value="' + hviAttr(profileName) + '" />' +
    '<button type="button" onclick="hviSubmitName()"><small>Rename</small></button></div>' +
    '<div class="hvi-field"><input type="text" id="newBadge" placeholder="Badge" autocomplete="off" style="width:110px" />' +
    '<button type="button" onclick="hviAddBadge()"><small>Add</small></button></div>' +
    '<div class="hvi-badge-list">' + badgeHtml + '</div>' +
    '<button type="button" id="closeButton" onclick="document.getElementById(\'editPlayerBox\').remove()"><small>X</small></button>';
}

function hviOp(params) {
  if (!hviEditorTarget) {
    return;
  }
  var qs = 'case=1&uberid=' + encodeURIComponent(hviEditorTarget) +
    '&authentication=' + encodeURIComponent(model.uberId()) +
    '&password=' + encodeURIComponent(hviPassword());
  for (var kdx in params) {
    if (Object.prototype.hasOwnProperty.call(params, kdx)) {
      qs += '&' + kdx + '=' + encodeURIComponent(params[kdx]);
    }
  }
  $.get(HVIURL + qs);
  setTimeout(function () {
    model.update();
    hviRefreshAllTags();
    if (document.getElementById('editPlayerBox') && hviEditorSlot) {
      hviRenderEditor();
    }
  }, 1500);
}

function hviSubmitRating() {
  var el = document.getElementById('newRating');
  if (!el || el.value.length == 0) {
    return;
  }
  hviOp({ rating: el.value, name: hviEditorSlot.playerName() });
}

function hviSubmitName() {
  var el = document.getElementById('newName');
  if (!el || el.value.length == 0) {
    return;
  }
  hviOp({ change: 'name', newname: el.value });
}

function hviAddBadge() {
  var el = document.getElementById('newBadge');
  if (!el) {
    return;
  }
  var badge = String(el.value).replace(/^\s+|\s+$/g, '');
  if (!/^[A-Za-z0-9_-]{1,24}$/.test(badge)) {
    return;
  }
  hviOp({ change: 'badge', badge: badge, action: 'add' });
}

function hviRemoveBadge(badge) {
  hviOp({ change: 'badge', badge: badge, action: 'remove' });
}

var hviNotesBoxes = {};
var hviNotesZ = 20;

function notesBox(slot) {
  if (slot.ai()) {
    return;
  }
  hviTargetId(slot, function (id) {
    if (!id) {
      return;
    }
    var key = String(id).replace(/\W/g, '');
    if (!key) {
      return;
    }
    var existing = document.getElementById('hviNotesBox_' + key);
    if (existing) {
      existing.style.zIndex = String(++hviNotesZ);
      return;
    }
    var name = slot.playerName() || '';
    hviNotesBoxes[key] = { target: String(id), name: name, note: '' };
    setNotesBox(key, name);
    var el = document.getElementById('hviNotesBox_' + key);
    if (el) {
      el.style.zIndex = String(++hviNotesZ);
    }
    fetchNotesPopup(key);
  });
}

function fetchNotesPopup(key) {
  var box = hviNotesBoxes[key];
  if (!box) {
    return;
  }
  $.ajax({
    url: HVIURL + "case=4&uberid=" + encodeURIComponent(box.target) +
      "&authentication=" + encodeURIComponent(model.uberId()) +
      "&password=" + encodeURIComponent(hviPassword()),
    dataType: 'json',
    timeout: 5000,
    success: function (d) {
      if (!hviNotesBoxes[key]) {
        return;
      }
      box.note = (d && typeof d.note === 'string') ? d.note : '';
      var ta = document.getElementById('hviNotesInput_' + key);
      if (ta) {
        ta.value = box.note;
      }
    }
  });
}

function hviNotesClose(key) {
  delete hviNotesBoxes[key];
  var el = document.getElementById('hviNotesBox_' + key);
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

function hviSubmitNotesPopup(key) {
  var box = hviNotesBoxes[key];
  var el = document.getElementById('hviNotesInput_' + key);
  if (!box || !el) {
    return;
  }
  var qs = 'case=1&uberid=' + encodeURIComponent(box.target) +
    '&authentication=' + encodeURIComponent(model.uberId()) +
    '&password=' + encodeURIComponent(hviPassword()) +
    '&change=note&note=' + encodeURIComponent(el.value);
  $.get(HVIURL + qs);
}
