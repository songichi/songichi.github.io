


var fileUplodaed
const fileSelector = document.getElementById('fileSelector');
  fileSelector.addEventListener('change', (event) => {
    fileUplodaed = event.target;
  });

const convertBtn = document.getElementById('convertBtn');

function hello(){
  child_process.execSync("echo Hello World");
}