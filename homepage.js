import { typeCollectionList } from "./typeData.js";
//var r = document.querySelector(":root") as HTMLElement;
var TypeGroupList = typeCollectionList;
//adding load screen poems
var loadTexts = [];
loadTexts.push("髣髴兮若輕雲之蔽月飄颻兮若流風之迴雪");
loadTexts.push("關關雎鳩在河之洲窈窕淑女君子好逑");
console.log(loadTexts);
//priting last element in the groupList array
var recentType;
//!!! NEW: get a list of types to show on homepage
var TypeGroupListToDisplay = [];
for (var i = 0; i < TypeGroupList.length; i++) {
    if (TypeGroupList[i].homeDisplay == true) {
        TypeGroupListToDisplay.push(TypeGroupList[i]);
    }
}
//shuffle the elements and select 8 of them
for (var i = TypeGroupListToDisplay.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = TypeGroupListToDisplay[i];
    TypeGroupListToDisplay[i] = TypeGroupListToDisplay[j];
    TypeGroupListToDisplay[j] = temp;
}
TypeGroupListToDisplay.splice(4);
var HomePageGridHTML = "";
for (var i = 0; i < TypeGroupListToDisplay.length; i++) {
    var thisTypeHtml = '<div class = "HomepageGridGroup scrollHidden" style = "color:  ' + TypeGroupListToDisplay[i].color + '; stop-color: ' + TypeGroupListToDisplay[i].colorS + ' ">' +
        '<img id = "homepageImage" class = "imageHidden" src="' + TypeGroupListToDisplay[i].image + '"/>' +
        '<div id = "homepageQuote" style = "color:' + TypeGroupListToDisplay[i].colorS + '">' + TypeGroupListToDisplay[i].quote + '</div>' +
        '<div id = "homepageSource" style = "color:' + TypeGroupListToDisplay[i].colorS + '">' + TypeGroupListToDisplay[i].source + '</div>' +
        '</div>';
    HomePageGridHTML = HomePageGridHTML + thisTypeHtml;
}
var ScrollGrid = document.getElementById("ScrollGrid");
try {
    ScrollGrid.innerHTML = HomePageGridHTML;
}
catch { }
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        console.log(entry);
        if (entry.isIntersecting) {
            entry.target.classList.add('scrollShow');
            //change background color
            ScrollGrid.style.backgroundColor = window.getComputedStyle(entry.target).getPropertyValue("color");
            ;
            //get image element and set it to show
            let ImageChild = entry.target.firstElementChild;
            ImageChild?.classList.add('imageShow');
            ReApplyHeaderColors(window.getComputedStyle(entry.target).getPropertyValue("stop-color"), window.getComputedStyle(entry.target).getPropertyValue("color"));
        }
        else {
            entry.target.classList.remove('scrollShow');
            let ImageChild = entry.target.firstElementChild;
            ImageChild?.classList.remove('imageShow');
        }
    });
});
const hiddenElements = document.querySelectorAll('.scrollHidden');
hiddenElements.forEach((el => observer.observe(el)));
const HeaderTitles = Array.from(document.querySelectorAll('.tt1'));
function ReApplyHeaderColors(typeColorPrimary, typeColorSecondary) {
    document.documentElement.style.setProperty("--secondaryColor", typeColorPrimary);
    document.documentElement.style.setProperty("--primaryColor", typeColorSecondary);
}
//checking if the user is visiting this page the first time
if (sessionStorage.getItem("recentColor") == null) {
    console.log("WELCOME");
    var getGroupIndex = 0;
    recentType = TypeGroupList[getGroupIndex];
    //check if the item can be displayed:
    while (recentType.homeDisplay == false) {
        getGroupIndex++;
        recentType = TypeGroupList[getGroupIndex];
    }
}
else {
    //var p = sessionStorage.getItem("recentColor");
    //var s = sessionStorage.getItem("recentColorS");
    var returnTypeName = sessionStorage.getItem("typeName");
    console.log("typeName is " + returnTypeName);
    //initializing
    var selectedGroup = TypeGroupList[0];
    //find the typeObject by checking if names match
    for (var i = 0; i < TypeGroupList.length; i++) {
        if (returnTypeName == TypeGroupList[i].name) {
            selectedGroup = TypeGroupList[i];
        }
    }
    console.log();
    recentType = selectedGroup;
}
//HOMEPAGE BTNS
//refresh btn
const homepageBtnRefresh = document.getElementById('homepageBtnRefresh');
homepageBtnRefresh?.addEventListener('click', () => {
    window.location.reload();
    //window.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo(0, 0);
});
const homepageBtnAbout = document.getElementById('homepageBtnAbout');
homepageBtnAbout?.addEventListener('click', () => {
    window.location.href = 'index-about.html';
});
console.log(recentType);
//for homepage
try {
    LoadHomepage();
    //adding eventlistener to button
    document
        .getElementById("homepageBtn")
        .addEventListener("click", function () {
        //Reroll();
        //document.getElementById('homepageBtn').style.scale = "1";
    });
}
catch { }
//on other pages
try {
    document.getElementById("homeBtnText").textContent = recentType.name;
    //document.getElementById('homeBtnText').textContent = recent.name[0];
    document
        .getElementById("homeBtn")
        .addEventListener("mouseover", function () {
        //document.getElementById('home').style.backgroundColor = "#ffffff";
        var homeBtn = document.getElementById("homeBtn");
        var homeBtnText = document.getElementById("homeBtnText");
        //document.getElementById('homeBtn')!.style.scale = "1.5";
        homeBtnText.style.left = "0";
        homeBtnText.style.letterSpacing = "-0.6vw";
        homeBtnText.style.fontSize = "4.4vw";
        homeBtn.style.padding = "0px 0px";
        homeBtn.style.scale = "1.5";
    });
    document
        .getElementById("homeBtn")
        .addEventListener("mouseleave", function () {
        //document.getElementById('home').style.backgroundColor = recent.color;
        var homeBtn = document.getElementById("homeBtn");
        var homeBtnText = document.getElementById("homeBtnText");
        document.getElementById("homeBtn").style.scale = "0.9";
        document.getElementById("homeBtnText").style.left = "-2.5vw";
        document.getElementById("homeBtnText").style.letterSpacing = "-5vw";
        homeBtnText.style.fontSize = "5vw";
        homeBtn.style.padding = "0vw 4vw";
    });
}
catch { }
function LoadHomepage() {
    //setting transition
    var transitionDelay = 300;
    document.getElementById("homepageGroup").style.transition =
        transitionDelay + "ms";
    //set transition
    document.getElementById("homepageImage").style.transition = "none";
    document.getElementById("homepageImage").style.opacity = "0%";
    //var imageElement: HTMLImageElement = document.getElementById('homepageImage');
    document.getElementById("homepageImage").src =
        recentType.image;
    document.getElementById("homepageGroup").style.background = recentType.color;
    document.getElementById("homepageQuote").textContent = recentType.quote;
    document.getElementById("homepageQuote").style.color = recentType.colorS;
    document.getElementById("homepageSource").textContent = recentType.source;
    document.getElementById("homepageSource").style.color = recentType.colorS;
    document.getElementById("homepageFooter").textContent =
        recentType.name + " 更新于 " + recentType.date.toDateString();
    //for javascriopt
    //r!.style.setProperty('--primaryColor', recent.color);
    //r!.style.setProperty('--secondaryColor', recent.colorS);
    //for typescript
    document.documentElement.style.setProperty("--primaryColor", recentType.color);
    document.documentElement.style.setProperty("--secondaryColor", recentType.colorS);
    //add a load text animation when the image is loading
    var loadTime = 0;
    var rndIndex = Math.floor(Math.random() * loadTexts.length);
    var loadInterval = setInterval(function () {
        var loadObject = document.getElementById("homepageImageLoad");
        var loadText = loadTexts[rndIndex];
        loadObject.textContent = loadText[loadTime];
        loadObject.style.opacity = "100%";
        loadObject.style.filter = "blur(0px)";
        //if loadTime exceeds the string length
        if (loadTime + 1 >= loadText.length) {
            loadTime = 0;
        }
        else {
            loadTime++;
        } //simply add one
        setTimeout(function () {
            loadObject.style.opacity = "0%";
            //loadObject!.style.filter = "blur(3px)";
        }, 660);
    }, 1200);
    //clearInterval(loadInterval);  //stop loading interval
    //delay changing image, otherwise there will be an ungly box
    document.getElementById("homepageImage").addEventListener("load", () => {
        clearInterval(loadInterval); //stop loading interval
        //document.getElementById('homepageImage').style.transition = "800ms";
        //document.getElementById('homepageImage').style.opacity = "100%";
        setTimeout(() => {
            document.getElementById("homepageImage").style.transition = "800ms";
            document.getElementById("homepageImage").style.opacity = "100%";
        }, transitionDelay);
    });
}
//cloning recent type
const cloneRecent = Object.assign({}, recentType);
//the list for selecting group items
var rerollTypeList = [cloneRecent, cloneRecent, cloneRecent];
//console.log(rerollTypeList.includes(cloneRecent));
//
//!!! TO DELETE
//reroll function
// function Reroll() {
//   //document.getElementById('homepageImage').src = "type/blank.png";
//   //newRecent = null;
//   var rnd = Math.floor(Math.random() * TypeGroupList.length);
//   var newRecent = TypeGroupList[rnd];
//   //reroll until get a different value, and if the target can be displayed
//   while (
//     //recent == newRecent ||
//     newRecent.homeDisplay == false || //check to see the display option is on
//     typeIsDuplicate(newRecent) // check to see if the new reroll was rolled two items before
//   ) {
//     rnd = Math.floor(Math.random() * TypeGroupList.length);
//     newRecent = TypeGroupList[rnd];
//   }
//   //remove first element
//   //console.log(typeIsDuplicate + "  +  " + recent.name);
//   recentType = newRecent;
//   LoadHomepage();
//   //delete old element
//   rerollTypeList.shift();
//   //add new element to the end
//   rerollTypeList.push(Object.assign({}, recentType));
//   // console.log(
//   //   rerollTypeList[0].name +
//   //     ", " +
//   //     rerollTypeList[1].name +
//   //     ", " +
//   //     rerollTypeList[2].name
//   // );
//   //save "recent" data
//   var primaryColor = recentType.color;
//   var secondaryColor = recentType.colorS;
//   var typeName = recentType.name;
//   //storing the variables for revisiting the page
//   sessionStorage.setItem("recentColor", primaryColor);
//   sessionStorage.setItem("recentColorS", secondaryColor);
//   sessionStorage.setItem("typeName", typeName);
// }
//check arrary duplicate
function typeIsDuplicate(type) {
    var isDuplicate = false;
    //foreach
    for (var i = 0; i < rerollTypeList.length; i++) {
        if (rerollTypeList[i].name == type.name) {
            isDuplicate = true;
        }
    }
    return isDuplicate;
}
//don't know if these actually work
preloadImages();
function preloadImages() {
    TypeGroupList.forEach(function (g) {
        var img = new Image();
        img.src = g.image;
    });
}
//copy this part:
export var primaryColor = recentType.color;
export var secondaryColor = recentType.colorS;
export var exportGroupList = TypeGroupList;
export var exportRecent = recentType;
//copy this part:
//# sourceMappingURL=homepage.js.map