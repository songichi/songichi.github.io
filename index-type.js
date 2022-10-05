

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

//var typeType = "none";

//finding all type elements, check which language family the type belongs to
var TypeList = document.getElementsByClassName('type');
var TypeButtonList = document.getElementsByClassName('button-type');
console.log(TypeButtonList);

for(var i = 0; i < TypeList.length; i++)
{
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

  //if the object has no text, 
    //which means it contains both class "text" and "textimage"
    const itemT = TypeList.item(i);
    if(itemT.classList.contains("typeImage") == true){
        itemT.addEventListener('mouseover',
        function() {
        itemT.style.filter = "blur(3px)";
        });
        itemT.addEventListener('mouseleave',
        function() {
        itemT.style.filter = "none";
        });
    }
    else{}

  ///*
  //applying text from the library
  groupList.forEach(function(g){
    
    try{
        var imageElement = TypeList[i].querySelector("#" + g.name);
        var a = imageElement.previousElementSibling;
        a.querySelector(".typeTitle").textContent = g.name;
        a.querySelector(".typeTitle").style.color = g.colorS;
        a.querySelector(".typeQuote").textContent = g.quote;
        a.querySelector(".typeQuote").style.color = g.colorS;
        a.querySelector(".typeSource").textContent = g.source;
        a.querySelector(".typeSource").style.color = g.colorS;
        a.querySelector(".typeBackground").style.backgroundColor = g.color;
        a.HasText = true;

        imageElement.addEventListener('mouseover',
        function() {
            imageElement.style.opacity = "0%";
        });
        imageElement.addEventListener('mouseleave',
        function() {
            imageElement.style.opacity = "100%";
        });
    }
    catch{}
    
    
    
  }); 

  
  
}



function filterType(clickedButton ,language){

  btn = clickedButton;

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
    
    //checking through each filter language
    filterLanguages.forEach(function(a){
      //if has only one language
      if(TypeList[i].typeLanguageS == "none"){
        if(TypeList[i].typeLanguage != a){
          TypeList[i].style.display = "none";
          console.log("not " + a);
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
      }
      //turn off objects that don't have class names matching
      
    });

  }
}

//for each button, add onclick function
for(var i = 0; i < TypeButtonList.length; i++){

  btn = TypeButtonList.item(i);
  btn.Clicked = false;
  //console.log(btn);

  btn.addEventListener('click',
  function(){
    if(btn.Clicked == false){
      btn.style.background = "#333333";
      btn.style.color = "#ffffff";
      btn.Clicked = true;

    }
    else{
      btn.Clicked = false;
      btn.style.background = "#f1f1f1";
      btn.style.color = "#000000";

    }
  })
}

