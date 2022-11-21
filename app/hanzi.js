import { hanziGroups } from "./hanziData.js";
/**
class zi {
  zifu: string;
  strokes: number;
  base: string;
  constructor(zifu: string, strokes: number, base: string) {
    this.zifu = zifu;
    this.strokes = strokes;
    this.base = base;
  }
}*/
var hanziPageHtml = "";
//initilization
displayHanzi();
//
var flatHanziList = [];
flattenHanziGroupList();
function flattenHanziGroupList() {
    for (var i = 0; i < hanziGroups.length; i++) {
        for (var k = 0; k < hanziGroups[i].length; k++) {
            flatHanziList.push(hanziGroups[i][k]);
        }
    }
    // console.log(flatHanziList);
}
//
function displayHanzi() {
    var hanziHTML = "";
    //for each
    for (var i = 0; i < hanziGroups.length; i++) {
        //
        var hanziHTML = '<div class="hanziDisplayGroup" id=' +
            hanziGroups[i][0].code +
            ">" +
            '<div class="uniqueHanzi">' +
            hanziGroups[i][0].zifu +
            '<div class="strokeNum">' +
            hanziGroups[i][0].strokes +
            '</div></div><div class="subHanzi">' +
            hanziGroups[i][1].zifu +
            '<div class="strokeNum">' +
            hanziGroups[i][1].strokes +
            "</div></div>";
        //if there are more than two elements, keep appending
        if (hanziGroups[i].length > 2) {
            var timesToAppend = hanziGroups[i].length - 2;
            //foreach
            for (var j = 0; j < timesToAppend; j++) {
                hanziHTML =
                    hanziHTML +
                        '<div class="subHanzi">' +
                        hanziGroups[i][2 + j].zifu +
                        '<div class="strokeNum">' +
                        hanziGroups[i][2 + j].strokes +
                        "</div></div>";
            }
        }
        //
        //hanziHTML = hanziHTML + "</div>";
        hanziPageHtml = hanziPageHtml + hanziHTML + "</div>";
        //console.log(hanziPageHtml);
    }
}
//console.log(hanziPageHtml);
var hanziHtmlBody = document.getElementById("hanziFlex");
var input = "";
var replacedInput = "";
//bool to check if is picking hanzi
var isPicking = false;
var inputElement;
var dropdownBtnNewText;
hanziHtmlBody.innerHTML = hanziPageHtml;
addEventListeners();
//
//add searchHanzi function to the htmlelement
function addEventListeners() {
    //add eventlistener to the search bar
    //
    document
        .getElementById("searchInput")
        ?.addEventListener("keyup", function () {
        //
        searchHanzi();
        inputElement = document.getElementById("searchInput");
        input = inputElement.value;
    });
    //add event listeners to style change btns
    document.getElementById("btnLight").addEventListener("click", function () {
        inputElement = document.getElementById("searchInput");
        input = inputElement.value;
        replacedInput = input.toString();
        console.log(input);
        //replace characters
        replaceHanzi("light");
        //console.log(replacedInput);
        inputElement.value = replacedInput;
    });
    document.getElementById("btnHeavy").addEventListener("click", function () {
        var inputElement = document.getElementById("searchInput");
        input = inputElement.value;
        replacedInput = input.toString();
        console.log(input);
        //replace characters
        replaceHanzi("heavy");
        //console.log(replacedInput);
        inputElement.value = replacedInput;
    });
    //add event listeners to all hanzi
    //find the hanzi elements
    var array1 = Array.prototype.slice.call(document.getElementsByClassName("uniqueHanzi"), 0);
    var array2 = Array.prototype.slice.call(document.getElementsByClassName("subHanzi"), 0);
    var hanziElementList = array1.concat(array2);
    //
    //foreach adding id to the list
    for (var i = 0; i < hanziElementList.length; i++) {
        hanziElementList[i].setAttribute("id", hanziElementList[i].innerHTML[0]);
        //console.log(hanziElementList[i][0]);
    }
    //
    //console.log(hanziElementList);
    //foreach
    for (let i = 0; i < hanziElementList.length; i++) {
        hanziElementList[i].addEventListener("click", function () {
            //find the chracter in input
            var inputElement = document.getElementById("searchInput");
            input = inputElement.value;
            var hanziId = hanziElementList[i].id;
            //console.log(hanziId);
            let replacement = hanziElementList[i].id;
            var hanziToReplace = "";
            replacedInput = inputElement.value.toString();
            //find the hanziGroup linking to the replacement
            var selectedHanziGroup = [];
            for (var k = 0; k < hanziGroups.length; k++) {
                for (var j = 0; j < hanziGroups[k].length; j++) {
                    var result = hanziGroups[k].filter((obj) => {
                        return obj.zifu === replacement;
                    });
                    if (result.length != 0) {
                        selectedHanziGroup = hanziGroups[k];
                    }
                }
            }
            //console.log(selectedHanziGroup);
            //find if any of the hanzi in the group exists in the input
            for (var k = 0; k < input.length; k++) {
                for (var j = 0; j < selectedHanziGroup.length; j++) {
                    if (input[k] == selectedHanziGroup[j].zifu) {
                        hanziToReplace = input[k];
                    }
                }
            }
            //find the character to be replaced
            //replacing
            if (input != "") {
                //console.log(replacement);
                //console.log(hanziToReplace);
                replacedInput = replacedInput.replace(hanziToReplace, replacement);
                inputElement.value = replacedInput;
                console.log(replacedInput);
            }
        });
        hanziElementList[i].addEventListener("mouseover", function () {
            //
            hanziElementList[i].style.backgroundColor = "var(--secondaryColor)";
            hanziElementList[i].style.color = "var(--primaryColor)";
        });
        hanziElementList[i].addEventListener("mouseleave", function () {
            //
            hanziElementList[i].style.backgroundColor = "var(--primaryColor)";
            hanziElementList[i].style.color = "var(--secondaryColor)";
        });
    }
    //add hover eventlistener
    //console.log("clicked");
    //
    //add eventlistener to the dropdown btns
    //find the dropdown selector first, which is the element that contains all the filters
    let dropdownSelector = document.getElementById("dropdownSelector");
    let dropdownBtn = document.getElementById("dropdownBtn");
    let dropdownFilters = Array.from(document.getElementsByClassName("dropdownFilters"));
    //add hover effect on dropdownselector
    for (let i = 0; i < dropdownFilters.length; i++) {
        //add click to filter
        dropdownFilters[i]?.addEventListener("click", function () {
            //!! FUNCITON
            //change text displayed on the button
            dropdownBtnNewText = dropdownFilters[i].innerHTML;
            //get the text in the dropdownBtn element
            var firstLine = dropdownBtn.innerText.split("\n")[0];
            filterHanzi(dropdownBtnNewText);
            //replace text
            var text_to_change = dropdownBtn.childNodes[0];
            text_to_change.nodeValue = dropdownBtnNewText;
            //
            dropdownFilters[i].childNodes[0].nodeValue = firstLine;
            //
            //end of click event listener
        });
        //visual hover effect
        dropdownFilters[i]?.addEventListener("mouseleave", function () {
            dropdownFilters[i].style.backgroundColor = "var(--primaryColor)";
            dropdownFilters[i].style.color = "var(--secondaryColor)";
        });
        dropdownFilters[i]?.addEventListener("mouseenter", function () {
            //
            dropdownFilters[i].style.backgroundColor = "var(--secondaryColor)";
            dropdownFilters[i].style.color = "var(--primaryColor)";
        });
    }
    //add eventlistener for click
    dropdownBtn?.addEventListener("click", function () {
        //
        dropdownSelector.style.display = "block";
    });
    //add eventlistener for moving mouse in and out
    dropdownBtn?.addEventListener("mouseleave", function () {
        //
        dropdownSelector.style.display = "none";
        dropdownBtn.style.backgroundColor = "var(--primaryColor)";
        dropdownBtn.style.color = "var(--secondaryColor)";
    });
    dropdownBtn?.addEventListener("mouseenter", function () {
        //
        dropdownBtn.style.backgroundColor = "var(--secondaryColor)";
        dropdownBtn.style.color = "var(--primaryColor)";
    });
}
//console.log(hanziElementList);
function inputHasText() {
    if (input == "") {
        return false;
    }
    else {
        return true;
    }
}
//get all hanziDisplayGroups for filter action
var hanziFlexChildren = document.getElementsByClassName("hanziDisplayGroup");
//
function filterHanzi(filterKeyword) {
    //
    console.log(filterKeyword);
    switch (filterKeyword) {
        case "#显示全部#":
            // code block
            for (let i = 0; i < hanziFlexChildren?.length; i++) {
                hanziFlexChildren[i].style.display = "flex";
            }
            break;
        case "#基础改动#":
            displayHanzi();
            for (let i = 0; i < hanziFlexChildren?.length; i++) {
                hanziFlexChildren[i].style.display = "flex"; //resetting
                if (hanziFlexChildren[i].id[1] != "A") {
                    hanziFlexChildren[i].style.display = "none";
                }
            }
            break;
        case "#改动中#":
            // code block
            for (let i = 0; i < hanziFlexChildren?.length; i++) {
                hanziFlexChildren[i].style.display = "flex";
            }
            break;
        case "#笔划加重#":
            // code block
            for (let i = 0; i < hanziFlexChildren?.length; i++) {
                hanziFlexChildren[i].style.display = "flex"; //resetting
                if (hanziFlexChildren[i].id[2] != "H") {
                    hanziFlexChildren[i].style.display = "none";
                }
            }
            break;
        case "#笔划减轻#":
            // code block
            for (let i = 0; i < hanziFlexChildren?.length; i++) {
                hanziFlexChildren[i].style.display = "flex"; //resetting
                if (hanziFlexChildren[i].id[2] != "L") {
                    hanziFlexChildren[i].style.display = "none";
                }
            }
            break;
    }
}
function replaceHanzi(inputFilter) {
    //replace characters
    for (var k = 0; k < input.length; k++) {
        //check through each group in the group list, and through each iteration in the group
        for (var i = 0; i < hanziGroups.length; i++) {
            for (var j = 0; j < hanziGroups[i].length; j++) {
                //
                if (input[k] == hanziGroups[i][j].zifu) {
                    //check if the entered value equals any of the exisitng characters in database
                    //if only one iteration
                    var replacement = "";
                    if (hanziGroups[i].length < 3) {
                        if (hanziGroups[i][0].strokes < hanziGroups[i][1].strokes) {
                            if (inputFilter == "light") {
                                replacement = hanziGroups[i][0].zifu;
                            }
                            else if (inputFilter == "heavy") {
                                replacement = hanziGroups[i][1].zifu;
                            }
                        }
                        else {
                            if (inputFilter == "light") {
                                replacement = hanziGroups[i][1].zifu;
                            }
                            else if (inputFilter == "heavy") {
                                replacement = hanziGroups[i][0].zifu;
                            }
                        }
                    }
                    replacedInput = replacedInput.replace(input[k], replacement);
                }
            }
        }
    }
}
function searchHanzi() {
    //clear previous search result
    //
    var inputElement = document.getElementById("searchInput");
    var hanziFlexElement = document.getElementById("hanziFlex");
    var input = inputElement.value;
    //foreach
    //for only one char
    if (input.length == 0) {
        for (var i = 0; i < hanziGroups.length; i++) {
            //set everything display to fle
            hanziFlexElement.children[i].style.display = "flex";
        }
    }
    else if (input.length > 0) {
        //set everything to none first
        for (var i = 0; i < hanziGroups.length; i++) {
            hanziFlexElement.children[i].style.display = "none";
        }
        //foreach; for multiple characters, check through each
        for (var k = 0; k < input.length; k++) {
            //foreach; check through each hanziGroup
            for (var i = 0; i < hanziGroups.length; i++) {
                for (var j = 0; j < hanziGroups[i].length; j++) {
                    //
                    //if one of the results match, set the display to block
                    if (input[k] == hanziGroups[i][j].zifu) {
                        hanziFlexElement.children[i].style.display =
                            "flex";
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=hanzi.js.map