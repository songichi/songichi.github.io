// calculate.js

const inputField = document.getElementById("inputNumber");
const letterInputField = document.getElementById("inputLetterNumber");
const resultDisplay = document.getElementById("resultDisplay");
const multiplyCheck = document.getElementById("multiplyCheck");
const timeDisplay = document.getElementById("timeDisplay");
const dateCheck = document.getElementById("dateCheck");
// const priceCheck = document.getElementById("priceCheck");

let draftTime = 0;
let refineTime = 0;
let offMultiplier = 1;
let originalPrice = 0;

function calculatePrice(value, letterValue = 0) {
  let result = 0;
  offMultiplier = 1;
  value = value + Math.ceil(letterValue / 2);
  if (value >= 1 && value <= 4) {
    result = 1600;
    draftTime = 5;
    refineTime = 3;

  } else if (value >= 5 && value <= 9) {
    result = 1000 + 200 * value;
    draftTime = 8;
    refineTime = 4;
  } else if (value >= 10) {
    result = 1600 + 150 * value;
    draftTime = 10;
    refineTime = Math.ceil(value / 3);
  }

  // Apply multiplier if checkbox is checked
  if (multiplyCheck.checked) {
    
        result *= 1.5;
    
  }

  if(dateCheck.checked){
    offMultiplier -= 0.1;
  }
  // if(priceCheck.checked){
  //   offMultiplier -= 0.1;
  // }
  
    if(offMultiplier < 1){
      originalPrice = result;
    }

  result *= offMultiplier;
    


  return result;
}

// Update result whenever input or checkbox changes
function updateResult() {
  const value = parseInt(inputField.value, 10);
  const letterValue = parseInt(letterInputField.value, 10);
  console.log(value, letterValue);

  if (isNaN(value) && isNaN(letterValue)) {
    resultDisplay.textContent = "0";
  } else {
    // console.log("a");
    var priceString = calculatePrice(value, letterValue) ;
    if(offMultiplier < 1){
        priceString = priceString.toFixed(0) + " (原价：" + originalPrice + ")";
    }
    resultDisplay.textContent = priceString ;
    let totalTime = draftTime + refineTime;
    timeDisplay.textContent = `${totalTime}(${draftTime}+${refineTime}) 天`;
  }
}

inputField.addEventListener("input", updateResult);
letterInputField.addEventListener("input", updateResult);
multiplyCheck.addEventListener("change", updateResult);
dateCheck.addEventListener("change", updateResult);
// priceCheck.addEventListener("change", updateResult);