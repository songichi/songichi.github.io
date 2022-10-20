

var r = document.querySelector(':root');

//declaring class
class typeObject{
    constructor(name, image, color, colorS, quote, source, date, homeDisplay){
        this.name = name;
        this.image = image;
        this.color = color;
        this.colorS = colorS;
        this.quote = quote;
        this.source = source;
        this.date = date;
        this.homeDisplay = homeDisplay;
    }
}
var groupList = [
//insert items here
new typeObject("もののけ姫", "type/mononokehime.png",
"#c9f2c7", "#171f17",
"はりつめた弓の、ふるえる弦よ", "———『もののけ姫』宮崎駿",
new Date(2022, 10, 20,     0, 0, 0, 0),
true)

];

//adding new files

/*
CreateNewGroup(
    "蕪城賦", "type/wuchengfu.png",
    "#fcffe0", "#170c06",
    "觀基扃之固護，將萬祀而一君",
    "———『蕪城賦』鮑照",
    new Date(2022, 10, 8,     0, 0, 0, 0)
)*/
CreateNewGroup(
    "もののけ姫", "type/mononokehime.png",
    "#c9f2c7", "#171f17",
    "はりつめた弓の、ふるえる弦よ",
    "———『もののけ姫』宮崎駿",
    new Date(2022, 10, 20,     0, 0, 0, 0),
    true
)
CreateNewGroup(
    "Ｋの弁天", "type/knobenten.png",
    "#f0ffff", "#3e0b6b",
    "影ほど不思議なものはない",
    "———『Kの弁天』谷崎潤一郎",
    new Date(2022, 10, 7,     0, 0, 0, 0),
    true
)
CreateNewGroup(
    "天人五衰", "type/tenningosui.png",
    "#ce1906", "#ffffff",
    "天人の五衰も目の前に見えてあさましや",
    "———『天人五衰』三島由紀夫",
    new Date(2022, 10, 4,     0, 0, 0, 0),
    true
)
CreateNewGroup(
    "觀自在菩薩", "type/guanzizai.png",
    "#153513", "#ffffff",
    "觀自在菩薩，行深般若波羅蜜多時",
    "———『心經』",
    new Date(2022, 10, 4,     0, 0, 0, 0),
    true
)
CreateNewGroup(
    "國殤", "type/guoshang.png",
    "#11f7af", "#000000",
    "操吳戈兮被犀甲，車錯轂兮短兵接",
    "———『國殤』屈原",
    new Date(2022, 10, 4,     0, 0, 0, 0),
    true
)
CreateNewGroup(
    "濃妝淡抹", "type/nongzhuangdanmo.png",
    "#f7f5e2", "#f25e2f",
    "欲把西湖比西子，淡妝濃抹總相宜",
    "———『飲湖上初晴後雨二首·其二』蘇軾",
    new Date(2022, 10, 4,     0, 0, 0, 0),
    true
)

//adding load screen poems
var loadTexts = [];
loadTexts.push("髣髴兮若輕雲之蔽月飄颻兮若流風之迴雪");
loadTexts.push("關關雎鳩在河之洲窈窕淑女君子好逑");
console.log(loadTexts);


function CreateNewGroup(name, image, color, colorS, quote, source, date, homeDisplay){
    var newGroup = new typeObject(
        name, image, color, colorS, quote, source, date, homeDisplay
    )
    groupList.push(newGroup);
}




//priting last element in the groupList array
var recent;
console.log(recent);
//checking if the user is visiting this page the first time
if(sessionStorage.getItem("recentColor") == null){
    console.log("WELCOME");
    recent = groupList[0];
}
else{
    var p = sessionStorage.getItem("recentColor");
    var s = sessionStorage.getItem("recentColorS");
    var selectedGroup = groupList.find(
        item => item.color == p && item.colorS == s);
    recent = selectedGroup;
}

//for homepage
try{
    LoadHomepage();

    //adding eventlistener to button
    document.getElementById('homepageBtn').addEventListener('click',
        function() {
    
        Reroll();
        //document.getElementById('homepageBtn').style.scale = "1";
    });
}
catch{}

//on other pages
try{

    document.getElementById('homeBtnText').textContent = recent.name;
    //document.getElementById('homeBtnText').textContent = recent.name[0];
    
    document.getElementById('homeBtn').addEventListener('mouseover',
        function() {
    //document.getElementById('home').style.backgroundColor = "#ffffff";
        document.getElementById('homeBtn').style.scale = "1.5";
        var homeBtnText = document.getElementById('homeBtnText');
        homeBtnText.style.left = "0";
        homeBtnText.style.letterSpacing = "-0.6vw";
        homeBtnText.style.fontSize = "4.4vw";
        homeBtn.style.padding = "0px 0px";
        });

    document.getElementById('homeBtn').addEventListener('mouseleave',
        function() {
    //document.getElementById('home').style.backgroundColor = recent.color;
        document.getElementById('homeBtn').style.scale = "0.9";
        document.getElementById('homeBtnText').style.left = "-2.5vw";
        document.getElementById('homeBtnText').style.letterSpacing = "-5vw";
        homeBtnText.style.fontSize = "5vw";
        homeBtn.style.padding = "0vw 4vw";
    });
    
}
catch{}


function LoadHomepage(){
    //setting transition
    var transitionDelay = 300;
    document.getElementById('homepageGroup').style.transition = transitionDelay + "ms";
    //set transition
    document.getElementById('homepageImage').style.transition = "none";
    document.getElementById('homepageImage').style.opacity = "0%";
   
    document.getElementById('homepageImage').src = recent.image;
    
    document.getElementById('homepageGroup').style.background = recent.color;
    document.getElementById('homepageQuote').textContent = recent.quote ;
    document.getElementById('homepageQuote').style.color = recent.colorS;
    document.getElementById('homepageSource').textContent = recent.source;
    document.getElementById('homepageSource').style.color = recent.colorS;
    document.getElementById('homepageFooter').textContent = 
        recent.name + " 更新于 " + recent.date.toDateString();

    //testing to change all ui's color
    r.style.setProperty('--primaryColor', recent.color);
    r.style.setProperty('--secondaryColor', recent.colorS);

    //add a load text animation when the image is loading
    var loadTime = 0;
    
    var rndIndex = Math.floor(Math.random() * loadTexts.length)
    var loadInterval = setInterval(function() { 
        var loadObject = document.getElementById('homepageImageLoad');
        var loadText = loadTexts[rndIndex];
        loadObject.textContent = loadText[loadTime];
        loadObject.style.opacity = "100%";
        loadObject.style.filter = "blur(0px)";
        //if loadTime exceeds the string length
        if(loadTime + 1 >= loadText.length){
            loadTime = 0;
        }
        else{ loadTime++; } //simply add one
        setTimeout(function(){
            loadObject.style.opacity = "0%";
            loadObject.style.filter = "blur(3px)";
          }, 660);
    }, 1200);
    //clearInterval(loadInterval);  //stop loading interval

    

    //delay changing image, otherwise there will be an ungly box
    document.getElementById('homepageImage').addEventListener("load", () => {
        clearInterval(loadInterval);  //stop loading interval
        
        //document.getElementById('homepageImage').style.transition = "800ms";
        //document.getElementById('homepageImage').style.opacity = "100%";
        setTimeout(() => {
            document.getElementById('homepageImage').style.transition = "800ms";
            document.getElementById('homepageImage').style.opacity = "100%";
          }, transitionDelay)
    });
}



function Reroll(){
    
    //document.getElementById('homepageImage').src = "type/blank.png";
    
    //newRecent = null;
    var rnd = Math.floor(Math.random() * groupList.length)
    var newRecent = groupList[rnd];
    while(recent == newRecent){
        rnd = Math.floor(Math.random() * groupList.length)
        newRecent = groupList[rnd];
    }
    
    recent = newRecent;
    LoadHomepage();

    //save "recent" data
    var primaryColor = recent.color;
    var secondaryColor = recent.colorS;
    sessionStorage.setItem("recentColor", primaryColor);
    sessionStorage.setItem("recentColorS", secondaryColor);

    
}
//don't know if these actually work

preloadImages();
function preloadImages(){
    groupList.forEach(function(g){
        var img = new Image();
        img.src = g.image;
    });
}

export var primaryColor = recent.color;
export var secondaryColor = recent.colorS;
export var groupList;
export var recent;





//export var primaryColor = recent.color;

/*
//GetImageColors();
function GetImageColors(){
    //for testing
    groupList[0].color = "#111111";


    const img = new Image();
    img.src = "./type/tenningosui.png";
    console.log(img);
    const cvs = document.getElementById("canvas");
    const ctx = cvs.getContext("2d");
    img.addEventListener("load", () => {
        ctx.drawImage(img, 0, 0, 3, 3, 0, 0, 20, 20);
        img.style.display = "none";
        cvs.display = "none";
        var pixel = ctx.getImageData( 1, 1, 1, 1);
        var data = pixel.data;
        console.log(data);
    });

    
    groupList[0].color;
    LoadHomepage();
}*/
