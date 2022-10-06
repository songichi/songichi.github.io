//import from homepage
import {primaryColor} from './homepage.js';
import {secondaryColor} from './homepage.js';
import {groupList} from './homepage.js';
import {recent} from './homepage.js';

var primaryC = primaryColor;
var secondaryC = secondaryColor;
//if user is visiting the page for the first time
if(sessionStorage.getItem("recentColor") == null){
  console.log("WELCOME");
}
//
else{
  primaryC = sessionStorage.getItem("recentColor");
  secondaryC = sessionStorage.getItem("recentColorS");
  console.log(primaryC, secondaryC);
}



//changing page color theme from imported variables
var documentRoot = document.querySelector(':root');
documentRoot.style.setProperty('--primaryColor', primaryC);
documentRoot.style.setProperty('--secondaryColor', secondaryC);




/*
//background quote
var backgroundQuoteText = "";
try{
  //adding backgroundQuote if the element exists
  for(var i = 0; i < 19; i++ ){
    //deleting random number of characters
    var NUM = Math.floor(Math.random() * 8)
    if(backgroundQuoteText.length > 30){
      for(var j = 0; j < 4; j++ ){
        backgroundQuoteText.slice(NUM);
      }
    }
  
    var num = Math.floor(Math.random() * 3)
    //adding random number of space
    for(var j = 0; j < num; j++ ){
      backgroundQuoteText += '\xa0';
    }
    backgroundQuoteText += recent.quote;
    
  }
  
  document.querySelector('#backgroundQuote').textContent = backgroundQuoteText;
}
catch{}
*/



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
}
  


