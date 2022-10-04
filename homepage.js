
//declaring class
class group{
    constructor(image, color, colorS, quote, source, date){
        this.image = image;
        this.color = color;
        this.colorS = colorS;
        this.quote = quote;
        this.source = source;
        this.date = date;
    }
}
var groupList = [];


//adding new files

CreateNewGroup(
    "「天人五衰」",
    "type/tenningosui.png",
    "#ce1906", 
    "#ffffff",
    "「天人の五衰も目の前に見えてあさましや」",
    "———『天人五衰』三島由紀夫",
    new Date(2022, 9, 28,     0, 0, 0, 0)
)

//priting last element in the groupList array
var recent = groupList[groupList.length - 1];
console.log(recent);

function CreateNewGroup(name, image, color, colorS, quote, source, date){
    var newGroup = new group(
        image, color, colorS, quote, source, date
    )
    newGroup.name = name;
    groupList.push(newGroup);
}

//for homepage
try{
    document.getElementById('homepageGroup').style.background = recent.color;
    document.getElementById('homepageImage').src = recent.image;
    document.getElementById('homepageQuote').textContent = recent.quote;
    document.getElementById('homepageQuote').style.color = recent.colorS;
    document.getElementById('homepageSource').textContent = recent.source;
    document.getElementById('homepageSource').style.color = recent.colorS;
}
catch{}

//on other pages
try{
    document.getElementById('home').style.backgroundColor = recent.color;

    document.getElementById('home').addEventListener('mouseover',
function() {
    document.getElementById('home').style.backgroundColor = "#ffffff";
    document.getElementById('home').style.scale = "5";
});

    document.getElementById('home').addEventListener('mouseleave',
function() {
    document.getElementById('home').style.backgroundColor = recent.color;
    document.getElementById('home').style.scale = "1";
});
    
}
catch{

}