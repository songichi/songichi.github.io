"use strict";
// Assuming you have a reference to the DOM element representing the works-grid container
const worksContainer = document.querySelector('.works-grid');
const body = document.body;
const expandableVerticalGrid = document.querySelector('#expandableVerticalGrid');
//add evenetlistener to graybackdrop so it can be turned off when clicked
const grayBackdrop = document.querySelector('#grayBackdrop');
grayBackdrop.addEventListener('click', function () {
    TurnGrayBackdropOff();
    enablePageScroll();
});
// Check if the worksContainer exists
if (worksContainer) {
    // Get all elements with the "works" class
    const worksElements = worksContainer.getElementsByClassName('works');
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
    const filename = src.substring(src.lastIndexOf('mis/') + 4, src.lastIndexOf('.'));
    return filename;
}
function TurnGrayBackdropOn() {
    grayBackdrop.style.opacity = '98%';
    grayBackdrop.style.pointerEvents = "all";
}
function TurnGrayBackdropOff() {
    grayBackdrop.style.opacity = '0%';
    grayBackdrop.style.pointerEvents = 'none';
    enablePageScroll();
    disenableGrid(expandableVerticalGrid);
}
function TurnGridOn(folderName) {
    //check if grid is vertical or horizontal
    const filePath = 'mis/' + folderName + "/v1.png"; // Replace 'path/to/folder/v1' with the actual file path
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
    var elementPath = 'mis/' + folderName + "/" + fileName + ".png";
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
//# sourceMappingURL=index-mis.js.map