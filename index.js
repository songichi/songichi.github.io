//getting file name
var fileName = location.href.split("/").slice(-1); 

///// FOR TYPE PAGE
//declaring language types
var languages = ["hanzi", "latin", "kana"];
var filterLanguages = [];
var typeLanguage = "none";
var typeLanguageS = "none";
var typeLanguageT = "none";
var Clicked = false;
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

  //console.log(TypeList[i].typeLanguage);
  //console.log(TypeList[i].typeLanguageS);
}

function filterType(clickedButton ,language){

  btn = clickedButton;

  //check if filter list already has the target language
  //if no, then add it to the filter list
  if(filterLanguages.includes(language) === false){
    filterLanguages.push(language);
    console.log(filterLanguages);
  }
  //if yes, then remove the language 
  else if(filterLanguages.includes(language) === true){
    var index = filterLanguages.indexOf(language);
    filterLanguages.splice(index, 1);
    console.log(filterLanguages);
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
  console.log(btn);

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


//for HOMEPAGE



try{
///FOR BRAND PAGE
document.getElementById('brand-img-youyanshe').addEventListener('mouseover',
function() {
  document.querySelector('.brand-info-left').style.opacity = '100%';
  document.querySelector('#brand-img-youyanshe').style.opacity = '80%';
});

document.getElementById('brand-img-youyanshe').addEventListener('mouseleave',
function() {
  document.querySelector('.brand-info-left').style.opacity = '0%';
  document.querySelector('#brand-img-youyanshe').style.opacity = '100%';
});


document.getElementById('brand-img-youyanshe').addEventListener('click',
function() {
  document.querySelector('#brand-popup').style.display = 'flex';
  document.querySelector('#brand-item-youyanshe').style.display = 'inline';
  document.querySelector('.brand').style.filter = 'grayscale(100%)';
  document.querySelector('.bodystyle').style.overflow = 'clip';
});

document.getElementById('brand-popup').addEventListener('click',
function() {
  document.querySelector('#brand-popup').style.display = 'none';
  document.querySelector('#brand-item-youyanshe').style.display = 'none';
  document.querySelector('.brand').style.filter = 'grayscale(0%)';
  document.querySelector('.bodystyle').style.overflow = 'inherit';
});
}
catch{
  console.log("not brand page")
}
  


