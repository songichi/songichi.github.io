



document.getElementById('brand-img-youyanshe').addEventListener('mouseover',
function() {
  document.querySelector('.brand-info-left').style.opacity = '100%';

});

document.getElementById('brand-img-youyanshe').addEventListener('mouseleave',
function() {
  document.querySelector('.brand-info-left').style.opacity = '0%';

});



document.getElementById('brand-img-youyanshe').addEventListener('click',
function() {
  document.querySelector('#brand-popup').style.display = 'flex';
  document.querySelector('#brand-item-youyanshe').style.display = 'inline';
  document.querySelector('.brand').style.filter = 'grayscale(100%)';

});


document.getElementById('brand-popup').addEventListener('click',
function() {
  document.querySelector('#brand-popup').style.display = 'none';
  document.querySelector('#brand-item-youyanshe').style.display = 'none';
  document.querySelector('.brand').style.filter = 'grayscale(0%)';
});
