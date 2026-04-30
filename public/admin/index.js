const sideMenu = document.querySelector('aside');
const menuBtn = document.getElementById('menu-btn');
const closeBtn = document.getElementById('close-btn');
const darkMode = document.querySelector('.dark-mode');

if (menuBtn && sideMenu) {
    menuBtn.addEventListener('click', () => {
        sideMenu.style.display = 'block';
    });
}

if (closeBtn && sideMenu) {
    closeBtn.addEventListener('click', () => {
        sideMenu.style.display = 'none';
    });
}

if (darkMode) {
    darkMode.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode-variables');

        const lightIcon = darkMode.querySelector('span:nth-child(1)');
        const darkIcon = darkMode.querySelector('span:nth-child(2)');
        if (lightIcon) lightIcon.classList.toggle('active');
        if (darkIcon) darkIcon.classList.toggle('active');
    });
}
