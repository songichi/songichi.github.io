let motionObjects = [];

class MotionObject {
  constructor(name, desc) {
    this.name = name;
    this.desc = desc;
    this.video = null;
  }

  create(index) {
    // Create a p5 DOM video element
    this.video = createVideo(`works/motion/${this.name}.mp4`);
    this.video.size(600, AUTO);
    this.video.attribute('controls', '');
    this.video.position((windowWidth - 600) / 2, 400 + index * (200 + 337)); // assume ~337px height

    // Optional: create a description element
    if (this.desc) {
      let descP = createP(this.desc);
      descP.style('width', '600px');
      descP.style('text-align', 'center');
      descP.style('color', '#333');
      descP.position((windowWidth - 600) / 2, 400 + index * (200 + 337) - 40);
    }
  }
}

function setup() {
  noCanvas();
  // Example entries — replace/add as needed
  motionObjects.push(new MotionObject('file1', 'First animation work'));
  motionObjects.push(new MotionObject('file2', 'Second motion piece'));

  for (let i = 0; i < motionObjects.length; i++) {
    motionObjects[i].create(i);
  }
}