// var set = false;
function setInputBox() {
    if(document.getElementById('editPlayerBox')){
        return;
    }
    // if (set == true) {
    //     return;
    // }
    // set = true;
    $('title').after(
        '<div id="editPlayerBox">' +
        '<div id="editPlayerBoxheader">' +
        'Edits' +
        '</div>' +
        '<div id="data">' +
        '->' +
        '</div>' +
        '</div>');
    dragElement(document.getElementById("editPlayerBox"));

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
}