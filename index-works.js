import { worksCollectionList } from "./worksData.js";
//grab documenmt elements
const worksContainer = document.querySelector(".works-container");
// implementImageRatio();
// function implementImageRatio(){
//     worksCollectionList.forEach(element => {
//         calculateAspectRatio(element.source).then(aspectRatioNumber => {
//             //set aspect ratio
//             // var aspectRatio: number = Number(aspectRatioNumber.toFixed(2)); // Get the resolved value as a number
//             // element.ratio = Number((1 / aspectRatio).toFixed(2));
//             // console.log('Aspect ratio:', element.ratio);
//           })
//           .catch(error => {
//             console.error('Error:', error);
//           });
//     });
// }
// function calculateAspectRatio(imageSrc: string): Promise<number> {
//     return new Promise((resolve, reject) => {
//       const img = new Image();
//       img.src = imageSrc;
//       img.onload = () => {
//         const aspectRatio = img.width / img.height;
//         resolve(aspectRatio);
//       };
//       img.onerror = () => {
//         reject(new Error('Failed to load the image.'));
//       };
//     });
//   }
//appending works to the page
worksCollectionList.forEach(element => {
    var parentDiv = document.createElement('div');
    parentDiv.classList.add("works-box");
    //set custom height
    parentDiv.style.gridRowEnd = "span " + (10 * element.ratio).toString();
    //console.log("span " + (10 * element.ratio).toString());
    console.log(parentDiv.style.gridRowEnd);
    // Create the child element for image (e.g., a <span> element)
    var childElement = document.createElement('img');
    childElement.src = element.source;
    childElement.classList.add("works-img");
    //create the child element for texts
    var childTextName = document.createElement('txt');
    childTextName.innerHTML = "『" + element.name + "』";
    childTextName.classList.add("worksText");
    var childTextMedia = document.createElement('txt');
    childTextMedia.innerHTML = " " + element.media;
    childTextMedia.classList.add("worksText");
    //check if work is expandable, add the expandable element to it
    if (element.expandable) {
        childElement.classList.add("expandable");
    }
    parentDiv.appendChild(childElement);
    parentDiv.appendChild(childTextName);
    parentDiv.appendChild(childTextMedia);
    worksContainer?.appendChild(parentDiv);
});
//turn on detail panel
//turn on detail panel
//turn on detail panel
//turn on detail panel
// Assuming you have a reference to the DOM element representing the works-grid container
const body = document.body;
const expandableVerticalGrid = document.querySelector('#expandableVerticalGrid');
//add evenetlistener to graybackdrop so it can be turned off when clicked
const grayBackdrop = document.querySelector('#grayBackdrop');
grayBackdrop.addEventListener('click', function () {
    //remove mouseover and mouleave eventlistener
    TurnGrayBackdropOff();
    enablePageScroll();
});
//eventlistener functions
function grayBackdropMouseOver() {
    grayBackdrop.style.opacity = "78%";
}
function grayBackdropMouseLeave() {
    grayBackdrop.style.opacity = "98%";
}
// Check if the worksContainer exists
if (worksContainer) {
    // Get all elements with the "works" class
    const worksElements = worksContainer.getElementsByClassName('works-img');
    // Loop through each works element
    Array.from(worksElements).forEach((element) => {
        // Check if the element has the "expandable" class
        if (element.classList.contains('expandable')) {
            if (element) {
                element.addEventListener('click', function () {
                    ExpandWorks(element);
                });
            }
            //ExpandWorks(element);
            console.log("found expandable");
        }
        else {
            //
        }
    });
}
function ExpandWorks(element) {
    //GET STRING
    //use name of the works to cut the string to get the name of the file, 
    //which matches the folder name
    if (element instanceof HTMLImageElement) {
        //get folder name
        const src = element.src;
        var fileNameString = extractFilenameFromSrc(src);
        console.log(fileNameString); // Prints the src value of the element
        //turn on gray background
        TurnGrayBackdropOn();
        //disable page scrolling
        disablePageScroll();
        //show expanded grid
        TurnGridOn(fileNameString);
        //enable grid scroll
    }
    else {
        console.log('not src');
    }
    ;
}
function extractFilenameFromSrc(src) {
    const filename = src.substring(src.lastIndexOf('works/') + 6, src.lastIndexOf('.'));
    console.log(filename);
    return filename;
}
function TurnGrayBackdropOn() {
    grayBackdrop.style.opacity = '98%';
    grayBackdrop.style.pointerEvents = "all";
    grayBackdrop.style.cursor = "crosshair";
    grayBackdrop.addEventListener('mouseover', grayBackdropMouseOver);
    grayBackdrop.addEventListener('mouseleave', grayBackdropMouseLeave);
}
function TurnGrayBackdropOff() {
    grayBackdrop.removeEventListener('mouseover', grayBackdropMouseOver);
    grayBackdrop.removeEventListener('mouseleave', grayBackdropMouseLeave);
    grayBackdrop.style.opacity = '0%';
    grayBackdrop.style.pointerEvents = 'none';
    //grayBackdrop.style.cursor = "crosshair";
    enablePageScroll();
    disenableGrid(expandableVerticalGrid);
    grayBackdrop.style.opacity = '0%';
    grayBackdrop.style.pointerEvents = 'none';
}
function TurnGridOn(folderName) {
    //check if grid is vertical or horizontal
    const filePath = "works/" + folderName + "/v1.jpg"; // Replace 'path/to/folder/v1' with the actual file path
    console.log(filePath);
    fetch(filePath)
        .then(response => {
        if (response.ok) {
            //turn on vertical grid
            console.log('vertical');
            enableGrid(expandableVerticalGrid);
            appendElementToGrid('v1', true, folderName);
            appendElementToGrid('v2', true, folderName);
            appendElementToGrid('v3', true, folderName);
            appendElementToGrid('v4', true, folderName);
            appendElementToGrid('v5', true, folderName);
            appendElementToGrid('v6', true, folderName);
        }
        else {
            console.log('horizontal');
        }
    })
        .catch(error => {
        console.log('horizontal');
    });
}
function disablePageScroll() {
    body.style.overflow = 'hidden';
}
// Function to enable scrolling
function enablePageScroll() {
    body.style.overflow = '';
}
function enableGrid(grid) {
    grid.style.pointerEvents = 'all';
}
function disenableGrid(grid) {
    grid.style.pointerEvents = 'none';
    //also delete all grid elements
    grid.innerHTML = '';
}
function appendElementToGrid(fileName, isVertical, folderName) {
    var gridElement = expandableVerticalGrid;
    //all images need to be jpg
    var elementPath = 'works/' + folderName + "/" + fileName + ".jpg";
    fetch(elementPath)
        .then(response => {
        if (response.ok) {
            //append child
            if (isVertical) {
                gridElement = expandableVerticalGrid;
            }
            else {
                //make element horizontal
            }
            const childElement = document.createElement('img');
            childElement.classList.add('expandableGridChild');
            childElement.src = elementPath;
            gridElement?.appendChild(childElement);
        }
        else {
        }
    });
}
//# sourceMappingURL=index-works.js.map