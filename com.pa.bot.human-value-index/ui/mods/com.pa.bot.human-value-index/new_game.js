const HVIURL = 'http://nuttygroup.org:27395/?';
function getWordRating(rating) {
  if (rating <= 3) {
    return "Bad";
  }
  else if (rating <= 5) {
    return "Casual";
  }
  else if (rating <= 7) {
    return "Good";
  }
  return "Very Good";
}

var updateindex = ko.observable(0);

model.determineAuth = function (){
  $.getJSON(HVIURL + "case=3&authentication=" + model.uberId(), function (result) {
    auth(result);
  })
}
var auth = ko.observable();
model.determineAuth();

model.update = function () {
  $.get(HVIURL, function (update) {
    if(update != updateindex()){
      updateindex(update);
    }
  });
};
setInterval(function(){model.update();}, 10000);
model.humanRatings = function (slot) {
  var value = ko.observable();
  function get() {
    $.getJSON(HVIURL + "case=0&uberid=" + slot.playerId() + "&name=" + slot.playerName(), function (profile) {
      if (profile.name != "not registered") {
        value(((slot.playerName() == profile.name) ? "" : "(" + profile.name + ") | ") + profile.rating + ", " + getWordRating(profile.rating));
      }
      else if(auth() == true) {
        value("C");
      }
      else {
        value("");
      }
    })
  }
  get();
  updateindex.subscribe(function(){
      get();
  });
  return { value: value};
}

$('div.slot-player-text.truncate').after(
  '<!-- ko if: (!slot.ai() &&(slot.playerId() > 33) && slot.isPlayer() && (typeof slot.playerId() != "undefined"))-->\
     <!-- ko with: model.humanRatings(slot) -->\
      <small data-bind="click: function(){editBox(slot)}"><small data-bind="text:value"></small></small>\
      <!-- /ko --><!-- /ko -->')

function editBox(slot) {
  if(!auth()){
    return
  }
  setInputBox();
  document.getElementById("editPlayerBoxheader").innerHTML = '<h3>Editing ' + slot.playerName() + "</h3>";
  document.getElementById("data").innerHTML = '<input type="number" id="newRating" placeholder="Enter New Rating" autocomplete="off" autofocus />' +
    '<button type="button" onclick="' +
    'console.log(document.getElementById(\'newRating\').value); ' +
    'document.getElementById(\'newRating\').value.length == 0 ? ' +
    'document.getElementById(\'newRating\').value = \'\' : ' +
    'toServer(\'1\',\'' + slot.playerId() + '\',document.getElementById(\'newRating\').value,\'' + slot.playerName() + '\',\'' + model.uberId() + '\');">' +
    '<small>Submit</small></button>' +
    '<br>' +
    '<button type="button" id="closeButton" onclick="document.getElementById(\'editPlayerBox\').remove()"><small>X</small></button>';
}


function toServer(caseNum, id, rating, name) {
  $.get(HVIURL + "case=" + caseNum + "&uberid=" + id + "&rating=" + rating + "&name=" + name + "&authentication=" + model.uberId());
  setTimeout(function(){model.update()}, 2000);
}
