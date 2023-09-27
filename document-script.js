// const mainContent = document.getElementById("main-content");
// const toggleZIndexButton = document.getElementById("toggleZIndex");

// function updateButtonText() {
//     if (getComputedStyle(mainContent).zIndex === "1") {
//         toggleZIndexButton.textContent = "Hide Text";
//     } else {
//         toggleZIndexButton.textContent = "Show Text";
//     }
// }

// toggleZIndexButton.addEventListener('click', function() {
//     if (getComputedStyle(mainContent).zIndex === "1") {
//         mainContent.style.zIndex = "-2";
//     } else {
//         mainContent.style.zIndex = "1";
//     }
//     updateButtonText();
// });

// updateButtonText();

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
let intervalIsSet = false;

document.querySelectorAll("h1, h2, a, #navbar-bottom a").forEach(element => {
    element.addEventListener('mouseover', addTextChanging);
    element.addEventListener('click', addTextChanging)
});

function addTextChanging(event) {
    if (intervalIsSet) return;
    if(!event.target.dataset.value) return;

    intervalIsSet = true;

    let iterations = 0;
    const interval = setInterval(() => {
        event.target.innerText = event.target.innerText.split("")
            .map((letter, index) => {
                if (index <= iterations) {
                    return event.target.dataset.value[index];
                }
                return letters[Math.floor(Math.random() * 26)]
            })
            .join("");

        iterations += 1 / 2;

        if (iterations >= event.target.dataset.value.length) {
            clearInterval(interval);
            intervalIsSet = false;
            iterations = 0;
        }
    }, 30);
}

document.querySelectorAll("img").forEach(img => {
    img.addEventListener('click', event => {
        if (!event.target.classList.contains('wobblingScaling')) {
            event.target.classList.add('wobblingScaling');
        } else {
            event.target.classList.remove('wobblingScaling');
        }
    });
});
