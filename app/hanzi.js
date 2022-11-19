"use strict";
//
class zi {
    constructor(zifu, strokes, base) {
        this.zifu = zifu;
        this.strokes = strokes;
        this.base = base;
    }
}
/*
var hanziList: zi[] = [
  new zi("大", 3, "大"),
  new zi("眔", 10, "大"),
  new zi("小", 3, "小"),
  new zi("皛", 15, "小"),
  new zi("就", 12, "就"),
  new zi("丩", 2, "就"),
];* */
var hanziGroups = [
    [new zi("大", 3, "大"), new zi("眔", 10, "大")],
    [new zi("小", 3, "小"), new zi("皛", 15, "小")],
    [new zi("心", 3, "心"), new zi("杺", 13, "心")],
    [new zi("就", 12, "就"), new zi("丩", 2, "就")],
    [new zi("無", 12, "無"), new zi("无", 4, "無")],
    [new zi("土", 3, "土"), new zi("嵞", 13, "土")],
];
//data structure: 2-3 x zi => Group => dataList
//var hanziGroups: Array<zi>[] = [];
//sortZi();
//console.log(hanziGroups);
//add new elements
///
var hanziPageHtml = "";
function displayHanzi() {
    //for each
    var hanziHTML = "";
    for (var i = 0; i < hanziGroups.length; i++) {
        //
        var hanziHTML = '<div class="hanziDisplayGroup">' +
            '<div class="uniqueHanzi">' +
            hanziGroups[i][0].zifu +
            '<div class="strokeNum">' +
            hanziGroups[i][0].strokes +
            "</div></div>" +
            '<div class="subHanzi">' +
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
        hanziHTML = hanziHTML + "</div>";
        hanziPageHtml = hanziPageHtml + hanziHTML;
        //console.log(hanziPageHtml);
    }
}
displayHanzi();
//console.log(hanziPageHtml);
var hanziHtmlBody = document.getElementById("hanziFlex");
hanziHtmlBody.innerHTML = hanziPageHtml;
//
/*
//first combine characters into groups
function sortZi() {
  for (var i = 0; i < hanziList.length; i++) {
    //checking each unique character
    if (hanziList[i].base == hanziList[i].zifu) {
      //
      var emptyArray: zi[] = [];
      hanziGroups.push(emptyArray);

      for (var j = 0; j < hanziList.length; j++) {
        //check the substitudes of the unique character
        if (hanziList[j].base == hanziList[i].zifu) {
          //getting last element in the hanziGroup
          hanziGroups[hanziGroups.length - 1].push(hanziList[j]);
        }
      }
    }
  }
}
*/
//add searchHanzi function to the htmlelement
document.getElementById("searchInput")?.addEventListener("keyup", function () {
    //
    searchHanzi();
});
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