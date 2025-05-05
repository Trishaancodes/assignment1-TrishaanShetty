function logout() {
    window.location.href = "/logout";
  }
  
  window.onload = function () {
    const imagePlaceholder = document.querySelector(".image-placeholder");

    const images = ["/public/dog11.jpg", "/public/dog2.jpg", "/public/dog3.jpg"];
    const randomImage = images[Math.floor(Math.random() * images.length)];

    const imgElement = document.createElement("img");
    imgElement.src = randomImage;

    imagePlaceholder.innerHTML = '';
    imagePlaceholder.appendChild(imgElement);
};