// const HVIURL = 'http://nuttygroup.org:27395/?';
const HVIURL = 'http://10.44.0.7:11280/?';
// 'http://10.44.0.7:11280/?';
// 'http://nuttygroup.org:27395/?';
const HVILOCAL = 'http://127.0.0.1:27395/';

var hviRefreshTags = [];
var hviLocalUp = false;
var hviLocalPingTimer = null;

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

function hviRefreshAllTags() {
  for (var idx = 0; idx < hviRefreshTags.length; idx++) {
    try {
      hviRefreshTags[idx]();
    } catch (e) {}
  }
}

var updateindex = ko.observable(0);

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
}, 20000);

(function hviSeedLocal() {
  try {
    if (window.localStorage.getItem('hvi_local_up') === '1') {
      hviLocalUp = true;
    }
  } catch (e) {}
})();

function hviSetLocalUp(up) {
  var was = hviLocalUp;
  hviLocalUp = !!up;
  try {
    window.localStorage.setItem('hvi_local_up', up ? '1' : '0');
  } catch (e) {}
  if (was !== hviLocalUp) {
    hviRefreshAllTags();
  }
}

function hviPingLocal() {
  $.ajax({
    url: HVILOCAL + 'ping',
    dataType: 'text',
    timeout: 1500,
    success: function (d) {
      if (String(d).indexOf('hvi-local') === 0) {
        hviSetLocalUp(true);
        if (hviLocalPingTimer) {
          clearInterval(hviLocalPingTimer);
          hviLocalPingTimer = null;
        }
      }
    },
    error: function () {
      hviSetLocalUp(false);
      if (!hviLocalPingTimer) {
        hviLocalPingTimer = setInterval(hviPingLocal, 10000);
      }
    }
  });
}
hviPingLocal();

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
  var ratingSep = ko.observable('');
  var linePrefix = ko.observable('');
  var lineSep = ko.observable('');
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

    if (showHviName) {
      lineSep(' | ');
      linePrefix(lastHviName);
    } else {
      lineSep('');
      linePrefix('');
    }

    if (lastRating && (name || showHviName)) {
      ratingSep(' | ');
      ratingLine(lastRating);
    } else {
      ratingSep('');
      ratingLine('');
    }

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
      url: HVIURL + "case=0&uberid=" + encodeURIComponent(gotPlayerId) + "&name=" + encodeURIComponent(slot.playerName()) + "&authentication=" + encodeURIComponent(String(model.uberId() || '')),
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
        } else if (hviLocalUp) {
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
      url: HVIURL + "case=4&uberid=" + encodeURIComponent(gotPlayerId) + "&authentication=" + encodeURIComponent(String(model.uberId() || '')),
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
        lastRating = hviLocalUp ? 'C' : '';
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
    slot.__hviRatings = { badges: badges, ratingLine: ratingLine, ratingSep: ratingSep, linePrefix: linePrefix, lineSep: lineSep, ratingClass: ratingClass };
  return slot.__hviRatings;
};

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
  '<span class="hvi-sep" data-bind="text: lineSep"></span>' +
  '<span class="hvi-prefix" data-bind="text: linePrefix"></span>' +
  '<span class="hvi-sep" data-bind="text: ratingSep"></span>' +
  '<span class="hvi-ratingline" data-bind="text: ratingLine, css: ratingClass"></span>' +
  '</span>' +
  hviKoClose);

function editBox(slot) {
  if (slot.ai()) {
    return;
  }
  if (!hviLocalUp) {
    hviPingLocal();
    return;
  }
  hviTargetId(slot, function (id) {
    if (!id) {
      return;
    }
    $.ajax({
      url: HVILOCAL + 'open?' + $.param({
        uberid: String(id),
        editor: String(model.uberId())
      }),
      dataType: 'text',
      timeout: 2000,
      error: function () {
        hviSetLocalUp(false);
        hviPingLocal();
      }
    });
  });
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
    url: HVIURL + "case=4&uberid=" + encodeURIComponent(box.target) + "&authentication=" + encodeURIComponent(String(model.uberId() || '')),
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

model.update();
hviRefreshAllTags();
