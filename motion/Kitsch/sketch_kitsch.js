let rectWidth = 80; // Width of each rectangle
let rectHeight = rectWidth * 3.4; // Height maintaining 1:3.4 ratio
let initialGap = 40; // Initial gap between rectangles
let reducedGap = 2; // Gap between rectangles after moving to bottom (set to 2px)
let numRects = 8; // Number of rectangles
let rects = []; // Array to store rectangle objects
let verticalOffset = 50; // Pixels to move the group up from center
let moveToBottom = false; // Flag to initiate move to bottom

let bottomY; // Target y-coordinate for bottom position
let animationProgress = 0; // Progress of the bottom move animation
let animationDuration = 60; // Duration of the bottom move animation in frames
let clickedRectIndex = -1; // Index of the clicked rectangle
let targetScales = []; // Array to store target scales for each rectangle
let targetPositions = []; // Array to store target positions for each rectangle

let globalTargetScales = []; // Global array to store target scales for all rectangles
var posterWidth = 840;
var posterHeight = 1188;

var levelVariable = 0.3;
var redColor;
var blueColor;
var whiteColor;
var colors;
var CharCount = 0;
var charColorIndexs = [];
var defaultCharColorIndexes = [
  0, 1, 2, 1, 2, 2, 1, 0, 2, 1, 0, 1, 2, 0, 2, 1, 0, 1, 1, 0, 2, 1, 2, 0, 1, 2,
  0,
];
var outerScaleIndexArray;
let yScaleArray = [];
let targetXScaleArray = [];
// var currentXScaleOuter;
let xScaleArray = [];
let targetYScaleArray = [];
// var currentYScaleOuter;
let strokeWeightArray = [];
let distortionIndexArray = [];
let nextDistortionIndexArray = [];
let distortionAdditionArray = [];
let distortionMutiplierArray = [];
let innerShapeXTranslateArray = [];
let animationScaleArray = [];
let letterPointsArray = [];
let originalPointsArray = [];
let previousLetterPointsArray = [];
let yTranslateArray = [];
var previousYTranslateArray = [];

let boolArray = [];
for (let i = 0; i < 50; i++) {
  boolArray.push(i % 2 === 0);
}

var colorSwitchIndex = 0;

var distortionTypeCount = 12;

//debug
var xScaleOuterDebug;
var yScaleOuterDebug;

var globalDistortion = 0.1;
var globalKitsch = 0;

// var overallYTranslate = 10;
var line1Offset = 100;
var line3Offset = 200;
let lines = [
  { text: "刻奇的变形", y: 160, index: 0 },
  { text: "Metamorphosis", y: 630, index: 1 },
  { text: "of Kitsch", y: 1000, index: 2 },
];
let textSize1 = 146;
let textSize2 = 64;
let textSize3 = 140;
let startXValue = 70;
var linesCharNum = 0;
var maruFont;
function preload() {
  maruFont = loadFont("fonts/Maru-Regular.otf"); // path to your font file
  // img1 = loadImage('images/img1.png');
  // img2 = loadImage('images/img2.png');
  // img3 = loadImage('images/img3.png');
  // imgP = loadImage('images/imgP.png');
  imgTop = loadImage("images/imgTop.png");
  imgTop1 = loadImage("images/imgTop1.png");
  imgBot = loadImage("images/imgBot.png");
  imgBot2 = loadImage("images/imgBot2.png");
  imgBot3 = loadImage("images/imgBot3.png");
  imgBotColored = loadImage("images/imgBotColored.png");
  imgClock = loadImage("images/clock.png");
  // imgMiddle = loadImage('images/imgMiddle.png');
}

//gui

let params = {
  no: 0,
  distortion: 0.1,
  kitsch: 0.1,
};
let gui;
// Create GUI
gui = new dat.GUI();
gui.add(params, "no", 0, 13).step(1).name("NO.");
var guiDistortion = gui
  .add(params, "distortion", 0, 0.6)
  .step(0.02)
  .name("Distortion");

var img1;

function setup() {
  console.log(typeof hull);
  createCanvas(posterWidth, posterHeight);
  calculateInitialPositions();

  redColor = color(229, 34, 39);
  blueColor = color(27, 164, 222);
  whiteColor = color(255);
  yellowColor = color(242, 213, 22);

  var orangeColor = color(213, 93, 53);
  var greenColor = color(68, 172, 88);
  var purpleColor = color(68, 80, 157);
  var blackColor = color(0, 0, 0);

  colors = [whiteColor, redColor, blueColor, yellowColor];
  // colors = [blackColor, orangeColor, greenColor, purpleColor];
  background(colors[3]);

  imageMode(CORNER); // Ensures image is positioned by top-left corner
  var count = 0;
  for (let line of lines) {
    let chars = line.text.split("");
    let x = startXValue;
    for (let i = 0; i < chars.length; i++) {
      fill(colors[0]);
      if (line.index === 0) {
        textSize(textSize1 - 10);
      } else if (line.index === 1) {
        textSize(textSize2 - 5);
      } else if (line.index === 2) {
        textSize(textSize3 - 10);
      }
      count = count + 1;
    }
  }
  CharCount = count;
  console.log(CharCount);

  // generateCharColorIndex();
  // charColorIndexs = generateRandomList(0,2, CharCount);
  generateCharColorIndex();
  // charColorIndexs = defaultCharColorIndexes;
  generateYScaleArray();
  yScaleArray = generateYScaleArray();
  targetYScaleArray = yScaleArray;
  generateXScaleArray();
  targetXScaleArray = xScaleArray;
  strokeWeightArray = generateRandomList(21, 60, CharCount);
  outerScaleIndexArray = generateRandomList(30, 60, CharCount);
  distortionIndexArray = generateRandomList(
    0,
    distortionTypeCount - 1,
    CharCount
  );
  nextDistortionIndexArray = distortionIndexArray;
  distortionAdditionArray = generateRandomListDecimal(0, 0.2, CharCount);
  distortionMutiplierArray = generateRandomListDecimal(0.7, 1.4, CharCount);
  yTranslateArray = generateRandomListDecimal(-4, 4, CharCount);
  previousYTranslateArray = yTranslateArray.slice();
  animationScaleArray = generateRandomListDecimal(0, 0.4, CharCount);
  // console.log(charColorIndexs);

  var testingDistortion = false;
  if (testingDistortion) {
    distortionIndexArray = generateRandomList(14, 15, CharCount);
    nextDistortionIndexArray = distortionIndexArray;
  }
  console.log(distortionIndexArray);

  //generate original points for each letter
  for (let line of lines) {
    let chars = line.text.split("");
    let x = startXValue; // starting x-position
    for (let i = 0; i < chars.length; i++) {
      var thisTextSize = 140;
      var xAddition = 10;
      if (line.index === 0) {
        thisTextSize = 140;
        xAddition = 10;
      } else if (line.index == 1) {
        thisTextSize = 70;
        xAddition = -18;
      } else if (line.index === 2) {
        thisTextSize = 150;
        xAddition = 23;
      }

      var points = maruFont.textToPoints(chars[i], x, line.y, thisTextSize, {
        sampleFactor: 0.4,
        simplifyThreshold: 0,
      });
      originalPointsArray.push(points);
      if (chars[i] === "i" || chars[i] === "r" || chars[i] === "t") {
        x += 22; // spacing for narrow characters
      } else if (chars[i] === "m") {
        x -= 18;
      }
      x += textWidth(chars[i]) + xAddition; // spacing between characters
    }
  }
}

function draw() {
  background(colors[3]);
  autoOscillateDistortion();
  textFont(maruFont);
  var index = 0;
  globalDistortion = triangleValue;
  // globalDistortion = params.distortion;

  //this value dedicates how much text move vertically, differently made each line
  var yTranslate = 1;
  var yTranslateMultiplier = 1;

  
  letterPointsArray = [];
  let drawnPoints = [];
  let currentDrawnPoints = [];
  var charIndex = -1;
  for (let line of lines) {
    let chars = line.text.split("");
    let x = startXValue; // starting x-position
    var alignTranslate = 0;
    var yScaleMultiplier = 1;
    // console.log(chars.length);
    for (let i = 0; i < chars.length; i++) {
      charIndex++;
      var charPointsArray = [];

      if (line.index === 0) {
        thisTextSize = 140;
        yTranslateMultiplier = 4;
        yScaleMultiplier = 1.1;
      } else if (line.index == 1) {
        thisTextSize = 68;
        yTranslateMultiplier = 7;
        yScaleMultiplier = 1;
      } else if (line.index === 2) {
        thisTextSize = 150;
        yTranslateMultiplier = 5;
        yScaleMultiplier = 1.05;
      }
      // console.log(thisTextSize);
      textSize(thisTextSize);

      //scales
      var currentXScaleOuter;
      xScaleOuterDebug = currentXScaleOuter;
      var currentYscaleOuter;
      yScaleOuterDebug = currentYscaleOuter;
      if (isOscillatingUp) {
        currentXScaleOuter = map(
          currentOscillationMultiplier,
          0,
          1,
          xScaleArray[index],
          targetXScaleArray[index]
        );
        currentYscaleOuter = map(
          currentOscillationMultiplier,
          0,
          1,
          yScaleArray[index],
          targetYScaleArray[index]
        );
      } else {
        currentXScaleOuter = map(
          currentOscillationMultiplier,
          1,
          0,
          xScaleArray[index],
          targetXScaleArray[index]
        );
        currentYscaleOuter = map(
          currentOscillationMultiplier,
          1,
          0,
          yScaleArray[index],
          targetYScaleArray[index]
        );
      }
      // console.log(currentXScaleOuter); //0.5
      // console.log(currentYscaleOuter); // 1.3

      // y translates/
      //
      //
      //
      var verticalShift = currentYscaleOuter * 40;

      var targetYTranslate = yTranslateArray[index];
      var currentYTranslate = 0;
      if (isOscillatingUp) {
        currentYTranslate = map(
          currentOscillationMultiplier,
          0,
          1,
          previousYTranslateArray[index],
          targetYTranslate
        );
      } else {
        currentYTranslate = map(
          currentOscillationMultiplier,
          1,
          0,
          previousYTranslateArray[index],
          targetYTranslate
        );
      }
      yTranslate = currentYTranslate;
      // yTranslate = yTranslateArray[index] * 4;
      // var thisTextSize = 140;

      // yTranslate = (yTranslate ) * currentOscillationMultiplier * (yTranslateMultiplier + 0.4) ;
      yTranslate = yTranslate * (yTranslateMultiplier + 0.4);
      // yTranslate = yTranslate * (yTranslateMultiplier + 0.4);
      //applying a multiplier to vary value effect on each letter
      var distortionAddition =
        distortionAdditionArray[index] * globalDistortion;

      let distortion = 0; // positive for bloat, negative for pucker
      // if(isOscillatingUp){
      //   if(currentOscillationMultiplier < 0.5){
      //     distortion =
      //   }
      // }
      distortion =
        globalDistortion * distortionMutiplierArray[index] + distortionAddition; // positive for bloat, negative for pucker
      // distortion = ((globalDistortion * distortionMutiplierArray[index]) + distortionAddition) * triangleValue; // positive for bloat, negative for pucker

      //new way of rendering punker
      // console.log(line.y);
      // var points = maruFont.textToPoints(chars[i], x, line.y, thisTextSize, {
      //   sampleFactor: 0.4,
      //   simplifyThreshold: 0,
      // });

      var points = originalPointsArray[charIndex].slice();
      var originalPoints = points.slice();
      // points.push(points.shift());
      // points = sortPointsRadially(points);

      // let contours = segmentContours(points, 25); // if you're using this
      // console.log(x);
      // let bounds = maruFont.textBounds(chars[i], x, line.y, thisTextSize);
      let bounds = maruFont.textBounds(chars[i], x, line.y, thisTextSize);
      // let bounds = getBoundsFromPoints(points);
      let cx = bounds.x + bounds.w / 2;
      let cy = bounds.y + bounds.h / 2;
      let cHeight = bounds.h / 2;

      // ✅ Call the external function

      // apply a lesser transformation to the outer edges

      //record shapes:

      points = applyDistortionByIndex(
        originalPoints,
        distortion * 0.3,
        distortionIndexArray[index],
        cx,
        cy
      );
      // console.log(distortion);
      //record points for further use:
      letterPointsArray.push(points);

      //lerp points
      drawnPoints = points.slice();
      for (let j = 0; j < drawnPoints.length; j++) {
        var previousX = 0;
        var previousY = 0;

        if (distortionHasStarted && oscillationToppedOnce) {
          // console.log(previousLetterPointsArray);
          // throw new Error("Force stop: something went wrong");
          // console.log(drawnPoints.length);
          // console.log(charIndex);
          // console.log(j);

          previousX = previousLetterPointsArray[charIndex][j].x;
          previousY = previousLetterPointsArray[charIndex][j].y;
        }

        if (isOscillatingUp) {
          drawnPoints[j].x = map(
            currentOscillationMultiplier,
            0,
            1,
            previousX,
            points[j].x
          );
          drawnPoints[j].y = map(
            currentOscillationMultiplier,
            0,
            1,
            previousY,
            points[j].y
          );
        } else {
          drawnPoints[j].x = map(
            currentOscillationMultiplier,
            1,
            0,
            previousX,
            points[j].x
          );
          drawnPoints[j].y = map(
            currentOscillationMultiplier,
            1,
            0,
            previousY,
            points[j].y
          );
        }
        // console.log("drawnPoints:", drawnPoints[j]);
        var newCurrentPt = {x: drawnPoints[j].x, y: drawnPoints[j].y + yTranslate};
        currentDrawnPoints.push(newCurrentPt);
      }

      //outer edge shape with thick stroke
      push(); // Save the current drawing state
      
      let thisColor =
        colors[switchNextIndex(charColorIndexs[index], boolArray[index])];

      // let fillColor = colors[switchNextIndex(charColorIndexs[index], boolArray[index])];
      fill(thisColor);
      // var shiftedIndexes = [...charColorIndexs.slice(1), charColorIndexs[0]];
      stroke(thisColor);

      var thisStrokeWeight = strokeWeightArray[index] + globalDistortion * 20;
      strokeWeight(thisStrokeWeight);
      // translating makes scale to center from center of the shape
      //set center of tranlate to differnt spots according to which line it is
      //so the top scales bottom, the middld scales center, the bottom scalse up
      translateLineHeights(true);
      // translate(0, -verticalShift); // move upward depending on scale

      var verticalShift = 100;
     

      var xScaleOuter = currentXScaleOuter + 0.5;
      var yScaleOuter = currentYscaleOuter * yScaleMultiplier;
      // var xScaleOuter = targetXScaleArray[index] + 0.5;
      // var yScaleOuter = (targetYScaleArray[index]) * yScaleMultiplier ;
      scale(xScaleOuter, yScaleOuter);
      translateLineHeights(false);

      // translate(-cx, -cy); //move back center point

      beginShape();
      strokeJoin(ROUND);

      var counter = 0;
      // vertex (points[0].x, points[0].y);
      for (let pt of drawnPoints) {
        vertex(pt.x, pt.y + yTranslate);
        if (counter === points.length - 1) {
          // console.log("a");
          // vertex(points[0].x, points[0].y);
        }
        counter = counter + 1;
      }
      endShape();
      // endShape(CLOSE);
      pop();

      //inner shape should be slightly smaller than outer shape
      // therefore using this value to make it smaller
      var scaleOffset = 0.2;

      let randomAddition = +random(0, 0.2).toFixed(1);

      //give each shape a number of which distortion to apply
      //apply all distortions here, so only the inner shape gets disorted
      let shearAngleX = distortion * 60; // 30
      let shearAngleY = distortion * 40; // 20
      fill(colors[charColorIndexs[index]]);

      // applyPuckerBloat(points, distortion, cx, cy);

      //middle shape
      push(); // Save the current drawing state
      noStroke();

      // translating makes scale to center from center of the shape

      translateLineHeights(true);

      var xScaleInner =
        currentXScaleOuter +
        scaleOffset +
        animationScaleArray[index] * currentOscillationMultiplier;
      var yScaleInner =
        currentYscaleOuter +
        scaleOffset +
        animationScaleArray[index] * currentOscillationMultiplier;
      // var xScaleInner = xScaleArray[index] + scaleOffset + (animationScaleArray[index] * currentOscillationMultiplier);
      // var yScaleInner = yScaleArray[index] + scaleOffset + (animationScaleArray[index] * currentOscillationMultiplier);
      scale(xScaleInner, yScaleInner);
      translateLineHeights(false);
      // translate(-cx, -cy); //move back center point

      beginShape();
      strokeJoin(ROUND);
      points = applyDistortionByIndex(
        originalPoints,
        distortion,
        distortionIndexArray[index],
        cx,
        cy
      );

      // fill(thisColor);
      var counter = 0;
      // vertex (points[0].x, points[0].y);
      for (let pt of drawnPoints) {
        vertex(pt.x, pt.y + yTranslate);
        if (counter === points.length - 1) {
          // console.log("a");
          // vertex(points[0].x, points[0].y);
        }
        counter = counter + 1;
      }
      
      endShape();
      // endShape(CLOSE);
      pop();


      //end
      // text(chars[i], 0, 0);
      x += textWidth(chars[i]) + 10; // spacing between characters
      index = index + 1;

      //functions
      function translateLineHeights(translating = true) {
        var mul = 1;
        if (!translating) {
          mul = -1;
        }
        if (line.index === 0) {
          translate(cx * mul, 0);
        } else if (line.index === 1) {
          translate(cx * mul, cy * mul);
        } else if (line.index === 2) {
          // console.log("a");
          translate(cx * mul, (cy + cHeight / 2) * mul);
        }
      }
    }
  }

  //image part:
  let targetWidth = 200;
  // let imgScale = targetWidth / img1.width;
  // let targetHeight = img1.height * imgScale;

  let imgMargin = 20;
  let x = width - targetWidth - imgMargin; // 50px margin from right
  let y = imgMargin; // 50px margin from top
  // var img = loadImage("images/img1.png"); // Load your image here
  blendMode(BLEND); // or DIFFERENCE, SCREEN, etc.
  // image(img1, x, y, targetWidth, targetHeight);
  // image(img2, imgMargin, y+5, 200, 60);
  // image(img3, imgMargin + 230, y+5, 350, 30);
  tint(colors[0]);
  // image(imgBot, imgMargin, height - 160, width-40, 140);
  image(imgBot3, imgMargin, height - 160, width - 40, 140);
  // image(imgBot2, imgMargin, height - 160, width-40, 140);
  // image(imgBotColored, imgMargin, height - 160, width-40, 140);
  // image(imgTop, imgMargin, imgMargin, width-40, 80);
  image(imgTop1, imgMargin, imgMargin, width - 40, 80);

  let angle = map(currentOscillationMultiplier, 0, 1, 0, 360);
  // var clock = image(imgClock, imgMargin, 300, 100, 100);

  //clock 1
  push();
  translate(imgMargin + 50, 400 + 50); // move origin to center of the image (100x100)
  rotate(radians(angle)); // rotate by mapped angle
  imageMode(CENTER);
  image(imgClock, 0, 0, 100, 100); // draw image centered
  imageMode(CORNER); // reset to default if needed later
  pop();
  //clock 2
  push();
  translate(imgMargin + 50, 800 + 50); // move origin to center of the image (100x100)
  rotate(radians(angle)); // rotate by mapped angle
  imageMode(CENTER);
  image(imgClock, 0, 0, 100, 100); // draw image centered
  pop();
  //clock 3
  push();
  translate(width - 70, 200 + 50); // move origin to center of the image (100x100)
  rotate(radians(angle)); // rotate by mapped angle
  imageMode(CENTER);
  image(imgClock, 0, 0, 100, 100); // draw image centered
  pop();
  //clock 4
  push();
  translate(width - 70, 600 + 50); // move origin to center of the image (100x100)
  rotate(radians(angle)); // rotate by mapped angle
  imageMode(CENTER);
  image(imgClock, 0, 0, 100, 100); // draw image centered
  pop();

  // image(imgMiddle, imgMargin, 120, width-40, 1000);
  blendMode(BLEND);
  noTint();
  // console.log(index);

  // In draw:
  // HULL
  // let hullPoints = getHull(letterPointsArray, 100);
  // beginShape();
  // for (let pt of hullPoints) {
  //   vertex(pt[0], pt[1]);
  // }
  // endShape(CLOSE);


  let boundaryPoints = [];
  let boundaryIndex = 0;
  for (let pt of currentDrawnPoints) {
    
      if(boundaryIndex % 10 === 0){
        boundaryPoints.push([pt.x, pt.y]);
      }
      boundaryIndex++;
    
  }
  // for (let ary of drawnPoints) {
  //   for (let pt of ary) {
  //     if(boundaryIndex % 2 === 0){
  //       boundaryPoints.push([pt.x, pt.y]);
  //     }
  //     boundaryIndex++;
  //   }
  // }

  //triangulation method
  var concaveBoundary = getConcaveBoundary(boundaryPoints, 0.8);
  // console.log(concaveBoundary.length);
  // noStroke();
  stroke(colors[3]);
  strokeWeight(2);
  noFill();
  // fill(colors[3]);
  // drawConcaveShape(concaveBoundary);
  // drawRoundedConcaveShape(concaveBoundary);
  // drawSmoothShapeWithBezier(concaveBoundary);

  console.log(currentDrawnPoints);
  // let boundary = getRegionBounds(currentDrawnPoints, width, height);
  // drawRoundedBoundary(boundary, 0.3);

}

function checkMalformedPoints(points) {
  points.forEach((pt, index) => {
    if (!pt) {
      console.error(`Point at index ${index} is null or undefined`);
    } else if (pt.length !== 2) {
      console.error(`Point at index ${index} is not a 2D point. It has ${pt.length} elements:`, pt);
    } else {
      if (pt[0] === undefined || pt[1] === undefined) {
        console.error(`Point at index ${index} has undefined values:`, pt);
      }
    }
  });
}

function mousePressed() {}

// function resetToOriginalState() {
//   animationProgress = 0;
//   moveToBottom = true;
//   clickedRectIndex = -1;

//   targetPositions = [];
//   globalTargetScales = [];

//   let totalWidth = numRects * rectWidth + (numRects - 1) * initialGap;
//   let startX = (width - totalWidth) / 2 + rectWidth / 2;
//   let centerY = height / 2 - verticalOffset;

//   for (let i = 0; i < numRects; i++) {
//     targetPositions.push(startX + i * (rectWidth + initialGap));
//     globalTargetScales.push(1.0);
//     rects[i].y = lerp(rects[i].y, centerY, 0.1); // Will animate upwards
//   }
// }

// function generateDistortionArray(min = 0, max = distortionTypeCount - 1, count = CharCount) {
//   var ary = []
//   ary = generateRandomList(min, max, CharCount);
//   return ary
// }
function calculateInitialPositions() {}

// function calculateTargetPositionsAndScales() {
//   targetPositions = [];
//   let totalWidth = numRects * rectWidth + (numRects - 1) * reducedGap;
//   let startX = (width - totalWidth) / 2 + rectWidth / 2;

//   for (let i = 0; i < numRects; i++) {
//     let x = startX + i * (rectWidth + reducedGap);
//     targetPositions.push(x);
//     // Set the target scale for all rectangles
//     globalTargetScales[i] = (i === clickedRectIndex) ? 0.32 : 0.25;
//   }
// }

function generateCharColorIndex() {
  var colorIndexes = [];
  let lastIndex = -1;

  for (let i = 0; i < CharCount; i++) {
    let options = [0, 1, 2].filter((index) => index !== lastIndex);
    let chosen = random(options);
    colorIndexes.push(chosen);
    lastIndex = chosen;
  }
  charColorIndexs = colorIndexes;
  charColorIndexs = defaultCharColorIndexes.slice();
  // charColorIndexs = defaultCharColorIndexes.slice();
}

function generateYScaleArray() {
  var ary = [];
  // yScaleArray = [];
  let lastValue = null;
  var minScale = 1.01;
  var maxScale = 3.6;

  for (let i = 0; i < CharCount; i++) {
    if (i >= 0 && i < 5) {
      minScale = 1.7;
      maxScale = 2.6;
    } else if (i >= 5 && i < 17) {
      minScale = 1.8;
      maxScale = 2.4;
    } else if (i >= 17) {
      minScale = 1.7;
      maxScale = 2.8;
    }

    let value;
    let attempts = 0;
    do {
      value = +random(minScale, maxScale).toFixed(1); // generate and round to 1 decimal
      attempts++;
      // Avoid infinite loop in rare case
      if (attempts > 100) break;
    } while (lastValue !== null && Math.abs(value - lastValue) < 0.3);

    // yScaleArray.push(value);
    ary.push(value);

    lastValue = value;
  }
  return ary;
}

function generateXScaleArray() {
  xScaleArray = [];
  let lastValue = null;
  var minScale = 0.4;
  var maxScale = 0.54;

  for (let i = 0; i < CharCount; i++) {
    let value;
    let attempts = 0;
    do {
      value = +random(minScale, maxScale).toFixed(1); // generate and round to 1 decimal
      attempts++;
      // Avoid infinite loop in rare case
      if (attempts > 100) break;
    } while (lastValue !== null && Math.abs(value - lastValue) < 0.5);

    xScaleArray.push(value);
    lastValue = value;
  }
}

let distortionHasStarted = false;
let oscillationToppedOnce = false;
let lastDistortion = null;
var currentOscillationMultiplier = 1;
let triangleValue = 1;

var isOscillatingUp = true;
let oscillationMaxVal = 0.86;

function autoOscillateDistortion() {
  let t = millis() / 1000;
  let cycle = 3.5;
  let phase = (TWO_PI * (t % cycle)) / cycle;

  // Sinusoidal oscillation
  let minVal = 0;
  // oscillationMaxVal = 0.8;
  let oscillated = (sin(phase - HALF_PI) + 1) / 2;
  let currentValue = lerp(minVal, oscillationMaxVal, oscillated);
  params.distortion = currentValue;
  currentOscillationMultiplier = constrain(
    map(currentValue, 0, oscillationMaxVal, 0, 1),
    0,
    1
  );
  if (currentOscillationMultiplier <= 0.5) {
    triangleValue = map(currentOscillationMultiplier, 0, 0.5, 1, 0);
  } else {
    triangleValue = map(currentOscillationMultiplier, 0.5, 1, 0, 1);
  }
  // console.log(currentOscillationMultiplier);
  // console.log(triangleValue);
  let threshold = 0.001;
  let topThreshold = oscillationMaxVal - 0.001;

  // if (distortionHasStarted && (currentValue >= topThreshold) && lastDistortion >= threshold && isOscillatingUp) {
  //   distortionIndexArray = nextDistortionIndexArray.slice();
  //   nextDistortionIndexArray = shuffle(nextDistortionIndexArray);
  //   yTranslateArray = shuffle(yTranslateArray);
  //   animationScaleArray = shuffle(animationScaleArray);

  //   xScaleArray = targetXScaleArray.slice();
  //   yScaleArray = targetYScaleArray.slice();
  //   targetXScaleArray = shuffle(targetXScaleArray);
  //   targetYScaleArray = shuffle(targetYScaleArray);
  //   isOscillatingUp = false;
  //   console.log("oscillation hits top");
  // }

  // if (distortionHasStarted && (currentValue < threshold) && lastDistortion >= threshold) {
  if (
    distortionHasStarted &&
    (currentValue < threshold ||
      (currentValue >= topThreshold && isOscillatingUp)) &&
    lastDistortion >= threshold
  ) {
    // console.log("Distortion just reached (approximately) 0");
    // var seed = distortionIndexArray[0] + distortionIndexArray[1];

    // distortionIndexArray = generateRandomList(0, 9, CharCount);
    // distortionIndexArray.push(distortionIndexArray.shift());
    distortionIndexArray = nextDistortionIndexArray.slice();
    // nextDistortionIndexArray = shuffle(nextDistortionIndexArray);
    nextDistortionIndexArray = generateRandomList(
      0,
      distortionTypeCount - 1,
      CharCount
    );

    previousLetterPointsArray = letterPointsArray.slice();
    // console.log(previousLetterPointsArray);
    previousYTranslateArray = yTranslateArray.slice();
    yTranslateArray = shuffle(yTranslateArray);
    // animationScaleArray = shuffle(animationScaleArray);

    //this holds a copy of the previous array instead of linking it
    xScaleArray = targetXScaleArray.slice();
    yScaleArray = targetYScaleArray.slice();
    targetXScaleArray = shuffle(targetXScaleArray);
    targetYScaleArray = generateYScaleArray();

    if (currentValue > topThreshold) {
      isOscillatingUp = false;
      oscillationToppedOnce = true;
      // console.log(xScaleOuterDebug);
      // console.log(yScaleOuterDebug);
      console.log("oscillation hits top");
    } else if (currentValue < threshold) {
      // strokeWeightArray = shuffle(strokeWeightArray);
      console.log("oscillation hits bottom");
      isOscillatingUp = true;
    }
  }

  //this is the main value that distortion is applying to
  lastDistortion = currentValue;

  // Flag to skip first frame
  if (!distortionHasStarted && currentValue > 0) {
    distortionHasStarted = true;
  }
}

// function getHull(pointsArray, concavity = 100) {
//   let allPts = [];
//   for (let letterPoints of pointsArray) {
//     for (let pt of letterPoints) {
//       allPts.push([pt.x, pt.y]);
//     }
//   }
//   return hull(allPts, concavity); // Returns array of [x, y] points forming the boundary
// }


function windowResized() {
  resizeCanvas(posterWidth, posterHeight);
  calculateInitialPositions();
}



function applyDistortionByIndex(points, distortion, index, cx, cy) {
  // var usedDistortionArray = [];
  // if(isOscillatingUp){
  //   if(currentOscillationMultiplier < 0.5){
  //     usedDistortionArray = distortionIndexArray;
  //   }
  //   else{
  //     usedDistortionArray = nextDistortionIndexArray;
  //   }
  // }
  // else if(!isOscillatingUp){
  //   if(currentOscillationMultiplier < 0.5){
  //     usedDistortionArray = nextDistortionIndexArray;
  //   }
  //   else{
  //     usedDistortionArray = distortionIndexArray;
  //   }
  // }
  // switch(usedDistortionArray[index]){
  var scaleMultiplier = triangleValue;
  switch (distortionIndexArray[index]) {
    case 0:
      points = shearPoints(points, distortion * 60, 0, cx, cy);
      scaleOffset = -0.07 * scaleMultiplier;

      break;
    case 1:
      points = shearPoints(points, 0, distortion * 40, cx, cy);
      scaleOffset = -0.07 * scaleMultiplier;

      break;
    case 2:
      points = applyPuckerBloat(points, distortion, cx, cy);
      scaleOffset = -0.2 * scaleMultiplier;
      break;
    case 3:
      points = applyPuckerBloat(points, -distortion, cx, cy);
      scaleOffset = 0.24 * scaleMultiplier;
      break;
    case 4:
      points = applyEnvelopeSqueeze(points, distortion, cx, cy);
      break;
    case 5:
      points = applyEnvelopeSqueeze(points, -distortion, cx, cy);
      break;
    case 6:
      points = applyEnvelopeArc(points, distortion, cx, cy);
      break;
    case 7:
      points = applyEnvelopeArc(points, -distortion, cx, cy);
      break;
    case 8:
      points = applyEnvelopeShell(points, distortion, cx, cy);
      break;
    case 9:
      points = applyEnvelopeShell(points, -distortion, cx, cy);
      break;
    case 10:
      points = applyEnvelopeSqueeze(points, distortion, cx, cy);
      points = shearPoints(points, distortion * 60, 0, cx, cy);
      scaleOffset = -0.07 * scaleMultiplier;
      break;
    case 11:
      points = applyEnvelopeSqueeze(points, -distortion, cx, cy);
      points = shearPoints(points, -distortion * 60, 0, cx, cy);
      scaleOffset = -0.07 * scaleMultiplier;
      // fill(140);
      break;
    // case 12:
    //   points = applyRadialPullDistortion(points, distortion, cx, cy);
    //   // scaleOffset = -0.07 * scaleMultiplier;
    // case 13:
    //   points = applyRadialPullDistortion(points, -distortion, cx, cy);
    //   // scaleOffset = -0.07 * scaleMultiplier;
    // case 12:
    //   points = applyVerticalWaveDistortion(points, distortion, cx, cy, 12);
    //   break;
    // case 13:
    //   points = applyVerticalWaveDistortion(points, -distortion, cx, cy, 12);
    //   break;
    // default:
    //   break;
  }
  return points;
}

function getBoundsFromPoints(points) {
  if (points.length === 0) return null;

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (let pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    x1: minX,
    y1: minY,
    x2: maxX,
    y2: maxY,
  };
}
