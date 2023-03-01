//import from homepage
//import { JsxFlags } from 'typescript';
import { primaryColor } from "./homepage.js";
import { secondaryColor } from "./homepage.js";
import { exportGroupList } from "./homepage.js";
import { typeCollectionList } from "./typeData.js";

  // @ts-ignore: Unreachable code error
//import tinycolor from "/plugin/tinycolor.js";



///// FOR TYPE PAGE
var filterLanguages: String[] = [];
var buttonBools: boolean[] = [false, false, false];
//var Clicked: boolean = false;
//

//GENERATE OBJECTS IN TYPE GRID
//NEW PART, where each type object is created via code
//var typeType = "none";
//getting the typeGrid element
var typeGridBody = document.getElementById("typeGrid");
var newTypeHtml = "";

for (var i = 0; i < typeCollectionList.length; i++) {
  //checking which language is the type
  //then add the corresponding name to the class names of the div
  var typeString = "type";
  var typeLang = typeCollectionList[i].language;
  for (var j = 0; j < typeLang.length; j++) {
    if (typeLang[j] == "hanzi") {
      typeString = typeString + " hanzi";
    } else if (typeLang[j] == "kana") {
      typeString = typeString + " kana";
    } else if (typeLang[j] == "latin") {
      typeString = typeString + " latin";
    }
  }

  //this string can be rebuilt
  var thisTypeHtml =
    '<div class="' +
    typeString +
    '">' +
    '<div class="typeDiv">' +
    '<div class = "typeBackground"></div>' +
    '<p class = "typeTitle">' +
    typeCollectionList[i].name +
    "</p>" +
    '<p class = "typeText typeQuote">' +
    typeCollectionList[i].quote +
    "</p>" +
    '<p class = "typeText typeSource">' +
    typeCollectionList[i].source +
    "</p>" +
    "</div>" +
    '<img class= "typeImage" src="' +
    typeCollectionList[i].image +
    '"/>' +
    "</div>";
  console.log(thisTypeHtml);
  newTypeHtml = newTypeHtml + thisTypeHtml;
}

//console.log(newTypeHtml);

//
//
//finding all type elements, check which language family the type belongs to
var TypeList = document.getElementsByClassName("type");
var TypeButtonList = document.getElementsByClassName("button-type");
//console.log(TypeButtonList);

//TEST DANGERIOUS
typeGridBody!.innerHTML = newTypeHtml;

//TYPE IMAGES ADD EVENT LISTENERS
for (var i = 0; i < TypeList.length; i++) {
  try {
    var matchingType = typeCollectionList[i];
    const imageElement = TypeList[i].querySelector(".typeImage") as HTMLElement;
    const a = imageElement!.previousElementSibling;

    (a!.querySelector(".typeTitle") as HTMLElement)!.style.color =
      matchingType.colorS;
    (a!.querySelector(".typeQuote") as HTMLElement)!.style.color =
      matchingType.colorS;
    (a!.querySelector(".typeSource") as HTMLElement)!.style.color =
      matchingType.colorS;
    (a!.querySelector(
      ".typeBackground"
    ) as HTMLElement)!.style.backgroundColor = matchingType.color;
    //a!.HasText = true;
    // groupDetailed.push(g.name);
    //var imageElement = TypeList[i].querySelector("#" + g.name);
    //var a = imageElement.previousElementSibling;
    imageElement!.addEventListener("mouseover", function () {
      imageElement!.style.opacity = "0%";
      //imageElement.style.filter = "blur(5px)";
    });
    imageElement!.addEventListener("mouseleave", function () {
      imageElement!.style.opacity = "100%";
      //imageElement.style.filter = "none";
    });
  } catch {
    console.log("corresponding html element not found,\n something went wrong");
  }
}

//THIS FILTERS type
function filterType(clickedButton: HTMLElement, language: string) {
  //check if filter list already has the target language
  //if no, then add it to the filter list
  if (filterLanguages.includes(language) === false) {
    filterLanguages.push(language);
    //console.log(filterLanguages);
  }
  //if yes, then remove the language
  else if (filterLanguages.includes(language) === true) {
    var index = filterLanguages.indexOf(language);
    filterLanguages.splice(index, 1);
    //console.log(filterLanguages);
  }

  //check through each element to see if the filter type
  //by default, everything is turned on

  for (var i = 0; i < TypeList.length; i++) {
    (TypeList[i] as HTMLElement).style.display = "block";

    //filterLanguages are the languages that types should match and display
    //if typeImages don't match all the filterLanguages, set their display to none
    //checking through each filter language
    var matchingNum = 0;
    filterLanguages.forEach(function (filteredLang) {
      //check through class list of the element
      var elementClassList = TypeList[i].classList;
      //check through each class name of typeImage
      //if a match takes place, add one to matchingNum
      for (var j = 0; j < elementClassList.length; j++) {
        if (elementClassList[j] == filteredLang) {
          matchingNum++;
          //console.log(TypeList[i].className + " chekcing: " + elementClassList[j] + " == " + filteredLang);
        }
      }

      //turn off objects that don't have class names matching
    });
    if (matchingNum == filterLanguages.length) {
    } else {
      (TypeList[i] as HTMLElement).style.display = "none";
    }
  }
  //this is for pure string building, does not perform anything on the web
  var filterList: String[] = [];
  filterLanguages.forEach(function (element) {
    filterList.push(element);
  });
  console.log("filter " + "[ " + filterList + " ]");
}

var btnPrimaryColor: string;
var btnSecondaryColor: string;

//here is setting all the buttons
//for each button, add onclick function
for (var i = 0; i < TypeButtonList.length; i++) {
  let btn: HTMLElement = <HTMLElement>TypeButtonList.item(i);

  //
  //var btnClicked: boolean = buttonBools[i];
  //console.log(buttonBools[i]);

  //translating button text to type
  //according to what the button says, add according keys
  var k = "a";
  if (btn!.textContent == "漢字") {
    k = "hanzi";
  } else if (btn!.textContent == "かな") {
    k = "kana";
  } else if (btn!.textContent == "Latin") {
    k = "latin";
  }
  const key = k.toString();

  //!!!!!! BECAUSE THERE IS AN ISSUE WITH TINYCOLOR IMPORT
  //!!!!! NEXT LINE WILL BE IGNORED AS OF RIGHT NOW
  // @ts-ignore: Unreachable code error
  var primaryColorTiny = tinycolor(primaryColor);
  // @ts-ignore: Unreachable code error

  var secondaryColorTiny = tinycolor(secondaryColor);
  //console.log(primaryColorTiny.isLight());

  //if the color is too light and not readable, switch the colors
  // !! cannot have two light colors, otherwise tinycolor won't read
  if (primaryColorTiny!.isLight() == true) {
    if(secondaryColorTiny!.isLight() == true){
      btnPrimaryColor = primaryColor;
      btnSecondaryColor = secondaryColor;
    }
    else{
      btnPrimaryColor = secondaryColor;
      btnSecondaryColor = primaryColor;
    }
    
  } else {
    btnPrimaryColor = primaryColor;
    btnSecondaryColor = secondaryColor;
  }
  //set initial button style
  (btn as HTMLElement).style.border = "2px solid " + btnPrimaryColor.toString();
  (btn as HTMLElement).style.background = "transparent";
  (btn as HTMLElement).style.color = btnPrimaryColor;

  //add eventlisteners
  addEventListenersToBtn(btn, key, buttonBools[i]);
}

//this function adds all the event listeners to the buttons
//parameters: btn is the button to modify, string is language of the button,
//            bool means if the button is clicked
function addEventListenersToBtn(btn: HTMLElement, key: string, bool: boolean) {
  //add click function
  btn!.addEventListener("click", function () {
    //console.log(buttonBools[i]);
    if (bool == false) {
      btnStyleIsClicked(btn, true);
      bool = true;
    }
    //when btn has been clicked
    else {
      bool = false;
      btnStyleIsClicked(btn, false);
    }
    filterType(btn, key);

    console.log(bool + " is btnclicked");
  });

  btn!.addEventListener("mouseover", function () {
    //console.log(buttonBools[i]);
    if (bool == false) {
      btnStyleIsClicked(btn, true);
    }
    //when btn has been clicked
    else {
      btnStyleIsClicked(btn, false);
    }
  });

  btn!.addEventListener("mouseleave", function () {
    if (bool == false) {
      btnStyleIsClicked(btn, false);
    }
    //when btn has been clicked
    else {
      btnStyleIsClicked(btn, true);
    }
  });
}

//this changes the button style when passing in true / false value
function btnStyleIsClicked(btn: HTMLElement, isClicked: boolean) {
  //console.log(primaryColorTiny);
  if (isClicked == false) {
    //this is the thinner style
    //console.log("2px solid " + btnPrimaryColor.toString());
    btn.style.border = "2px solid " + btnPrimaryColor.toString();
    btn.style.background = "transparent";
    btn.style.color = btnPrimaryColor;
  } else if (isClicked == true) {
    //this is the thicker style
    btn.style.border = "none";
    btn.style.background = btnPrimaryColor;
    btn.style.color = btnSecondaryColor;
  }
}
