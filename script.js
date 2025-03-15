// Global variables
let isLoggedIn = false;
const categories = ["English literature", "Littérature française", "الادب العربي", "for kids"];
let db;
let currentPage = 1;
const booksPerPage = 8;
let cart = [];

// Open IndexedDB
const dbName = "BookStoreDB";
const dbVersion = 1;

const request = indexedDB.open(dbName, dbVersion);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("books")) {
        const objectStore = db.createObjectStore("books", { keyPath: "id", autoIncrement: true });
        objectStore.createIndex("title", "title", { unique: false });
        objectStore.createIndex("author", "author", { unique: false });
        objectStore.createIndex("price", "price", { unique: false });
        objectStore.createIndex("category", "category", { unique: false });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    console.log("Database opened successfully!");
    loadBooks();
};

request.onerror = function(event) {
    console.error("Error opening database:", event.target.error);
    Swal.fire({
        icon: 'error',
        title: 'Database Error',
        text: 'Failed to open the database. Please refresh the page.',
    });
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('bookImage')?.addEventListener('change', previewImage);

    // Enhanced button animations
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        });
    });

    // Infinite Scroll with Error Handling
    let isLoading = false;
    window.addEventListener('scroll', () => {
        if (!isLoading && window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
            isLoading = true;
            currentPage++;
            loadBooks().finally(() => {
                isLoading = false;
            });
        }
    });

    // Initialize cart dropdown
    const cartLink = document.querySelector('#cartCount');
    const cartDropdown = document.getElementById('cartDropdown');
    
    cartLink?.addEventListener('click', (e) => {
        e.preventDefault();
        cartDropdown?.classList.toggle('show');
    });

    // Close cart dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#cartCount') && !e.target.closest('#cartDropdown')) {
            cartDropdown?.classList.remove('show');
        }
    });

    // Initialize theme
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').textContent = '☀️';
    }

    loadBooks();
});

// Theme Toggle

const texts = document.querySelectorAll('.color-changing-text');
        const colors = ['rgb(94, 255, 0)', 'rgb(116, 200, 255)', 'rgb(7, 223, 7)', 'purple', 'orange', 'pink', 'rgb(236, 40, 40)', 'cyan','rgba(255, 238, 0, 0.89)' ];

        function getRandomColor(excludeColors = []) {
            let availableColors = colors.filter(color => !excludeColors.includes(color));
            const randomIndex = Math.floor(Math.random() * availableColors.length);
            return availableColors[randomIndex];
        }

        function changeColor() {
            const usedColors = [];
            texts.forEach(text => {
                const newColor = getRandomColor(usedColors);
                text.style.color = newColor;
                usedColors.push(newColor); // إضافة اللون المستخدم إلى القائمة
            });
        }

        setInterval(changeColor, 2000); // تغيير الألوان كل 2 ثانية

// Authentication Functions
async function handleLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;

    if (!email || !password) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Input',
            text: 'Please enter both email and password.',
        });
        return;
    }

    try {
        const hashedPassword = await hashPassword(password);

        if (email === 'Email@example.com' && hashedPassword === await hashPassword('admin123')) {
            isLoggedIn = true;
            document.getElementById('loginSuccess')?.classList.remove('d-none');
            document.getElementById('addBookBtn')?.classList.remove('d-none');
            document.getElementById('loginBtn')?.classList.add('d-none');
            document.getElementById('logoutBtn')?.classList.remove('d-none');
            document.querySelectorAll('.delete-book-btn').forEach(btn => btn.classList.remove('d-none'));
            
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                bootstrap.Modal.getInstance(loginModal)?.hide();
            }

            Swal.fire({
                icon: 'success',
                title: 'Welcome!',
                text: 'You have successfully logged in.',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: 'Invalid email or password.',
            footer: 'The correct information is: Email: Email@example.com, Password: admin123',
            timer: 4000,
            showConfirmButton: false
        });
    }
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function handleLogout() {
    Swal.fire({
        title: 'Logout Confirmation',
        text: 'Are you sure you want to logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            isLoggedIn = false;
            document.getElementById('loginSuccess')?.classList.add('d-none');
            document.getElementById('addBookBtn')?.classList.add('d-none');
            document.getElementById('loginBtn')?.classList.remove('d-none');
            document.getElementById('logoutBtn')?.classList.add('d-none');
            document.querySelectorAll('.delete-book-btn').forEach(btn => btn.classList.add('d-none'));
            
            Swal.fire({
                icon: 'success',
                title: 'Logged Out',
                text: 'You have been successfully logged out.',
                timer: 2000,
                showConfirmButton: false
            });
        }
    });
}

// Book Management Functions
function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid File',
            text: 'Please select an image file.',
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = function() {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.src = reader.result;
            preview.classList.remove('d-none');
        }
    }
    reader.readAsDataURL(file);
}

async function handleAddBook() {
    const title = document.getElementById('bookTitle')?.value;
    const author = document.getElementById('bookAuthor')?.value;
    const shortSummary = document.getElementById('bookShortSummary')?.value;
    const longSummary = document.getElementById('bookLongSummary')?.value;
    const price = document.getElementById('bookPrice')?.value;
    const category = document.getElementById('bookCategory')?.value;
    const imageFile = document.getElementById('bookImage')?.files[0];

    if (!title || !author || !shortSummary || !longSummary || !price || !category || !imageFile) {
        Swal.fire({
            icon: 'error',
            title: 'Missing Information',
            text: 'Please fill in all fields and select an image.',
        });
        return;
    }

    try {
        const reader = new FileReader();
        reader.onload = async function() {
            const book = {
                title,
                author,
                shortSummary,
                longSummary,
                price: parseFloat(price),
                category,
                image: reader.result
            };

            const transaction = db.transaction("books", "readwrite");
            const store = transaction.objectStore("books");
            await store.add(book);

            document.getElementById('addBookForm')?.reset();
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview) {
                imagePreview.classList.add('d-none');
            }

            const addBookModal = document.getElementById('addBookModal');
            if (addBookModal) {
                bootstrap.Modal.getInstance(addBookModal)?.hide();
            }

            await loadBooks();

            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Book added successfully.',
                timer: 2000,
                showConfirmButton: false
            });
        };
        reader.readAsDataURL(imageFile);
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to add the book. Please try again.',
        });
    }
}

// Delete Book Function
function deleteBook(id) {
    Swal.fire({
        title: 'Delete Confirmation',
        text: 'Are you sure you want to delete this book?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            const transaction = db.transaction("books", "readwrite");
            const store = transaction.objectStore("books");
            const request = store.delete(id);

            request.onsuccess = function() {
                loadBooks();
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'The book has been deleted.',
                    timer: 2000,
                    showConfirmButton: false
                });
            };

            request.onerror = function(event) {
                console.error("Error deleting book:", event.target.error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to delete the book. Please try again.',
                });
            };
        }
    });
}

function showBookDetails(book) {
    document.getElementById('bookDetailsTitle').textContent = book.title;
    document.getElementById('bookDetailsImage').src = book.image;
    document.getElementById('bookDetailsAuthor').textContent = book.author;
    document.getElementById('bookDetailsPrice').textContent = book.price;
    document.getElementById('bookDetailsCategory').textContent = book.category;
    document.getElementById('bookDetailsLongSummary').textContent = book.longSummary;
    new bootstrap.Modal(document.getElementById('bookDetailsModal')).show();
}

// Search and Filter Functions
function searchBooks() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() ?? '';
    loadBooks(searchTerm);
}

function filterBooks() {
    const category = document.getElementById('filterCategory')?.value;
    loadBooks(undefined, category);
}

function sortBooks() {
    const sortBy = document.getElementById('sortPrice')?.value;
    loadBooks(undefined, undefined, sortBy);
}

// Cart Functions

function updateCartDisplay() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    
    if (!cartCount || !cartItems) return;

    cartCount.textContent = `Cart (${cart.length})`;
    cartItems.innerHTML = '';
    
    let total = 0;
    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'dropdown-item d-flex justify-content-between align-items-center';
        itemElement.innerHTML = `
            <span>${item.title}</span>
            <span>$${item.price}</span>
            <button class="btn btn-sm btn-danger" onclick="removeFromCart('${item.id}')">×</button>
        `;
        cartItems.appendChild(itemElement);
        total += item.price;
    });

    const totalElement = document.createElement('div');
    totalElement.className = 'dropdown-item font-weight-bold';
    totalElement.innerHTML = `Total: $${total.toFixed(2)}`;
    cartItems.appendChild(totalElement);
}

function addToCart(book) {
    cart.push(book);
    updateCartDisplay();
    Swal.fire({
        icon: 'success',
        title: 'Added to Cart!',
        text: `${book.title} has been added to your cart.`,
        showConfirmButton: false,
        timer: 1500
    });
}

function removeFromCart(bookId) {
    cart = cart.filter(item => item.id !== bookId);
    updateCartDisplay();
}

function bay_it(book) {
    Swal.fire({
        title: 'Confirm Purchase',
        text: `Do you want to buy "${book.title}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, buy it!',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            const orderNumber = Math.floor(Math.random() * 1000000);
            Swal.fire({
                icon: 'success',
                title: 'Purchase Successful!',
                html: `
                    Thank you for your purchase!<br>
                    Book: ${book.title}<br>
                    Order Number: #${orderNumber}
                `,
                showConfirmButton: true
            });
        }
    });
}

// Rating System
function initializeRating(bookId) {
    const stars = document.querySelectorAll(`[data-book-id="${bookId}"] .star`);
    let currentRating = parseInt(localStorage.getItem(`rating_${bookId}`)) || 0;

    function updateStars(rating) {
        stars.forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
    }

    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            currentRating = index + 1;
            localStorage.setItem(`rating_${bookId}`, currentRating);
            updateStars(currentRating);
            
            Swal.fire({
                icon: 'success',
                title: 'Rating Saved!',
                text: `You rated this book ${currentRating} stars!`,
                showConfirmButton: false,
                timer: 1500
            });
        });

        star.addEventListener('mouseover', () => {
            updateStars(index + 1);
        });

        star.addEventListener('mouseout', () => {
            updateStars(currentRating);
        });
    });

    updateStars(currentRating);
}

// Load Books
async function loadBooks(searchTerm = '', category = 'all', sortBy = 'default') {
    if (!db) return;

    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.classList.remove('d-none');
    }

    try {
        const transaction = db.transaction("books", "readonly");
        const store = transaction.objectStore("books");
        const books = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        let filteredBooks = books;

        // Apply search filter
        if (searchTerm) {
            filteredBooks = filteredBooks.filter(book => 
                book.title.toLowerCase().includes(searchTerm) || 
                book.author.toLowerCase().includes(searchTerm) ||
                book.category.toLowerCase().includes(searchTerm)
            );
        }

        // Apply category filter
        if (category && category !== 'all') {
            filteredBooks = filteredBooks.filter(book => book.category === category);
        }

        // Apply sorting
        if (sortBy === 'asc') {
            filteredBooks.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'desc') {
            filteredBooks.sort((a, b) => b.price - a.price);
        }

        const bookSections = document.getElementById('bookSections');
        if (!bookSections) return;

        bookSections.innerHTML = '';

        if (filteredBooks.length === 0) {
            bookSections.innerHTML = '<p class="text-center">No books found.</p>';
            return;
        }

        // Group books by category
        const categorizedBooks = {};
        filteredBooks.forEach(book => {
            if (!categorizedBooks[book.category]) {
                categorizedBooks[book.category] = [];
            }
            categorizedBooks[book.category].push(book);
        });

        // Display books by category
        Object.entries(categorizedBooks).forEach(([category, categoryBooks]) => {
            const section = document.createElement('div');
            section.className = 'mb-5 animate__animated animate__fadeIn';
            section.innerHTML = `
                <h2 class="category-header mb-4 text-center animate__animated animate__bounce animate__infinite ">${category}</h2>
                <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
                    ${categoryBooks.map(book => createBookCard(book)).join('')}
                </div>
            `;
            bookSections.appendChild(section);



            


            // Initialize ratings for all books
            categoryBooks.forEach(book => {
                initializeRating(book.id);
            });
        });
    } catch (error) {
        console.error('Error loading books:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load books. Please refresh the page.',
        });
    } finally {
        if (loadingSpinner) {
            loadingSpinner.classList.add('d-none');
        }
    }
    const element = document.querySelector('.category-header');

    function animateWithDelay() {
    element.classList.add('animate__animated', 'animate__bounce');
        setTimeout(() => {
            element.classList.remove('animate__animated', 'animate__bounce');
            setTimeout(animateWithDelay, 3000); 
    }, 1000); 
     }

    animateWithDelay(); 
}




function createBookCard(book) {
    return `
        <div class="col animate__animated animate__zoomIn">
            <div class="card h-100" data-book-id="${book.id}">
                <img src="${book.image}" class="card-img-top" alt="${book.title}" loading="lazy">
                <div class="card-body">
                    <h5 class="card-title">${book.title}</h5>
                    <p class="card-text text-bg-warning"><small class="text-muted">Author: ${book.author}</small></p>
                    <div class="rating mb-2">
                        ${Array(5).fill().map((_, i) => `
                            <span class="star" data-value="${i + 1}">★</span>
                        `).join('')}
                    </div>
                    <p class="card-text">${book.shortSummary}</p>
                    <p class="card-text text-success fw-bold">$${book.price}</p>
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary" onclick="addToCart(${JSON.stringify(book).replace(/"/g, '&quot;')})">
                            Add to Cart
                        </button>
                        <button class="btn btn-info" onclick="showBookDetails(${JSON.stringify(book).replace(/"/g, '&quot;')})">
                            Read More
                        </button>
                        ${isLoggedIn ? `
                            <button class="btn btn-danger" onclick="deleteBook(${book.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartDropdown = document.getElementById('cartDropdown');
    
    if (!cartCount || !cartItems) return;

    cartCount.innerHTML = `<i class="bi bi-cart"></i> Cart (${cart.length})`;
    cartItems.innerHTML = '';
    
    let total = 0;
    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'dropdown-item d-flex justify-content-between align-items-center';
        itemElement.innerHTML = `
            <span>${item.title}</span>
            <span>$${item.price}</span>
            <button class="btn btn-sm btn-danger" onclick="removeFromCart(${item.id})">×</button>
        `;
        cartItems.appendChild(itemElement);
        total += item.price;
    });

    if (cart.length > 0) {
        const totalElement = document.createElement('div');
        totalElement.className = 'dropdown-item font-weight-bold border-top mt-2 pt-2';
        totalElement.innerHTML = `Total: $${total.toFixed(2)}`;
        cartItems.appendChild(totalElement);

        const checkoutButton = document.createElement('button');
        checkoutButton.className = 'btn btn-success w-100 mt-2';
        checkoutButton.innerHTML = 'Proceed to Checkout';
        checkoutButton.onclick = () => showCheckoutModal();
        cartItems.appendChild(checkoutButton);
    } else {
        cartItems.innerHTML = '<div class="dropdown-item text-center">Your cart is empty</div>';
    }

    // Show cart dropdown
    if (cartDropdown) {
        cartDropdown.classList.add('show');
    }
}

function addToCart(book) {
    cart.push(book);
    updateCartDisplay();
    
    Swal.fire({
        icon: 'success',
        title: 'Added to Cart!',
        text: `${book.title} has been added to your cart.`,
        showConfirmButton: false,
        timer: 1500
    });
}

function removeFromCart(bookId) {
    cart = cart.filter(item => item.id !== bookId);
    updateCartDisplay();
}

function showCheckoutModal() {
    if (cart.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Empty Cart',
            text: 'Your cart is empty. Add some books first!'
        });
        return;
    }

    let total = cart.reduce((sum, item) => sum + item.price, 0);
    
    Swal.fire({
        title: 'Checkout',
        html: `
            <div class="text-start">
                <h6>Order Summary:</h6>
                ${cart.map(item => `
                    <div class="d-flex justify-content-between mb-2">
                        <span>${item.title}</span>
                        <span>$${item.price.toFixed(2)}</span>
                    </div>
                `).join('')}
                <hr>
                <div class="d-flex justify-content-between fw-bold">
                    <span>Total:</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Complete Purchase',
        cancelButtonText: 'Continue Shopping',
        confirmButtonColor: '#28a745'
    }).then((result) => {
        if (result.isConfirmed) {
            // Process the purchase
            const orderNumber = Math.floor(Math.random() * 1000000);
            cart = []; // Clear the cart
            updateCartDisplay();
            
            Swal.fire({
                icon: 'success',
                title: 'Purchase Successful!',
                html: `
                    Thank you for your purchase!<br>
                    Order Number: #${orderNumber}<br>
                    Total Amount: $${total.toFixed(2)}
                `,
                confirmButtonText: 'Continue Shopping'
            });
        }
    });
}

// Contact Form Handler
document.addEventListener('DOMContentLoaded', function () {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const name = contactForm.querySelector('input[type="text"]')?.value;
            const email = contactForm.querySelector('input[type="email"]')?.value;
            const message = contactForm.querySelector('textarea')?.value;

            if (!name || !email || !message) {
                Swal.fire({
                    icon: 'error',
                    title: 'Incomplete Form',
                    text: 'Please fill in all fields.',
                });
                return;
            }

            Swal.fire({
                title: 'Sending Message',
                text: 'Please wait...',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            }).then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Message Sent!',
                    text: 'We will get back to you soon.',
                    timer: 2000,
                    showConfirmButton: false
                });
                contactForm.reset();
            });
        });
    }

    // Subscribe Form Handler
    const subscribeForm = document.getElementById('subscribeForm');
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const firstName = subscribeForm.querySelector('input[name="firstName"]')?.value;
            const lastName = subscribeForm.querySelector('input[name="lastName"]')?.value;
            const email = subscribeForm.querySelector('input[name="email"]')?.value;

            if (!firstName || !lastName || !email) {
                Swal.fire({
                    icon: 'error',
                    title: 'Incomplete Form',
                    text: 'Please fill in all fields.',
                });
                return;
            }

            Swal.fire({
                title: 'Processing Subscription',
                text: 'Please wait...',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            }).then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Subscribed!',
                    text: 'Thank you for subscribing to our newsletter!',
                    timer: 2000,
                    showConfirmButton: false
                });
                subscribeForm.reset();
            });
        });
    }
});