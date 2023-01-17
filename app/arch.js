
class artistStyle{
    constructor(artist, artStyle, link, image){
        this.artist = artist;
        this.artStyle = artStyle;
        this.link = link;
        this.image = image;
    }
}

var artistStyleList = [];
 
function addArtistStyle(thisArtist, thisArtStyle, link, image){
    var newArtistStyle = new artistStyle(thisArtist, thisArtStyle, link, image);
    artistStyleList.push(newArtistStyle);
}

addArtistStyle("Dadad Market", "Bangkok Tokyo Architecture + OPH", "https://www.archdaily.com/905924/dadad-market-bangkok-tokyo-architecture-plus-oph", "notesImages/SydMead.jpg");
addArtistStyle("Barceloneta Market", "MiAS Arquitectes", "https://www.archdaily.com/140622/barceloneta-market-mias-arquitectes", "notesImages/SydMead.jpg");
addArtistStyle("World of Food", "Harvey Otten + Ted Schulten", "https://www.archdaily.com/777290/world-of-food-harvey-otten", "notesImages/SydMead.jpg");


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
        <a href="` + artistStyleList[i].link + `" class="card-link">Link</a>
        </ul>
        <div class="card-body"><a href="http://www.google.com/images?q=` + artistStyleList[i].artist + `" class="card-link">Click for details</a></div>
            `;
        document.getElementById("notesGrid").appendChild(div);
    }
        