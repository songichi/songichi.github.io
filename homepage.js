import { typeCollectionList } from "./typeData.js";
//var r = document.querySelector(":root") as HTMLElement;
var groupList = typeCollectionList;
//adding load screen poems
var loadTexts = [];
loadTexts.push("髣髴兮若輕雲之蔽月飄颻兮若流風之迴雪");
loadTexts.push("關關雎鳩在河之洲窈窕淑女君子好逑");
console.log(loadTexts);
//priting last element in the groupList array
var recent = groupList[groupList.length - 1];
//checking if the user is visiting this page the first time
if (sessionStorage.getItem("recentColor") == null) {
    console.log("WELCOME");
    var getGroupIndex = 0;
    recent = groupList[getGroupIndex];
    //check if the item can be displayed:
    while (recent.homeDisplay == false) {
        getGroupIndex++;
        recent = groupList[getGroupIndex];
    }
}
else {
    //var p = sessionStorage.getItem("recentColor");
    //var s = sessionStorage.getItem("recentColorS");
    var returnTypeName = sessionStorage.getItem("typeName");
    console.log("typeName is " + returnTypeName);
    //initializing
    var selectedGroup = groupList[0];
    //find the typeObject by checking if names match
    for (var i = 0; i < groupList.length; i++) {
        if (returnTypeName == groupList[i].name) {
            selectedGroup = groupList[i];
        }
    }
    console.log();
    recent = selectedGroup;
}
console.log(recent);
//for homepage
try {
    LoadHomepage();
    //adding eventlistener to button
    document
        .getElementById("homepageBtn")
        .addEventListener("click", function () {
        Reroll();
        //document.getElementById('homepageBtn').style.scale = "1";
    });
}
catch { }
//on other pages
try {
    document.getElementById("homeBtnText").textContent = recent.name;
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
        recent.image;
    document.getElementById("homepageGroup").style.background = recent.color;
    document.getElementById("homepageQuote").textContent = recent.quote;
    document.getElementById("homepageQuote").style.color = recent.colorS;
    document.getElementById("homepageSource").textContent = recent.source;
    document.getElementById("homepageSource").style.color = recent.colorS;
    document.getElementById("homepageFooter").textContent =
        recent.name + " 更新于 " + recent.date.toDateString();
    //for javascriopt
    //r!.style.setProperty('--primaryColor', recent.color);
    //r!.style.setProperty('--secondaryColor', recent.colorS);
    //for typescript
    document.documentElement.style.setProperty("--primaryColor", recent.color);
    document.documentElement.style.setProperty("--secondaryColor", recent.colorS);
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
function Reroll() {
    //document.getElementById('homepageImage').src = "type/blank.png";
    //newRecent = null;
    var rnd = Math.floor(Math.random() * groupList.length);
    var newRecent = groupList[rnd];
    //reroll until get a different value, and if the target can be displayed
    while (recent == newRecent || newRecent.homeDisplay == false) {
        rnd = Math.floor(Math.random() * groupList.length);
        newRecent = groupList[rnd];
    }
    recent = newRecent;
    LoadHomepage();
    //save "recent" data
    var primaryColor = recent.color;
    var secondaryColor = recent.colorS;
    var typeName = recent.name;
    //storing the variables for revisiting the page
    sessionStorage.setItem("recentColor", primaryColor);
    sessionStorage.setItem("recentColorS", secondaryColor);
    sessionStorage.setItem("typeName", typeName);
}
//don't know if these actually work
preloadImages();
function preloadImages() {
    groupList.forEach(function (g) {
        var img = new Image();
        img.src = g.image;
    });
}
//copy this part:
export var primaryColor = recent.color;
export var secondaryColor = recent.colorS;
export var exportGroupList = groupList;
export var exportRecent = recent;
//copy this part:
//# sourceMappingURL=homepage.js.map