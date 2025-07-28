function alphaShape(points, alpha) {
  // This function will return an array of points that form an organic boundary around the input points
  // You can adjust the alpha to control concavity: lower alpha makes a more concave shape
  // 1. Generate a Delaunay triangulation
  let delaunay = Delaunator.from(points);

  // 2. Loop through edges of the triangles and filter based on alpha (distance)
  let edges = [];
    // console.log(points);
    // console.log(delaunay.halfedges);
    // console.log(delaunay.triangles.length);
  for (let i = 0; i < delaunay.halfedges.length; i++) {

    

    let e = delaunay.halfedges[i];
    if (e < 0) continue; // skip if not a valid edge

    // console.log("e:", e);   
    let p1 = points[delaunay.triangles[e]];
    let p2 = points[delaunay.triangles[e + 1]];
    // console.log("p1:", p1, "p2:", p2);
    if(!p1 || !p2) continue; // skip if points are undefined

    let d = dist(p1[0], p1[1], p2[0], p2[1]);

    if (d < alpha) {
      edges.push([p1, p2]);
    }
  }

  // 3. Now, connect the points and form a boundary
  return edges;
}

function getConcaveBoundary(points, alpha) {
  // Here we take the points and return the concave shape's boundary
  let edges = alphaShape(points, alpha);
  //   console.log("Edges:", edges);

  // 4. Generate boundary points from edges
  let boundary = [];
  edges.forEach((edge) => {
    boundary.push(edge[0], edge[1]);
  });

  return boundary;
}

function drawConcaveShape(boundary) {
  // Function to render the concave shape on the canvas
  beginShape();
  boundary.forEach((pt) => {
    vertex(pt[0], pt[1]);
  });
  endShape(CLOSE);
}

// Example usage in p5.js
let points = [
  [50, 50],
  [150, 50],
  [200, 100],
  [300, 200],
  [250, 300],
  [150, 250],
];


function drawRoundedConcaveShape(boundary) {
  if (boundary.length < 3) return; // need at least 3 points for a shape

  beginShape();
  // Duplicate the first and last points for smoothing
  curveVertex(boundary[boundary.length - 1][0], boundary[boundary.length - 1][1]); // before first
  for (let i = 0; i < boundary.length; i++) {
    curveVertex(boundary[i][0], boundary[i][1]);
  }
  curveVertex(boundary[0][0], boundary[0][1]); // after last
  curveVertex(boundary[1][0], boundary[1][1]); // one more to close the curve nicely
  endShape(CLOSE);
}



function drawSmoothShapeWithBezier(points, roundness = 1) {
  if (points.length < 3) return;

  beginShape();

  for (let i = 0; i < points.length; i++) {
    let prev = points[(i - 1 + points.length) % points.length];
    let curr = points[i];
    let next = points[(i + 1) % points.length];

    // Vectors for direction in/out
    let v1 = createVector(curr[0] - prev[0], curr[1] - prev[1]);
    let v2 = createVector(next[0] - curr[0], next[1] - curr[1]);

    // Normalize and scale
    v1.normalize().mult(dist(curr[0], curr[1], prev[0], prev[1]) * roundness);
    v2.normalize().mult(dist(curr[0], curr[1], next[0], next[1]) * roundness);

    let p1 = [curr[0] - v1.x, curr[1] - v1.y]; // control point coming in
    let p2 = [curr[0], curr[1]];              // vertex
    let p3 = [curr[0] + v2.x, curr[1] + v2.y]; // control point going out

    if (i === 0) {
        console.log("Starting point:", p1);
      vertex(p1[0], p1[1]); // Move to starting point
    }

    bezierVertex(p2[0], p2[1], p2[0], p2[1], p3[0], p3[1]);
  }

  endShape(CLOSE);
}



function getRegionBounds(points, canvasWidth, canvasHeight) {
  const regionPoints = {
    TL: [], TM: [], TR: [],
    ML: [], C: [], MR: [],
    BL: [], BM: [], BR: []
  };

  const w = canvasWidth / 3;
  const h = canvasHeight / 3;

  // 1. Sort points into region buckets
  for (let pt of points) {
    console.log("Point:", pt);
    let col = Math.floor(pt[0] / w);
    let row = Math.floor(pt[1] / h);
    col = constrain(col, 0, 2);
    row = constrain(row, 0, 2);
    

    const regionNames = ['T', 'M', 'B'];
    const rowKey = regionNames[row];
    const colKey = ['L', 'M', 'R'][col];
    const regionKey = rowKey + colKey;
    regionPoints[regionKey].push(pt);
  }

  // 2. For each relevant region, extract extreme point(s)
  let boundary = [];

  // TL: topmost & leftmost
  if (regionPoints.TL.length > 0) {
    boundary.push(getExtreme(regionPoints.TL, 'top'));
    boundary.push(getExtreme(regionPoints.TL, 'left'));
  }

  // TM: topmost
  if (regionPoints.TM.length > 0) {
    boundary.push(getExtreme(regionPoints.TM, 'top'));
  }

  // TR: topmost & rightmost
  if (regionPoints.TR.length > 0) {
    boundary.push(getExtreme(regionPoints.TR, 'top'));
    boundary.push(getExtreme(regionPoints.TR, 'right'));
  }

  // MR: rightmost
  if (regionPoints.MR.length > 0) {
    boundary.push(getExtreme(regionPoints.MR, 'right'));
  }

  // BR: bottommost & rightmost
  if (regionPoints.BR.length > 0) {
    boundary.push(getExtreme(regionPoints.BR, 'bottom'));
    boundary.push(getExtreme(regionPoints.BR, 'right'));
  }

  // BM: bottommost
  if (regionPoints.BM.length > 0) {
    boundary.push(getExtreme(regionPoints.BM, 'bottom'));
  }

  // BL: bottommost & leftmost
  if (regionPoints.BL.length > 0) {
    boundary.push(getExtreme(regionPoints.BL, 'bottom'));
    boundary.push(getExtreme(regionPoints.BL, 'left'));
  }

  // ML: leftmost
  if (regionPoints.ML.length > 0) {
    boundary.push(getExtreme(regionPoints.ML, 'left'));
  }

  return boundary;
}

// Helper function to find extreme points
function getExtreme(points, direction) {
  if (points.length === 0) return null;
  let compare, accessor;
  if (direction === 'top') {
    accessor = (pt) => pt[1];
    compare = Math.min;
  } else if (direction === 'bottom') {
    accessor = (pt) => pt[1];
    compare = Math.max;
  } else if (direction === 'left') {
    accessor = (pt) => pt[0];
    compare = Math.min;
  } else if (direction === 'right') {
    accessor = (pt) => pt[0];
    compare = Math.max;
  }

  let extremeVal = compare(...points.map(accessor));
  for (let pt of points) {
    if (accessor(pt) === extremeVal) return pt;
  }
}

function drawRoundedBoundary(boundary, roundness = 0.25) {
  beginShape();
  for (let i = 0; i < boundary.length; i++) {
    let prev = boundary[(i - 1 + boundary.length) % boundary.length];
    let curr = boundary[i];
    let next = boundary[(i + 1) % boundary.length];

    let dx1 = curr[0] - prev[0];
    let dy1 = curr[1] - prev[1];
    let dx2 = next[0] - curr[0];
    let dy2 = next[1] - curr[1];

    let p1 = [
      curr[0] - dx1 * roundness,
      curr[1] - dy1 * roundness
    ];
    let p2 = [
      curr[0] + dx2 * roundness,
      curr[1] + dy2 * roundness
    ];

    if (i === 0) vertex(p1[0], p1[1]);
    bezierVertex(curr[0], curr[1], curr[0], curr[1], p2[0], p2[1]);
  }
  endShape(CLOSE);
}