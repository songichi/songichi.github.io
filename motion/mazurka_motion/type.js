// import { mazurkaCollection } from "./data.js";

//declaring class
class movingPoint {
  constructor(x, y, moveDown, moveLeft, moveSpeed, xOffset, yBoundry) {
      this.x = x;
      this.y = y;
      this.moveDown = moveDown;
      this.moveLeft = moveLeft;
      this.moveSpeed = moveSpeed;
      this.xOffset = xOffset;
      this.yBoundry = yBoundry;
  }
}

class segment{
  constructor(no, timeLength, drawLetter, drawNextLetter, drawPreviousLetter, drawFirstLine, drawSecondLine){
    this.no = no;
    this.timeLength = timeLength;
    this.drawLetter = drawLetter;
    this.drawNextLetter = drawNextLetter;
    this.drawPreviousLetter = drawPreviousLetter;
    this.drawFirstLine = drawFirstLine;
    this.drawSecondLine = drawSecondLine;
  }
}

let song;
let amp; // amplitude analyzer
let volume;
let lowFreq;
let midFreq;
let circleSize = 100;

let audioStarted = false; // Track whether audio has started
let audioEnded = false;

class typeSpan {
  constructor(x, y, avoid) {
      this.x = x;
      this.y = y;
      this.avoid = avoid;
  }
}

var typeSpans = [];

console.log(window.mazurkaData.data);



let textToDisplay = "Mazurka";
let spans = [];

let sectionIndex = 0;
let breaks = [7.3, 14, 20.6, 24, 31, 
            39, 44, 49.9, 60, 65, 
            76.7, 82, 90.1, 100.9, 111,
            122, 133.5, 145, 156, 165,
            172.3, 178, 187, 193]
let speeds = [1, 1, 1, 1, 1, 1]

var keyIndex = 0;
var selectedIndex = 1;
var selectedMazurka;


var currentX = 0;
var currentY = 0;
var globalXScale = 1;
var globalYScale = 1;
var globalRotationAngle = 0;
var isDecreasingSize = false;
var sizeDecreasemnt = 0.005;
var globalVolume = 0;
var pointBeganDrawing = false;
var additionalShearMultiplier = 0.05;
var changingShear = false;
var increasingShear = true;

let points = [];
let currentDrawPointTime = 0; // Time variable

  var point0 = new movingPoint(10, 300, true, true, 1, 0, 100);
  var point1 = new movingPoint(420, 200, true,true,  6, 0, 50);
  var point2 = new movingPoint(360, 100, true, false,  4, 0, -90);
  var point3 = new movingPoint(40, 390, false, true, 4, 0, 100);

  // var point0 = new movingPoint(20, 300, true, true, 1, 0, -40);
  // var point1 = new movingPoint(200, 200, true,true,  6, 0, 50);
  // var point2 = new movingPoint(300, 100, true, false,  4, 0, -90);
  // var point3 = new movingPoint(450, 300, false, true, 3, 0, 50);

  var point0a = new movingPoint(150, 300, false, true, 3, 0, 100);
  var point1a = new movingPoint(660, 180, true,false,  8, 0, -90);
  var point2a = new movingPoint(550, 100, true, false,  6, 0, -200);
  var point3a = new movingPoint(220, 100, false, true, 3, 0, 150);
  
  var point0b = new movingPoint(220, 100, false, true, 3, 0, 150);
  var point1b = new movingPoint(580, 200, true,true,  4, 0, -100);
  var point2b = new movingPoint(650, 400, true, false,  2, 0, -200);
  var point3b = new movingPoint(120, 300, false, true, 3, 0, 50);





let customFont;



let params = {
  no: selectedIndex,
  indicator : true,
  tempo: 155,
  time: 200,
  xTranslateMultiplier: 30,
  xOffset: 0,
  yTranslateMultiplier: 60,
  yOffset: 0,
  xScale: 1,
  yScale: 1,
  shearMultiplier: 1,
  shearBase: 50,
  rotateMultiplier: 20,
  rotationBase: 100,
  textBaseSize: 90,
  textSizeMultiplier: 10,
  fill: [255, 0, 0],
  stroke: "#008000",
  strokeWeight: 10,
  globalRotationAngle: 0
};
let gui;
// Create GUI
gui = new dat.GUI({ closed: true });

gui.add(params, 'no', 0, 5).step(1).name('NO.');
var guiIndicator = gui.add(params, 'indicator');
var guiTempo = gui.add(params, 'tempo', 0, 200);
var guiTime = gui.add(params, 'time', 100, 500);
gui.add(params, 'xTranslateMultiplier', 20, 100);
gui.add(params, 'xOffset', -500, 500);
gui.add(params, 'yTranslateMultiplier', 20, 100);
gui.add(params, 'yOffset', -500, 500);
var guiXScale = gui.add(params, 'xScale', 1, 10);
var guiYScale = gui.add(params, 'yScale', 1, 10);
var guiShearMultiplier = gui.add(params, 'shearMultiplier', 1, 400);
gui.add(params, 'shearBase', 0, 180);
var guiRotateMultiplier = gui.add(params, 'rotateMultiplier', 0, 2000);
gui.add(params, 'rotationBase', 0, 360);
gui.add(params, 'textBaseSize', 16, 100);
gui.add(params, 'textSizeMultiplier', -30, 50);
gui.addColor(params, 'fill');
gui.addColor(params, 'stroke');
gui.add(params, 'strokeWeight', 0, 20);
gui.add(params, 'globalRotationAngle', 0, 360);


function preload() {
  // Load the custom font
  customFont = loadFont('Didot_Italic.otf');
  song = loadSound('mazurka_2.mp3');
}

var p3xBase = 500;
var p3yBase = 300;

function setup() {
  //locks frame rate to 0.01 per second
  frameRate(100);

  amp = new p5.Amplitude();
  fft = new p5.FFT();
 

  createCanvas(500, 500);
  textFont(customFont);
  textSize(32);
  textAlign(CENTER, CENTER);

  // Create spans for each letter
  createSpans(textToDisplay);

  updateParameters();
  
 // Play the song
//  song.play();


  
  // point0 = createVector(100, 300);
  // point1 = createVector(200, 100);
  // point2 = createVector(300, 100);
  // point3 = createVector(400, 400);

  
}


function draw() {
  
  if (!audioStarted) {
    fill('white');
    textAlign('center');
    text("Click to start audio", width / 2, height / 2);
    return; // Don't run the rest of draw until audio has started
  }
  else if(audioEnded){
    background(backgroundColor());
    fill('black');
    textAlign('center');
    text("Fin", width / 2, height / 2);
    noloop();
    return; // Don't run the rest of draw until audio has started
  }

  if(song.currentTime() > breaks[breaks.length - 1] - 2){
    audioEnded = true;
  }
  
  // analyze the amplitude of the song
   // Analyze the microphone input
   fft.setInput(song);
    
   // Get the frequency spectrum
   let spectrum = fft.analyze();
   volume = amp.getLevel();
   globalVolume = volume;
   
   // Get the average amplitude in low and high frequency ranges
   lowFreq = fft.getEnergy("bass"); // Low frequencies
   midFreq = fft.getEnergy("mid");  // Mid frequencies
   highFreq = fft.getEnergy("treble"); // High frequencies

  // this line allows song change to be viewed
  // this blocks live parameter change of tempo and time
  // disable this line if you want to live change tempo and time
  // updateParameters();

  

  currentDrawPointTime = currentDrawPointTime + 0.01;
  drawLog();

 

  


  //update current index
  var oldSectionIndex = sectionIndex;
  sectionIndex = 0;
  for (var i = 0; i < breaks.length; i++) {
    
    if(song.currentTime() > breaks[i]){
      sectionIndex++;
      // shiftBackgroundColor();
    }
    
  }
  // if(sectionIndex > (textToDisplay.length-1)){
  //   sectionIndex = sectionIndex % textToDisplay.length;}
  if(oldSectionIndex != sectionIndex){
    //reset certain parameters
    globalXScale = 1;
    globalYScale = 1;

  }
  // console.log(sectionIndex);

  background(backgroundColor());


  var drawingLine1 = false;
  var drawingLine2 = false;
  var drawingLine3 = false;

  if((sectionIndex > 1 && sectionIndex < 7) || (sectionIndex > 8 && sectionIndex < 13) || (sectionIndex > 18 )){
    drawingLine2 = true;
    drawingLine3 = true;
    
  }
  
  if((sectionIndex > 2 && sectionIndex < 13)|| (sectionIndex > 18 )){
    drawingLine1 = true;
  }

  drawPointsDuplicate(point0, point1, point2, point3, drawingLine1);
  drawPointsDuplicate(point0a, point1a, point2a, point3a, drawingLine2);
  drawPointsDuplicate(point0b, point1b, point2b, point3b, drawingLine3);
  

  // Display each span

  for (let i = 0; i < spans.length; i++) {

    //section info
    var isCurrentSection = (i == sectionIndex % textToDisplay.length);
    var isNextSection = (i == (sectionIndex + 1) % textToDisplay.length);
    var isBeforeSection = (i == (sectionIndex - 1) % textToDisplay.length);
    //scale
    var currentSectionMax = breaks[0];
    if(sectionIndex > 0){
      currentSectionMax = breaks[sectionIndex] - breaks[sectionIndex - 1];
    }
    
    //text size
    var thisTextSize = params.textBaseSize + ((i % 3) * params.textSizeMultiplier);
    // if(i == selectedMazurka.keyIndex){
    if(i == selectedIndex){
      thisTextSize = thisTextSize * 4.5;
      // console.log("text size large: " + thisTextSize);
    }
    else if(i == selectedIndex - 1){
      thisTextSize = thisTextSize * 2.6;
    }
    else if(i == selectedIndex - 2){
      thisTextSize = thisTextSize * 2;

    }
    else{
      // console.log("text size small: " + thisTextSize);
    }

    // var index = i % 3;
    var xChange = 0;
    // check if it is not the first letter
    if(i != 0){
      currentX = currentX + params.xTranslateMultiplier;
      // currentX = currentX + params.xTranslateMultiplier;

      //use major and minor for left or right first
      if(params.indicator){
        xChange = params.tempo + ((i % 3) * 10);
      }
      else {xChange = -params.tempo;}

      //check even or odd for negative or positive x
      if(i == selectedMazurka.keyIndex){
        changeTranslateX(xChange * 3);
        changeTranslateY(-params.time);
      }
      else if(isEvenInteger(i)){
        changeTranslateX(xChange * 2);
        changeTranslateY(params.time / 4);
      }
      else{
        changeTranslateX(-xChange - 10);
        changeTranslateY(params.time / 5);
      }
    }
    else{
      currentX = width / 2 + params.tempo;
      currentY = 100;
    }

    if(i == selectedMazurka.keyIndex){
      currentX = width / 2;
    }

    let x = currentX; 
    let y = currentY;
    //add typeSpan to array
    var addAvoid = false;
    if(i >= selectedMazurka.keyIndex - 1){
      addAvoid = true;}
    typeSpans.push(new typeSpan(x, y, addAvoid));

    push(); // Save current transformation state
    // translate(x, y); // Move to the letter position
    
    // move x and y
    var xOffsetValue = remap(currentSectionTime(), 0, currentSectionMax, 0, 450 - currentX);
    // console.log("off: " + xOffsetValue);
    translate(x + xOffsetValue, y); // Move to the letter position

    // translate(x - xOffsetValue, 200);

    
    // shear
    
    guiShearMultiplier.updateDisplay();
    // console.log("shear: " + thisShearValue);
    if(!changingShear && (params.shearMultiplier  > 50 && params.shearMultiplier  < 300)){
      changingShear = true;
      
      
    }
    else if(changingShear && (params.shearMultiplier   < -50 || params.shearMultiplier  > 400)){
      changingShear = false;
      if(increasingShear){
        increasingShear = false;
        console.log("is decreasing shear ");
      }
      else{
        increasingShear = true;
        console.log("is increasing shear ");
      }
    }
    
    if(increasingShear){
      shearMultiplierIncreasement = 0.4;
      
    }
    else{
      shearMultiplierIncreasement = -0.4;
    }
    params.shearMultiplier = params.shearMultiplier + (volume * shearMultiplierIncreasement * 0.5);

    if(changingShear){
      console.log("threshold " );
      
      params.shearMultiplier = params.shearMultiplier + shearMultiplierIncreasement;
    }
    
    
    var thisShearValue = params.shearBase + (6 * params.shearMultiplier);
    // else{
    //   changingShear = false;
     
    // }

    if(i % 3 === 0){
      shearY(radians(ShearValueX(thisShearValue))); 
    }
    else{
      shearX(radians(ShearValueY(thisShearValue))); 
    }
    
    
    //scale
    var maxScale = 3.1;
    globalXScale = globalScaleWithBoundry(globalXScale, (volume * 0.02), maxScale) ;
    globalYScale = globalScaleWithBoundry(globalYScale, (volume* 0.02), maxScale);
    // params.xScale = remap(globalXScale);
    // params.xScale = remap(song.currentTime(), 0, currentSectionMax, 1, 2);
    // params.xScale = remap(volume, 0, 1, 1, 4);
    // params.xScale = params.xScale + (volume * 0.2);
    scale(globalXScale + (params.xScale - 1) , globalYScale + (params.yScale - 1));
    // scale(params.xScale , params.yScale);

    // translate(params.xOffset + xChange, params.yOffset + yChange); // Move the letter based on the index
    
    // rotate
    // params.rotationBase = song.currentTime() * 10;

    // params.rotateMultiplier = song.currentTime() * 5;
    // guiRotateMultiplier.updateDisplay();

    globalRotationAngle = globalRotationAngle + (volume * 2.7);
    let rotationAngle = radians(globalRotationAngle); // Default rotation angle
    // let rotationAngle = radians(params.rotationBase * params.rotateMultiplier); // Default rotation angle
    // let rotationAngle = params.rotationBase -(i * params.rotateMultiplier); // Default rotation angle
    // if(i == selectedMazurka.keyIndex){rotationAngle = 20;}
    rotate((rotationAngle));

    // draw
    


    textSize(thisTextSize);
    var thisSpanText = "";
    if(isCurrentSection ){
      thisSpanText = spans[i];
    }
    else if(isNextSection && 
      ((sectionIndex > 14 && sectionIndex < 15) || (sectionIndex > 17 && sectionIndex < 19))){
      thisSpanText = spans[i];
      
    }
    else if(isBeforeSection && 
      (sectionIndex > 12 && sectionIndex < 19)){
      thisSpanText = spans[i];
      
    }
    text(thisSpanText, 0, 0); // Draw the letter at the origin
    // text(spans[i], 0, 0); // Draw the letter at the origin
    pop(); // Restore transformation state
  }
  // let x = width / 2;
  // let y = height / 2;
  // translate(x, y);
  // rotate(params.globalRotationAngle);
  // pop();

//lines
  // drawLines();
  // drawRects();
  // drawPoints();
  
  

  console.log(currentSectionTime());

  

}

function currentSectionTime(){
  var currentSecTime = song.currentTime();
  console.log("current time: " + currentSecTime);
  for (i = 0; i < breaks.length; i++) {
    if(currentSecTime < breaks[i]){
      if(i == 0){
        return song.currentTime();
      }
      else{
        currentSecTime = currentSecTime - breaks[i - 1];
      return currentSecTime;
      }
      
    }
  }

}


function createSpans(text) {
  spans = []; // Clear previous spans
  for (let i = 0; i < text.length; i++) {
    let char = text.charAt(i);
    spans.push(char);
  }
}

function updateParameters(){
  selectedMazurka = window.mazurkaData.data[params.no];
  
  params.indicator = selectedMazurka.key;
  guiIndicator.updateDisplay();
  params.tempo = selectedMazurka.tempo;
  guiTempo.updateDisplay();
  params.time = selectedMazurka.length;
  guiTime.updateDisplay();
  shearMultiplier = selectedMazurka.tempo / 2

  if(selectedMazurka.keyIndex > textToDisplay.length){
    selectedIndex = textToDisplay.length - 1;
  }
  else if(selectedMazurka.keyIndex === 0){
    selectedIndex = 1;
  }

  else{
    selectedIndex = selectedMazurka.keyIndex;
  }
}

function isEvenInteger(value) {
  // Check if the value is an integer and if it's even
  return Number.isInteger(value) && value % 2 === 0;
}

var translateBound = 120;
function changeTranslateX(value){
  if(currentX + value < translateBound ){
    currentX = translateBound + Math.abs(value);
  }
  else if(currentX + value > width - translateBound){
    currentX = width - translateBound - Math.abs(value);
  } 
  else{
    currentX += value;
  }
}

function changeTranslateY(value){
  if(currentY + value < translateBound ){
    currentX = translateBound + Math.abs(value);
  }
  else if(currentY + value > width - translateBound){
    currentY = width - translateBound - Math.abs(value);
  } 
  else{
    currentY += value;
  }

  // if(currentY + value < 80 || currentY + value > width - 80){
  //   currentY = 300;
  // }
}

function drawLines(){
  // nofill();
  noFill();
  beginShape();
  stroke(255,255, 255); 
  strokeWeight(3.2);
  strokeJoin(ROUND);
  
  

  var baseX = params.tempo / (selectedIndex) + 210 ;
  var baseY = params.tempo * selectedIndex *0.25 - 100;
  var baseXIncrement = remap(params.tempo, 90, 200, 20, 70);
  var baseYIncrement = remap(params.time, 60, 360, 200, 360);
  var startX = baseX ;
  var startY = baseY; 
  vertex(startX, startY);                    
  // Control points for the first smooth turn
  var v1x1 = baseX + baseXIncrement;
  var v1y1 = baseY + (params.time * 1.6);
  var v1x2 = baseX + -90;
  var v1y2 = baseY + baseYIncrement;
  var v1x3 = baseX + baseXIncrement * 1.2;
  var v1y3 = baseY;
  bezierVertex(v1x1, v1y1, v1x2, v1y2, v1x3, v1y3); 
  // Control points for the second smooth turn, ending at (400, 50)
  var baseX = v1x3 +(baseXIncrement / 2);
  var baseY = v1y3 + 40;
  var v2x1 = baseX +50;
  var v2y1 = baseY + (params.time * 1.6);
  var v2x2 = baseX + -150;
  var v2y2 = baseY + baseYIncrement + 100;
  var v2x3 = baseX + 80;
  var v2y3 = baseY + 10;
  bezierVertex(v2x1, v2y1, v2x2, v2y2, v2x3, v2y3); 
  var baseX = v2x3 +(baseXIncrement / 3);
  var baseY = v2y3 + 60;
  //add another curve for majors
  if(params.indicator){
    var baseX = v1x3 +(baseXIncrement / 2);
    var baseY = v1y3 + 40;
    var v3x1 = baseX +50;
    var v3y1 = baseY + (params.time * 1.6);
    var v3x2 = baseX + -40;
    var v3y2 = baseY + baseYIncrement + 100;
    var v3x3 = baseX + 140;
    var v3y3 = baseY - 60;
    bezierVertex(v3x1, v3y1, v3x2, v3y2, v3x3, v3y3); 
  }
  push(); // Save current transformation state
  
  var angleAddition = 4;
  if(params.indicator){
    angleAddition = -12;
  }
  let rotationAngle = (keyIndex  + 14 + angleAddition); // Default rotation angle
  rotate(radians(rotationAngle));

  // bezierVertex(v2x1, v2y1, v2x2, v2y2, 300, 190); 
  endShape();
  
  pop(); // Restore transformation state

  //default setting after lines are drawn
  noStroke();
  fill(0, 0, 0);
  
}

function drawRects(){

  beginShape();
  
  noStroke()
  fill(255, 255, 255);
  
  let rectWidthBase = 8; // Thin width for each rectangle
  let rectWidthChange = 4;
  let spacing = 6;  // Spacing between each rectangle

  var startX = params.tempo + 150;
  var rectIndex = 0;

  
  
  for (let x = 0; x < 12; x++) {
    startX = startX + spacing + rectWidthBase;
    rectIndex ++;
    var rectNewWidth = rectWidthBase;
    
    if(isEvenInteger(rectIndex)){
      rectWidthBase = rectWidthBase + rectWidthChange;
    }
    else{
      rectWidthBase = rectWidthBase - rectWidthChange + 2;
    }
    // let rectHeight = (params.time - 50); // Height based on the index
    var rectNewHeight = remap(params.time, 90, 310, 140, 230 );
    if(rectIndex % 3 === 0){
      rectNewHeight = (rectNewHeight * 0.8) ;
    }
    else if(rectIndex % 5 === 0){
      rectNewHeight = (rectNewHeight *0.9) ;
    }
    else if(rectIndex === 1){
      rectNewHeight = rectNewHeight - 50;
    }
    

    push();
      var angleAddition = 4;
      
      let rotationAngle = (keyIndex   * 2) + angleAddition; // Default rotation angle
      rotate(radians(rotationAngle));
      rect(startX, rectNewHeight, rectNewWidth, (rectNewHeight+ 30)); // Draw from bottom up
    pop();
  }

  
  
  

  noStroke();
  fill(0, 0, 0);
  endShape();
}




function drawPoints(segmentLength = 400, point1, point2, point3, point4){



  noFill();
  stroke(255,255, 255); 
  // stroke(0, 0, 0); 
  strokeWeight(3.2);
  strokeJoin(ROUND);
  // Draw the existing Bézier curve
  beginShape();

  // randomly give true or false
  // var randomBool = Math.random() >= 0.5;
  var timeMultiplier = -1;
  if(point1.x < 0){
    timeMultiplier = 1;
  }
  else if(point4.x > width){
    var timeMultiplier = -1;

  }
  
  var currentTimeAddition = currentDrawPointTime * timeMultiplier;

  point1.x = point1.x + currentTimeAddition;
  point2.x = point2.x + currentTimeAddition;
  if(point2.y > 500){point2.y = point2.y - (volume * 10);}
  else{point2.y = point2.y + (volume * 2); }
  point3.x = point3.x + currentTimeAddition;
  point4.x = point4.x + currentTimeAddition;
  // p3.y = p3yBase - (volume * 10);
  var length = segmentLength;
  // var length = 400 / 2;
  //check if time has elapsed a total of 1 length:
  drawTime = 0.9;
  if(currentDrawPointTime > drawTime){
    console.log("time reset ");
    currentDrawPointTime = 0;
    var p0xTemp = point1.x;
    var p1xTemp = point2.x;
    var p2xTemp = point3.x;
    var p3xTemp = point4.x;
    point1.x = p3xTemp;
    point2.x = p2xTemp;
    point3.x = p1xTemp;
    point4.x = p0xTemp;
  }

  //this keeps iterating and never stops
  for (let tStep = 0; tStep <= currentDrawPointTime; tStep += (0.01)) {
    // tStep
    let pointOnCurve = getBezierPoint(tStep, p0, p1, p2, p3);
    vertex(pointOnCurve.x, pointOnCurve.y);
  }
  endShape();

  // Increment the animation time
  // currentTime += 0.01;
  // if (currentTime > 1) {
  //   noLoop(); // Stop the animation once the curve is fully drawn
  // }

  // Draw the Bézier curve
stroke(0);
endShape();
noStroke();
fill(0, 0, 0);
  
}

function drawPointsDuplicate(pt0, pt1, pt2, pt3, drawable = true)
{

 //points
  // p0 = createVector(p0x, p0y);
  // p1 = createVector(p1x, p1y);
  // p2 = createVector(p2x, p2y);
  // p3 = createVector(p3x, p3y);


  p0 = movedDrawingPoint(pt0, (lowFreq * 0.004));
  p1 = movedDrawingPoint(pt1, (volume * 5));
  p2 = movedDrawingPoint(pt2, (volume * 8));
  p3 = movedDrawingPoint(pt3, (lowFreq * 0.004));

  //reset drawTime if this is the first time drawing
  if(!pointBeganDrawing){
    pointBeganDrawing = true;
    currentDrawPointTime = 0;
  }

  noFill();
  stroke(255,255, 255); 
  // stroke(0, 0, 0); 
  strokeWeight(2.7);
  strokeJoin(ROUND);
  // Draw the existing Bézier curve
  beginShape();

  //visulization
  // point(p0.x, p0.y);
  // point(p1.x, p1.y);
  // point(p2.x, p2.y);
  // point(p3.x, p3.y);


  var timeMultiplier = -1;
  if(p0.x < 0){
    timeMultiplier = 1;
  }
  else if(p3.x > width){
    var timeMultiplier = -1;

  }
  
  drawTime = 0.9;
  // if(currentDrawPointTime > drawTime){
  //   console.log("time reset ");
  //   // currentTime = 0;
    
  // }

  //this keeps iterating and never stops
  // for (let tStep = 0; tStep <= currentDrawPointTime; tStep += (0.01)) {
  //   // tStep
  //   let pointOnCurve = getBezierPoint(tStep, p0, p1, p2, p3);
  //   vertex(pointOnCurve.x, pointOnCurve.y);
  // }
  if(drawable){
    bezier(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);

  }
  
  endShape();



  // Draw the Bézier curve
stroke(0);
endShape();
noStroke();
fill(0, 0, 0);
  
}



function getCurrentSectionLength(){
  if(sectionIndex > 0){
    return breaks[sectionIndex] - breaks[sectionIndex - 1];
  }
  else{
    return breaks[0];
  }
}


function globalScaleWithBoundry(value, addition, max){
  value = value + addition;
  if(value > max){
    isDecreasingSize = true;
  }

  if(isDecreasingSize){
    value = value - sizeDecreasemnt;
  }

  if(value < 1){
    isDecreasingSize = false;
  }

  return value;
}



// Function to calculate a point on a cubic Bézier curve at time t
function getBezierPoint(t, p0, p1, p2, p3) {
  let x = bezierPoint(p0.x, p1.x, p2.x, p3.x, t);
  let y = bezierPoint(p0.y, p1.y, p2.y, p3.y, t);
  return createVector(x, y);
}

function movedDrawingPoint(pt, verticalMultiplier){
  // var movingDown = pt.movedDown;
  if(pt.y > height - pt.yBoundry){
    pt.moveDown = false;
  }
  else if(pt.y < pt.yBoundry){
    pt.moveDown = true;
  }
  if(pt.moveDown){
    pt.y = pt.y + (verticalMultiplier * pt.moveSpeed);
  }
  else{
    pt.y = pt.y - (verticalMultiplier * pt.moveSpeed);
  }

  //horizontal
  if(pt.xOffset > 30){
    pt.moveLeft = true;
  }
  else if(pt.xOffset < -30){
    pt.moveLeft = false;

  }
  var xChange = (pt.moveSpeed * volume);
  if(pt.moveLeft){
    pt.x = pt.x - (xChange);
    pt.xOffset = pt.xOffset - xChange;
  }
  else{
    pt.x = pt.x + xChange;
    pt.xOffset = pt.xOffset + xChange;
  }
  return createVector(pt.x, pt.y);
}

function backgroundColor(){
  var r = 100;
  var g = 40;
  var b = 40;
  
  //for major
  if(params.indicator){
   
    r = 160 + remap(params.tempo, 96, 200, 0, 60);
    // r = 160 + remap(params.tempo, 96, 200, 0, 60) + (currentSectionTime() % 12);
    g = 20 +remap(params.tempo, 96, 200, 0, 40);
    b = remap(params.tempo, 96, 200, 0, 20);
  }

  //for minor
  else{
    
    r = 200
    g = remap(params.tempo, 96, 200, 0, 20);
    b = 50 + remap(params.tempo, 96, 200, 0, 40);
  }
  // console.log("r: " + r + " g: " + g + " b: " + b);
  return ([r, g, b]);
}

function ShearValueX(value){
  value = remap(value, 0, 360, 62, 82)
  // var shearMax = 80;
  // if(value > shearMax){
  //   value = value % shearMax;
  // }
  // if(value < 50){
  //   value = value + 20
  // }
  return value
}

function ShearValueY(value){
  value = remap(value, 0, 360, 62, 72)
  // var shearMax = 80;
  // if(value > shearMax){
  //   value = value % shearMax;
  // }
  // if(value < 50){
  //   value = value + 20
  // }
  return value
}

function shiftBackgroundColor(){

}

testLog();

function testLog(){
  console.log("test");
  console.log(isEvenInteger(0));
  console.log(isEvenInteger(1));
  console.log(ShearValueX(86))
}

function drawLog(){
  console.log("volume: " + volume);
  console.log("sectionIndex: " + sectionIndex);
}



function remap(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// Start audio when the user clicks
function mousePressed() {
  if (!audioStarted) {
    song.play();
    audioStarted = true;
  }
}

