function dragElement(inputBox) {
    var position1 = 0, position2 = 0, position3 = 0, position4 = 0;
    if (document.getElementById(inputBox.id + "header")) {
        document.getElementById(inputBox.id + "header").onmousedown = dragMouseDown;
    } else {
        inputBox.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        position3 = e.clientX;
        position4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        position1 = position3 - e.clientX;
        position2 = position4 - e.clientY;
        position3 = e.clientX;
        position4 = e.clientY;
        inputBox.style.top = (inputBox.offsetTop - position2) + "px";
        inputBox.style.left = (inputBox.offsetLeft - position1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function setNotesBox(key, playerName) {
    var id = 'hviNotesBox_' + key;
    if (document.getElementById(id)) {
        return;
    }
    $('title').after(
        '<div class="hviNotesBox" id="' + id + '">' +
        '<div class="hvi-notes-header" id="' + id + 'header">' +
        '<span class="hvi-notes-title">' + hviAttr(playerName) + ' Note</span>' +
        '<span class="hvi-notes-actions">' +
        '<button type="button" onclick="hviNotesClose(\'' + key + '\')"><small>X</small></button>' +
        '</span>' +
        '</div>' +
        '<textarea class="hvi-notes-input" id="hviNotesInput_' + key + '" rows="4" readonly></textarea>' +
        '</div>');
    dragElement(document.getElementById(id));
}
