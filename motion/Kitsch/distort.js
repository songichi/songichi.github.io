function generateRandomList(minValue, maxValue, count) {
  let result = [];
  for (let i = 0; i < count; i++) {
    let value = floor(random(minValue, maxValue + 1)); // +1 to include maxValue
    result.push(value);
  }
  return result;
}

function generateRandomListDecimal(minValue, maxValue, count) {
  let result = [];
  for (let i = 0; i < count; i++) {
    let value = +random(minValue, maxValue).toFixed(2);
    result.push(value);
  }
  return result;
}

var switchIndexBool = true;
var previousSwitchedIndex = 0;
let alreadySwitched = false;
// function switch2Index(n ) {
//   if (alreadySwitched) {
//     n = previousSwitchedIndex
//   }else{
//     previousSwitchedIndex = n;
//   }
//   if (n === 2) {
//     if (switchIndexBool) {
//       // console.log("t");
//       switchIndexBool = false;
//       return 0;
//     } else {
//       // console.log("f");
//       switchIndexBool = true;
//       return 1;
//     }
//   }
//   if (n === 1) {
//     if (switchIndexBool) {
//       switchIndexBool = false;
//       return 2;
//     } else {
//       switchIndexBool = true;
//       return 0;
//     }
//   }
//   if (n === 0) {
//     if (switchIndexBool) {
//       switchIndexBool = false;
//       return 1;
//     } else {
//       switchIndexBool = true;
//       return 2;
//     }
//   }
//   alreadySwitched = true;
// }

function switchNextIndex(n, isNext = true) {

  if (n === 1) return 0;
  if (n === 0) return 2;
  if (n === 2) return 1;
}

function switchColorIndex(n, isNext = true) {

  if (n === 2) {
    if (isNext) {
      return 0;
    } else {
      return 1;
    }
  }
  if (n === 1) {
    if (isNext) {
      switchIndexBool = false;
      return 2;
    } else {
      switchIndexBool = true;
      return 0;
    }
  }
  if (n === 0) {
    if (isNext) {
      return 1;
    } else {
      return 2;
    }
  }
}

function segmentContours(points, threshold = 20) {
  let segments = [];
  let current = [points[0]];

  for (let i = 1; i < points.length; i++) {
    let d = dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
    if (d > threshold) {
      segments.push(current);
      current = [];
    }
    current.push(points[i]);
  }

  if (current.length > 0) segments.push(current);
  return segments;
}

function applyPuckerBloat(points, distortion, centerX, centerY, strength = 50) {
  let newPoints = [];

  for (let pt of points) {
    let dx = pt.x - centerX;
    let dy = pt.y - centerY;
    let distVal = sqrt(dx * dx + dy * dy);

    if (distVal === 0) {
      newPoints.push({ x: pt.x, y: pt.y });
      continue;
    }

    let dirX = dx / distVal;
    let dirY = dy / distVal;

    // If distortion is 0, return original point
    if (distortion === 0) {
      newPoints.push({ x: pt.x, y: pt.y });
    } else {
      let newX = pt.x + dirX * distortion * strength;
      let newY = pt.y + dirY * distortion * strength;
      newPoints.push({ x: newX, y: newY });
    }
  }

  return newPoints;
}

function shearPoints(
  points,
  shearAngleXDeg = 0,
  shearAngleYDeg = 0,
  centerX = 0,
  centerY = 0
) {
  let shearAngleXRad = radians(shearAngleXDeg);
  let shearAngleYRad = radians(shearAngleYDeg);
  let newPoints = [];

  for (let pt of points) {
    // Translate point relative to center
    let relX = pt.x - centerX;
    let relY = pt.y - centerY;

    // Apply shear transformation
    let x = relX + relY * tan(shearAngleXRad);
    let y = relY + relX * tan(shearAngleYRad);

    // Translate back to original position
    // if(shearAngleXDeg !== 0){

    // }
    newPoints.push({
      x: x + centerX,
      y: y + centerY,
    });
  }

  return newPoints;
}

function applyEnvelopeSqueeze(points, distortion, cx, cy) {
  let newPoints = [];

  for (let pt of points) {
    // Distance from vertical center
    let dx = pt.x - cx;
    let dy = pt.y - cy;

    // Squeeze logic: scale X inward based on Y distance
    // The farther a point is from vertical center, the more it is affected
    // distortion > 0 squeezes inward, < 0 expands outward
    var height = 80;
    let factor = 1 - distortion * cos((dy / height) * PI); // cosine-shaped squeeze
    let newX;
    if (distortion === 0) {
      newX = pt.x;
    }
    newX = cx + dx * factor;
    let newY = pt.y;

    newPoints.push({ x: newX, y: newY });
  }

  return newPoints;
}

function applyEnvelopeArc(points, distortion, cx, cy) {
  let newPoints = [];

  for (let pt of points) {
    // Distance from horizontal center
    let dx = pt.x - cx;
    let dy = pt.y - cy;

    var height = 10;
    var width = 2;

    // Normalize Y to range -1 to 1
    let yNorm = dy / height;

    // Apply horizontal shift based on vertical position
    // distortion > 0 creates arc outward at top, < 0 arcs inward
    let offsetX = distortion * (1 - yNorm * yNorm) * width * 0.5;

    let newX = pt.x + offsetX;
    let newY = pt.y;

    newPoints.push({ x: newX, y: newY });
  }

  return newPoints;
}

function applyEnvelopeWave(
  points,
  distortion = 30,
  cx = 0,
  cy = 0,
  frequency = 12
) {
  let newPoints = [];
  var width = 40;
  for (let pt of points) {
    // Horizontal wave based on X position
    let dx = pt.x - cx; // distance from center X
    let offsetY = distortion * sin((dx / width) * TWO_PI * frequency);

    newPoints.push({
      x: pt.x,
      y: pt.y + offsetY,
    });
  }

  return newPoints;
}

function applyEnvelopeShell(points, distortion, cx = 0, cy = 0) {
  let newPoints = [];

  var width = 10;
  for (let pt of points) {
    let dx = pt.x - cx;

    // Normalize x from -1 to 1
    let xNorm = dx / width;

    // Parabolic profile centered at xNorm = 0
    let offset = Math.abs(distortion) * (1 - xNorm * xNorm);

    // Apply vertically based on distortion sign
    let newY = pt.y - Math.sign(distortion) * offset;

    newPoints.push({ x: pt.x, y: newY });
  }

  return newPoints;
}

function sortPointsRadially(points) {
  // Step 1: compute centroid
  let cx = 0,
    cy = 0;
  for (let pt of points) {
    cx += pt.x;
    cy += pt.y;
  }
  cx /= points.length;
  cy /= points.length;

  // Step 2: sort by angle from center
  points.sort((a, b) => {
    let angleA = atan2(a.y - cy, a.x - cx);
    let angleB = atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });

  return points;
}

function applyRadialPullDistortion(
  points,
  distortion = 0.5,
  cx = 0,
  cy = 0,
  influenceRadius = 80
) {
  let newPoints = [];

  for (let pt of points) {
    let dx = pt.x - cx;
    let dy = pt.y - cy;

    // Distance from center
    let distFromCenter = sqrt(dx * dx + dy * dy);

    // Normalize distance to 0~1 within influence radius
    let normDist = constrain(distFromCenter / influenceRadius, 0, 1);

    // Closer points (smaller normDist) get pulled more
    // Invert distance to get influence weight: 1 = full pull, 0 = no pull
    // let influence = 1 - normDist;
    let influence = pow(1 - normDist, 2);

    // The closer the point, the stronger the pull
    let strength = distortion * influence * 2;

    // Unit direction vector from point to center
    let dirX = dx / distFromCenter || 0;
    let dirY = dy / distFromCenter || 0;

    // Move point toward (or away from) center
    let newX = pt.x - dirX * strength * influenceRadius;
    let newY = pt.y - dirY * strength * influenceRadius;

    newPoints.push({ x: newX, y: newY });
  }

  return newPoints;
}

// 15 / 16
function applyVerticalWaveDistortion(
  points,
  distortion = 1,
  cy = 0,
  numPortions = 2
) {
  let newPoints = [];

  // Clamp distortion between 0 and 1 just in case
  distortion = Math.min(Math.max(distortion, 0), 1);

  // Calculate offset in pixels based on distortion (0 to maxOffset)
  var maxOffset = 10; // Maximum offset in pixels
  let offsetAmount = distortion * maxOffset;

  // Determine vertical bounds
  let minY = Math.min(...points.map((p) => p.y));
  let maxY = Math.max(...points.map((p) => p.y));
  let portionHeight = (maxY - minY) / numPortions;

  for (let pt of points) {
    // Which vertical portion?
    let portionIndex = Math.floor((pt.y - minY) / portionHeight);

    // Alternate direction per portion
    let direction = portionIndex % 2 === 0 ? -1 : 1;

    // Apply offset scaled by distortion
    let offsetX = direction * offsetAmount;

    newPoints.push({
      x: pt.x + offsetX,
      y: pt.y,
    });
  }

  return newPoints;
}
