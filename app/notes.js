
class artistStyle{
    constructor(artist, artStyle, medium, usage, image){
        this.artist = artist;
        this.artStyle = artStyle;
        this.medium = medium;
        this.usage = usage;
        this.image = image;
    }
}

var artistStyleList = [];
 
function addArtistStyle(thisArtist, thisArtStyle, medium, usage, image){
    var newArtistStyle = new artistStyle(thisArtist, thisArtStyle, medium, usage, image);
    artistStyleList.push(newArtistStyle);
}

addArtistStyle("Syd Mead", "modern, futuristic", "digital", "concept art", "notesImages/SydMead.jpg");
addArtistStyle("Théophile Steinlen", "90s, line", "handdrawn", "book illustration", "notesImages/ThéophileSteinlen.jpg");
addArtistStyle("Tomer Hanuka", "contemporary, eye-catching", "digital", "scene illustration", "notesImages/TomerHanuka.jpg");
addArtistStyle("Victo Ngai", "contemporary, ornaments, fantasy", "digital", "scene illustration", "notesImages/VictoNgai.jpg");
addArtistStyle("andrew atroshenko", "women protraits", "acrylic", "protrait painting", "notesImages/AndrewAtroshenko.jpg");
addArtistStyle("Ashley Wood", "skechy", "watercolor, digital", "concept art", "notesImages/AshleyWood.jpg");
addArtistStyle("Ben Quilty", "diso elysium-like", "acrylic", "painting", "notesImages/BenQuilty.jpg");
addArtistStyle("Charley Harper", "minimalist, colorful", "digital", "illustration", "notesImages/CharleyHarper.webp");
addArtistStyle("Craig Mullins", "game epic scene, corase", "digital", "concept art", "notesImages/CraigMullins.jpg");
addArtistStyle("eyvind earle", "detailed scenery", "digital", "illustration", "notesImages/EyvindEarle.webp");
addArtistStyle("Hiroshi Yoshida", "nodoka, japanese", "watercolor", "illustration", "notesImages/HiroshiYoshida.jpg");

// addArtistStyle("*name", "*style", "*medium", "*usage", "*image");





//foreach item, add a new card element
for(var i = 0; i < artistStyleList.length; i++){
    const div = document.createElement("div");
    div.setAttribute("class", "card");
    div.setAttribute("width", "15rem");
    div.innerHTML = `
        <img src="` + artistStyleList[i].image + `" class="card-img-top" alt="no image">
        <div class="card-body">
            <p class="card-text">` + artistStyleList[i].artist + `</p>
        </div>
        <ul class="list-group list-group-flush">
            <li class="list-group-item">` + artistStyleList[i].usage + `</li>
            <li class="list-group-item">` + artistStyleList[i].medium + `</li>
        </ul>
        <div class="card-body"><a href="http://www.google.com/images?q=` + artistStyleList[i].artist + `" class="card-link">Click for details</a></div>
            `;
        document.getElementById("notesGrid").appendChild(div);
    }
        
        //      <div class="card" style="width: 15rem;">
        
        //</div>