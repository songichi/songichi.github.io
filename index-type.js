//import from homepage
//import { JsxFlags } from 'typescript';
import {primaryColor} from './homepage.js';
import {secondaryColor} from './homepage.js';
import {exportGroupList} from './homepage.js';
import {typeCollectionList } from './typeData.js';
//import tinycolor from './tinycolor.js';

//var documentRoot = document.querySelector(':root');
//documentRoot.style.setProperty('--primaryColor', primaryColor);
//documentRoot.style.setProperty('--secondaryColor', secondaryColor);


///// FOR TYPE PAGE
//declaring language types
var languages = ["hanzi", "latin", "kana"];
var filterLanguages = [];
var typeLanguage = "none";
var typeLanguageS = "none";
var typeLanguageT = "none";
var Clicked = false;
var HasText = false;
var btn;
var groupDetailed = [];

//GENERATE OBJECTS IN TYPE GRID
//NEW PART, where each type object is created via code
//var typeType = "none";
//getting the typeGrid element
var typeGridBody = document.getElementById("typeGrid");
var newTypeHtml = "";

for(var i = 0; i < typeCollectionList.length; i++){
  //checking which language is the type
  var typeString = "type";
  var typeLang = typeCollectionList[i].language;
  for(var j = 0; j < typeLang.length; j++){
    if(typeLang[j] == "hanzi"){
      typeString = typeString + " hanzi";
    }else if(typeLang[j] == "kana"){
      typeString = typeString + " kana";
    }else if(typeLang[j] == "latin"){
      typeString = typeString + " latin";
    }
  }

  var thisTypeHtml = '<div class="' + typeString + '">' +  
  '<div class="typeDiv">' + 
    '<div class = "typeBackground"></div>' +
    '<p class = "typeTitle">' + typeCollectionList[i].name +'</p>' +
    '<p class = "typeText typeQuote">' + typeCollectionList[i].quote + '</p>' +
    '<p class = "typeText typeSource">' + typeCollectionList[i].source +'</p>' +
  '</div>' +
  '<img class= "typeImage" src="' + typeCollectionList[i].image + '"/>' +
'</div>';
  console.log(thisTypeHtml);
  newTypeHtml = newTypeHtml + thisTypeHtml;
}

//console.log(newTypeHtml);

//
//
//finding all type elements, check which language family the type belongs to
var TypeList = document.getElementsByClassName('type');
var TypeButtonList = document.getElementsByClassName('button-type');
//console.log(TypeButtonList);

//TEST DANGERIOUS
typeGridBody.innerHTML = newTypeHtml;

//TYPE IMAGES ADD EVENT LISTENERS
for(var i = 0; i < TypeList.length; i++)
{
  /*
  TypeList[i].typeLanguage = "none";
  TypeList[i].typeLanguageS = "none";
  TypeList[i].typeLanguageT = "none";

  //for each language, check if the class matches the input type
  languages.forEach(function(t){
    if(TypeList[i].classList.contains(t)){
      if(TypeList[i].typeLanguage == "none"){
        TypeList[i].typeLanguage = t;
      }
      else if(TypeList[i].typeLanguageS == "none"){
        TypeList[i].typeLanguageS = t;
      }
      else if(TypeList[i].typeLanguageT == "none"){
        TypeList[i].typeLanguageT = t;
      }
    }
    
  });

  */

//////DELETE
  //if the object has no text, 
    //which means it contains both class "text" and "textimage"
    /*
    const itemT = TypeList.item(i);
    if(itemT.classList.contains("typeImage") == true){
        itemT.addEventListener('mouseover',
        function() {
        itemT.style.filter = "blur(1.6px)";
        });
        itemT.addEventListener('mouseleave',
        function() {
        itemT.style.filter = "none";
        });
    }
    else{}
    */

    try{
      /*
      //shaving the long html address to readable address
      var imageSrc = g.image;
      var longImageSrc = TypeList[i].querySelector(".typeImage").src;
      var lengthDiff = longImageSrc.length - imageSrc.length;
      longImageSrc = longImageSrc.slice(lengthDiff);
      //console.log(longImageSrc);
      
      if(imageSrc == longImageSrc){
        var imageElement = TypeList[i].querySelector(".typeImage");
        groupDetailed.push(g.name);
        //console.log(longImageSrc);
      }
      */
      /*
      //var imageElement = TypeList[i].querySelector("#" + g.name);
      var a = imageElement.previousElementSibling;
      a.querySelector(".typeTitle").textContent = g.name;
      a.querySelector(".typeTitle").style.color = g.colorS;
      a.querySelector(".typeQuote").textContent = g.quote ;
      a.querySelector(".typeQuote").style.color = g.colorS;
      a.querySelector(".typeSource").textContent = g.source;
      a.querySelector(".typeSource").style.color = g.colorS;
      a.querySelector(".typeBackground").style.backgroundColor = g.color;
      a.HasText = true;
*/  
/*
      var imageSrc = g.image;
      var longImageSrc = TypeList[i].querySelector(".typeImage").src;
      var lengthDiff = longImageSrc.length - imageSrc.length;
      longImageSrc = longImageSrc.slice(lengthDiff);
      //console.log(longImageSrc);
      
      if(imageSrc == longImageSrc){
        var imageElement = TypeList[i].querySelector(".typeImage");
        groupDetailed.push(g.name);
        //console.log(longImageSrc);
      }
      */
     //because the typeCollectionList matches TypeList, i can use this
     //but this is crappy code, and should change later
      var matchingType = typeCollectionList[i];
      const imageElement = TypeList[i].querySelector(".typeImage");
      const a = imageElement.previousElementSibling;
      a.querySelector(".typeTitle").style.color = matchingType.colorS;
      a.querySelector(".typeQuote").style.color = matchingType.colorS;
      a.querySelector(".typeSource").style.color = matchingType.colorS;
      a.querySelector(".typeBackground").style.backgroundColor = matchingType.color;
      a.HasText = true;
       // groupDetailed.push(g.name);
      //var imageElement = TypeList[i].querySelector("#" + g.name);
      //var a = imageElement.previousElementSibling;
      imageElement.addEventListener('mouseover',
      function() {
          imageElement.style.opacity = "0%";
          //imageElement.style.filter = "blur(5px)";
      });
      imageElement.addEventListener('mouseleave',
      function() {
          imageElement.style.opacity = "100%";
           //imageElement.style.filter = "none";
        });
      
    }
    catch{}
  }
  ///*
  //////DELETE
  //applying text from the library
  //typeCollectionList.forEach(function(g){
    
    //getting group elements
    //which means the images that don't have type attached to them
   
    
    
  //}); 

//console.log("GROUPS: [ " + groupDetailed + " ]");



//THIS FILTERS type
function filterType(clickedButton ,language){

  //check if filter list already has the target language
  //if no, then add it to the filter list
  if(filterLanguages.includes(language) === false){
    filterLanguages.push(language);
    //console.log(filterLanguages);
  }
  //if yes, then remove the language 
  else if(filterLanguages.includes(language) === true){
    var index = filterLanguages.indexOf(language);
    filterLanguages.splice(index, 1);
    //console.log(filterLanguages);
  }


  //check through each element to see if the filter type
  //by default, everything is turned on
  
  for(var i = 0; i < TypeList.length; i++)
  {
    TypeList[i].style.display = "block";
    
    //filterLanguages are the languages that types should match and display
    //if typeImages don't match all the filterLanguages, set their display to none
    //checking through each filter language
    var matchingNum = 0;
    filterLanguages.forEach(function(filteredLang){
    //check through class list of the element
      var elementClassList = TypeList[i].classList;
      //console.log(elementClassList);
      
      //check through each class name of typeImage
      //if a match takes place, add one to matchingNum
      for(var j = 0; j < elementClassList.length; j++){
        if(elementClassList[j] == filteredLang){
          matchingNum++;
          //console.log(TypeList[i].className + " chekcing: " + elementClassList[j] + " == " + filteredLang);
        }
      }
      //console.log("matching num is "+ matchingNum + " //  filterlength is" + filterLanguages.length)
      //if the matchingNum equals number of filterLanguges, 
      //it means the type meets the requirements
      
      /*
      //if has only one language
      if(TypeList[i].typeLanguageS == "none"){
        if(TypeList[i].typeLanguage != a){
          TypeList[i].style.display = "none";
          //console.log("not " + a);
        }
      }
      //if the object has two languages
      else if(TypeList[i].typeLanguageT == "none"){
        if(TypeList[i].typeLanguage !== a && TypeList[i].typeLanguageS !== a){
          TypeList[i].style.display = "none";
          //console.log(a);
        }
      }
      //if object has three languages
      else {
        if(TypeList[i].typeLanguage !== a && TypeList[i].typeLanguageS !== a && TypeList[i].typeLanguageT !== a){
          TypeList[i].style.display = "none";
          //console.log(a);
        }
      }*/
      //turn off objects that don't have class names matching
      
    });
    if(matchingNum == filterLanguages.length){}else{
      TypeList[i].style.display = "none";
    }
  }
  //this is for pure string building, does not perform anything on the web
  var filterList = [];
  filterLanguages.forEach(function(element){
    filterList.push(element);
  });
  console.log("filter " + "[ " + filterList + " ]");
}


var btnPrimaryColor;
var btnSecondaryColor;

//for each button, add onclick function
for(var i = 0; i < TypeButtonList.length; i++){



  const btn = TypeButtonList.item(i);
  btn.Clicked = false;
  //console.log(btn);
  var k = "a";
    
  //translating button text to type
  if(btn.textContent == "漢字"){
    k = "hanzi";
  }
  else if(btn.textContent == "かな"){
    k = "kana";
  }
  else if(btn.textContent == "Latin"){
    k = "latin";
  }
  const key = k.toString();


  //change btn color
  //check if the primary color is too light
  //if it's too light, it will be unreadable
  var primaryColorTiny = tinycolor(primaryColor);
  //console.log(primaryColorTiny);

  //if the color is too light and not readable, switch the colors
  if(primaryColorTiny.isLight() == true){
    btnPrimaryColor = secondaryColor;
    btnSecondaryColor = primaryColor;
  }
  else{
    btnPrimaryColor = primaryColor;
    btnSecondaryColor = secondaryColor;
  }
  //set initial button style
  btn.style.border = "2px solid " + btnPrimaryColor.toString();
  btn.style.background = "transparent";
  btn.style.color = btnPrimaryColor;


  //add click function
  btn.addEventListener('click',
  function(){
    if(btn.Clicked == false){
      btnStyleIsClicked(btn, true);
      btn.Clicked = true;
    }
    //when btn has been clicked
    else{
      btn.Clicked = false;
      btnStyleIsClicked(btn, false);
    }
    filterType(btn, key)
  })

  btn.addEventListener('mouseover',
  function(){
    if(btn.Clicked == false){
      btnStyleIsClicked(btn, true);
    }
    //when btn has been clicked
    else{
      btnStyleIsClicked(btn, false);
    }
    })
  

  btn.addEventListener('mouseleave',
  function(){
    if(btn.Clicked == false){
      btnStyleIsClicked(btn, false);
    }
      //when btn has been clicked
    else{
      btnStyleIsClicked(btn, true);
    }
    })
}

//this changes the button style when passing in true / false value
function btnStyleIsClicked(btn, isClicked){
  //console.log(primaryColorTiny);
  if(isClicked == false){ //this is the thinner style
    //console.log("2px solid " + btnPrimaryColor.toString());
    btn.style.border = "2px solid " + btnPrimaryColor.toString();
    btn.style.background = "transparent";
    btn.style.color = btnPrimaryColor;
  }
  else if(isClicked == true){ //this is the thicker style
    btn.style.border = "none";
    btn.style.background = btnPrimaryColor;
    btn.style.color = btnSecondaryColor;
  }

  /*
  //if the color is readable, 
  if(primaryColorTiny.isLight() == false){
    //console.log("is light");
    
  }
  //if the color is not readable, then reverse the color
  else{
    if(isClicked == false){ //this is the thinner style
      btn.style.border = "2px solid var(--secondaryColor)";
      btn.style.background = "transparent";
      btn.style.color = "var(--secondaryColor)";
    }
    else if(isClicked == true){ //this is the thicker style
      btn.style.border = "none";
      btn.style.background = "var(--primaryColor)";
      btn.style.color = "var(--secondaryColor)";
    }


  }*/

  
}

