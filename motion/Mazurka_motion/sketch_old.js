// import { mazurkaCollection } from "./data.js";

console.log(window.mazurkaData.data);



let textToDisplay = "Mazurka";
let spans = [];


let params = {
  xTranslateMultiplier: 30,
  xOffset: 0,
  yTranslateMultiplier: 60,
  yOffset: 0,
  xScale: 1,
  yScale: 1,
  shearMultiplier: 10,
  shearBase: 0,
  rotateMultiplier: 5,
  rotationBase: 100,
  textBaseSize: 30,
  textSizeMultiplier: 10,
  fill: [255, 0, 0],
  stroke: "#008000",
  strokeWeight: 10,
  globalRotationAngle: 0
};
let gui;

function setup() {
  createCanvas(600, 600);
  textSize(32);
  textAlign(CENTER, CENTER);

  // Create spans for each letter
  createSpans(textToDisplay);

  // Create GUI
  gui = new dat.GUI();
  gui.add(params, 'xTranslateMultiplier', 20, 100);
  gui.add(params, 'xOffset', -400, 400);
  gui.add(params, 'yTranslateMultiplier', 20, 100);
  gui.add(params, 'yOffset', -400, 400);
  gui.add(params, 'xScale', 1, 10);
  gui.add(params, 'yScale', 1, 10);
  gui.add(params, 'shearMultiplier', 10, 100);
  gui.add(params, 'shearBase', 0, 180);
  gui.add(params, 'rotateMultiplier', 0, 50);
  gui.add(params, 'rotationBase', 0, 360);
  gui.add(params, 'textBaseSize', 16, 70);
  gui.add(params, 'textSizeMultiplier', -30, 50);
  gui.addColor(params, 'fill');
  gui.addColor(params, 'stroke');
  gui.add(params, 'strokeWeight', 0, 20);
  gui.add(params, 'globalRotationAngle', 0, 360);
}


function draw() {
  background(220);
  
  // Display each span
  

  for (let i = 0; i < spans.length; i++) {
    let x = width / 2 - (spans.length * 16) / 2 + i * 32; // Center text
    let y = height / 2;
    //text(spans[i], x, y);
    push(); // Save current transformation state
    translate(x, y); // Move to the letter position
    
    // shear
    shearY(radians(params.shearBase + (i * params.shearMultiplier))); 
    
    //scale
    scale(params.xScale, params.yScale);

    // move x and y
    var xChange = -120 + (i % 3) * params.xTranslateMultiplier;
    var yChange = -60 +(i % 3) * params.yTranslateMultiplier;
    translate(params.xOffset + xChange, params.yOffset + yChange); // Move the letter based on the index
    
    // rotate
    let rotationAngle = params.rotationBase -(i * params.rotateMultiplier); // Default rotation angle
    rotate(rotationAngle);

    // draw
    textSize((params.textBaseSize + ((i % 3) * params.textSizeMultiplier)));
    text(spans[i], 0, 0); // Draw the letter at the origin
    pop(); // Restore transformation state
  }
  // let x = width / 2;
  // let y = height / 2;
  // translate(x, y);
  // rotate(params.globalRotationAngle);
  // pop();

}

function createSpans(text) {
  spans = []; // Clear previous spans
  for (let i = 0; i < text.length; i++) {
    let char = text.charAt(i);
    spans.push(char);
  }
}