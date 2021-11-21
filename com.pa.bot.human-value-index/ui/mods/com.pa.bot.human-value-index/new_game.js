const antiCacheURL = 'http://nuttygroup.org:27394';
var allowed;
model.humanplayerProfiles = ko.observable();
function humanGetJSON() {
  $.getJSON(antiCacheURL + "/?case=4&" + Math.random(), function (tempProfiles) {
    model.humanplayerProfiles(tempProfiles);
  });
  console.log("updated");
  if (allowed != true) {
    $.get(antiCacheURL + "/?case=5&uberid=" + model.uberId() + "&" + Math.random(), function (data) {
      allowed = data;
    });
  }
};

setInterval(function(){humanGetJSON()},20000);
humanGetJSON();
//TODO: make hash map of players so i can not lag every player swap

model.humanGetType = function (profile) {
  if (!profile.isPlayer()) {
    return false;
  }
  return profile.ai() ? profile.aiPersonality() : profile.playerId();
}

model.humanRatings = function (profile) {
  return { newName: ko.observable(model.humanGetNameAndRating(model.humanGetType(profile), profile)), name: profile.playerName() }
};

model.humanGetNameAndRating = function (UberId, profile) {
  if (UberId == false || typeof UberId == "undefined" || UberId.length == 0) {
    return;
  }
  for (idx = 0; idx < Object.keys(model.humanplayerProfiles()).length; idx++) {
    if (UberId == Object.keys(model.humanplayerProfiles())[idx]) {
      var profileIdx = Object.keys(model.humanplayerProfiles())[idx];
      var newPlayerName = "";
      var PlayerRating;
      //getting name details
      if (model.humanplayerProfiles()[profileIdx].Names[0].toLowerCase() != profile.playerName().toLowerCase()) {
        newPlayerName = " (" + model.humanplayerProfiles()[profileIdx].Names[0] + ")";
      }
      //getting rating details
      PlayerRating = model.humanplayerProfiles()[profileIdx].Rating[model.humanplayerProfiles()[profileIdx].Rating.length - 1];
      return newPlayerName + " | " + PlayerRating + ", " + getWordRating(PlayerRating);
    }
  }
  return;
}

function getWordRating(rating) {
  if (rating <= 3) {
    return "Random";
  }
  else if (rating <= 5) {
    return "Casual";
  }
  else if (rating <= 7) {
    return "Good";
  }
  return "Very Good";
}

function editBox(playerName, id) {
  setInputBox();
  document.getElementById("editPlayerBoxheader").innerHTML = '<h3>Editing ' + playerName + "</h3>";
  document.getElementById("data").innerHTML = '<input type="number" id="newRating" placeholder="Enter New Rating" autocomplete="off" autofocus />' +
    '<button type="button" onclick="' +
    'console.log(document.getElementById(\'newRating\').value); ' +
    'document.getElementById(\'newRating\').value.length == 0 ? ' +
    'document.getElementById(\'newRating\').value = \'\' : ' +
    'dataToServer(\'0\',\'' + id + '\',\'' + playerName + '\',document.getElementById(\'newRating\').value); setTimeout(function(){humanGetJSON()}, 1500);;">' +
    '<small>Submit</small></button>' +
    '<br>' +
    '<button type="button" id="closeButton" onclick="document.getElementById(\'editPlayerBox\').remove()"><small>X</small></button>';
}

function dataToServer(decree, playerID, newPlayerName, newPlayerRating) {
  // console.log("decree = " + decree + " id = " + playerID + " new rating = " + newPlayerRating + " new name = " + newPlayerName);
  $.get("http://nuttygroup.org:27394/?case=" + decree + "&uberid=" + playerID + "&rating=" + newPlayerRating + "&name=" + newPlayerName);
}
$('div.slot-player-text.truncate').after(
  '<!-- ko with: model.humanRatings(slot) -->\
    <small data-bind="text: newName"></small>\
    <!-- /ko -->');

$('div.slot-player-commander').after(
  '<!-- ko if: (!slot.ai() && slot.isPlayer() && allowed)-->\
      <button id="testButton" data-bind="click: function (){editBox(slot.playerName(), model.humanGetType(slot))}">E</button>\
    <!-- /ko -->');