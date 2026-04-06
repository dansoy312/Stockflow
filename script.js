// --- 1. System Variables & Local Storage Setup ---
let dailyTotal = 0;
let transCount = 0;
let currentCart = [];
let activeCategory = 'All';
let salesHistory = [];
let categorySales = { 'Meat': 0, 'Canned Goods': 0, 'Beverages': 0, 'Pantry': 0 };
let salesChartInstance = null;
let users = []; // NEW: Array to store registered users

const defaultProducts = [
    { id: 1, name: 'Pork Belly (1kg)', category: 'Meat', price: 350, stock: 15, img: '🥩' },
    { id: 2, name: 'Whole Chicken', category: 'Meat', price: 220, stock: 8, img: '🍗' },
    { id: 3, name: 'Corned Beef', category: 'Canned Goods', price: 45, stock: 45, img: '🥫' },
    { id: 4, name: 'Sardines (Spicy)', category: 'Canned Goods', price: 25, stock: 52, img: '🐟' },
    { id: 5, name: 'Cola (1L)', category: 'Beverages', price: 65, stock: 24, img: '🥤' },
    { id: 6, name: 'Orange Juice', category: 'Beverages', price: 35, stock: 2, img: '🧃' },
    { id: 7, name: 'Refined Sugar', category: 'Pantry', price: 85, stock: 3, img: '🍚' },
    { id: 8, name: 'Instant Coffee', category: 'Pantry', price: 12, stock: 120, img: '☕' }
];

let products = [];
const categories = ['All', 'Meat', 'Canned Goods', 'Beverages', 'Pantry'];

function loadData() {
    const savedProducts = localStorage.getItem('sf_products');
    products = savedProducts ? JSON.parse(savedProducts) : defaultProducts;
    dailyTotal = parseFloat(localStorage.getItem('sf_total')) || 0;
    transCount = parseInt(localStorage.getItem('sf_count')) || 0;
    
    const savedHistory = localStorage.getItem('sf_history');
    salesHistory = savedHistory ? JSON.parse(savedHistory) : [];
    
    const savedCatSales = localStorage.getItem('sf_catSales');
    if(savedCatSales) categorySales = JSON.parse(savedCatSales);

    // NEW: Load registered users
    const savedUsers = localStorage.getItem('sf_users');
    users = savedUsers ? JSON.parse(savedUsers) : []; 
}

function saveData() {
    localStorage.setItem('sf_products', JSON.stringify(products));
    localStorage.setItem('sf_total', dailyTotal);
    localStorage.setItem('sf_count', transCount);
    localStorage.setItem('sf_history', JSON.stringify(salesHistory));
    localStorage.setItem('sf_catSales', JSON.stringify(categorySales));
    localStorage.setItem('sf_users', JSON.stringify(users)); // NEW: Save users
}

// --- 2. Authentication & UI Navigation ---
function showLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
    toggleAuthMode('login'); // Always default to login view when opening
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

function toggleAuthMode(mode) {
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('signup-error').style.display = 'none';
    
    if (mode === 'signup') {
        document.getElementById('auth-title').innerText = 'Create Account';
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    } else {
        document.getElementById('auth-title').innerText = 'Welcome Back';
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    }
}

function handleSignup(event) {
    event.preventDefault();
    const user = document.getElementById('signup-user').value.trim();
    const pass = document.getElementById('signup-pass').value;

    // Check if username is already taken
    const existingUser = users.find(u => u.username.toLowerCase() === user.toLowerCase());
    if (existingUser) {
        document.getElementById('signup-error').style.display = 'block';
        return;
    }

    // Save the new user to the database
    users.push({ username: user, password: pass });
    saveData();
    
    // Automatically log them in
    localStorage.setItem('sf_logged_in', 'true');
    closeLoginModal();
    unlockSystem();
    event.target.reset();
}

function handleLogin(event) {
    event.preventDefault();
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;

    // Check database for matching credentials
    const foundUser = users.find(u => u.username.toLowerCase() === user.toLowerCase() && u.password === pass);

    if (foundUser) {
        localStorage.setItem('sf_logged_in', 'true');
        closeLoginModal();
        unlockSystem();
        document.getElementById('login-error').style.display = 'none';
        event.target.reset();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function unlockSystem() {
    document.getElementById('landing-page').style.opacity = '0';
    setTimeout(() => { document.getElementById('landing-page').style.display = 'none'; }, 500);
}

function logout() {
    localStorage.removeItem('sf_logged_in');
    location.reload(); 
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function showPage(pageId, element) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if(element) element.classList.add('active');

    if(window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }

    if(pageId === 'pos') {
        setTimeout(() => document.getElementById('search-input').focus(), 100);
    }
}

// --- 3. Rendering ---
function renderCategories() {
    document.getElementById('category-filters').innerHTML = categories.map(cat =>
        `<button class="cat-btn ${cat === activeCategory ? 'active' : ''}" onclick="setCategory('${cat}')">${cat}</button>`
    ).join('');
}

function setCategory(cat) { activeCategory = cat; renderCategories(); renderProducts(); }

function renderProducts(searchQuery = '') {
    const grid = document.getElementById('product-grid');
    const filtered = products.filter(p => {
        const matchCat = activeCategory === 'All' || p.category === activeCategory;
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });

    grid.innerHTML = filtered.map(p => {
        const stockBadge = p.stock > 10 ? `<span class="badge badge-in">In Stock</span>` : p.stock > 0 ? `<span class="badge badge-low">Low Stock</span>` : `<span class="badge" style="background:#7f8c8d;">Out of Stock</span>`;
        return `
        <div class="product-card" onclick="addToCart(${p.id})" ${p.stock === 0 ? 'style="opacity: 0.5;"' : ''}>
            <div class="product-image">${p.img}</div>
            <div class="product-name">${p.name}</div>
            <div class="product-price">₱${p.price.toFixed(2)}</div>
            ${stockBadge}
        </div>`;
    }).join('');
}

function filterProducts() { renderProducts(document.getElementById('search-input').value); }

// --- 4. Cart Logic ---
function addToCart(id) {
    const product = products.find(p => p.id === id);
    if(product.stock <= 0) { alert("Item is Out of Stock!"); return; }

    const existing = currentCart.find(item => item.id === id);
    if(existing && existing.qty >= product.stock) {
        alert(`Cannot add more. Only ${product.stock} units of ${product.name} available.`);
        return;
    }

    if(existing) existing.qty++;
    else currentCart.push({ ...product, qty: 1 });

    updateCartUI();
}

function removeFromCart(id) {
    currentCart = currentCart.filter(item => item.id !== id);
    updateCartUI();
}

let cartTotalAmt = 0;

function updateCartUI() {
    const container = document.getElementById('cart-items');
    if(currentCart.length === 0) {
        container.innerHTML = `<p style="color: #95a5a6; text-align: center; margin-top: 50px;">Cart is empty.</p>`;
        document.getElementById('cart-total-display').innerText = '₱0.00';
        cartTotalAmt = 0;
        calculateChange();
        return;
    }

    cartTotalAmt = 0;
    container.innerHTML = currentCart.map(item => {
        const itemTotal = item.price * item.qty;
        cartTotalAmt += itemTotal;
        return `
        <div class="item-info" style="flex:1;">
            <p>${item.name}</p>
            <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                <input type="number" value="${item.qty}" min="1" max="${item.stock}"
                       onchange="updateCartQty(${item.id}, this.value)"
                       style="width: 50px; padding: 2px; border: 1px solid #ccc; border-radius: 4px;">
                <small>@ ₱${item.price} = ₱${itemTotal}</small>
            </div>
        </div>`;
    }).join('');

    document.getElementById('cart-total-display').innerText = `₱${cartTotalAmt.toFixed(2)}`;
    calculateChange();
}

function updateCartQty(id, newQty) {
    newQty = parseInt(newQty);
    const product = products.find(p => p.id === id);
    const cartItem = currentCart.find(item => item.id === id);

    if (newQty > product.stock) {
        alert(`Only ${product.stock} units available.`);
        cartItem.qty = product.stock; 
    } else if (newQty < 1) {
        removeFromCart(id);
        return;
    } else {
        cartItem.qty = newQty;
    }
    updateCartUI();
}

function calculateChange() {
    const cashInput = document.getElementById('cash-tendered').value;
    const checkoutBtn = document.getElementById('btn-checkout');
    const changeDisplay = document.getElementById('change-display');

    if (currentCart.length === 0) {
        checkoutBtn.disabled = true;
        changeDisplay.innerText = "Change: ₱0.00";
        changeDisplay.style.color = "var(--primary)";
        return;
    }

    if (cashInput === "" || parseFloat(cashInput) < cartTotalAmt) {
        checkoutBtn.disabled = true;
        changeDisplay.innerText = "Insufficient Cash";
        changeDisplay.style.color = "var(--danger)";
    } else {
        checkoutBtn.disabled = false;
        const change = parseFloat(cashInput) - cartTotalAmt;
        changeDisplay.innerText = `Change: ₱${change.toFixed(2)}`;
        changeDisplay.style.color = "var(--success)";
    }
}

// --- 5. Checkout & Receipt Logic ---
function checkout() {
    const cashTendered = parseFloat(document.getElementById('cash-tendered').value);
    const change = cashTendered - cartTotalAmt;

    dailyTotal += cartTotalAmt;
    transCount++;

    currentCart.forEach(cartItem => {
        const p = products.find(p => p.id === cartItem.id);
        if(p) p.stock -= cartItem.qty;
        categorySales[p.category] += (cartItem.price * cartItem.qty);
    });

    const transactionRecord = {
        id: transCount, total: cartTotalAmt, items: currentCart.length, time: new Date().toLocaleTimeString()
    };
    salesHistory.unshift(transactionRecord);

    saveData();
    updateDashboardUI();
    showReceipt(cartTotalAmt, cashTendered, change);

    currentCart = [];
    document.getElementById('cash-tendered').value = "";
    updateCartUI();
    renderProducts();
}

function showReceipt(total, cash, change) {
    document.getElementById('receipt-txn').innerText = transCount.toString().padStart(5, '0');
    document.getElementById('receipt-date').innerText = new Date().toLocaleDateString();

    document.getElementById('receipt-items').innerHTML = currentCart.map(item =>
        `<div style="display:flex; justify-content:space-between; font-size: 0.9rem;">
            <span>${item.qty}x ${item.name}</span>
            <span>₱${(item.price * item.qty).toFixed(2)}</span>
        </div>`
    ).join('');

    document.getElementById('receipt-total').innerText = `₱${total.toFixed(2)}`;
    document.getElementById('receipt-cash').innerText = `₱${cash.toFixed(2)}`;
    document.getElementById('receipt-change').innerText = `₱${change.toFixed(2)}`;

    document.getElementById('receipt-modal').style.display = 'flex';
}

function closeReceipt() { document.getElementById('receipt-modal').style.display = 'none'; }


// --- 6. Add Product Logic ---
function addProduct(event) {
    event.preventDefault(); 
    const name = document.getElementById('new-p-name').value;
    const category = document.getElementById('new-p-cat').value;
    const price = parseFloat(document.getElementById('new-p-price').value);
    const stock = parseInt(document.getElementById('new-p-stock').value);
    const img = document.getElementById('new-p-img').value;

    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;

    const newProduct = { id: newId, name: name, category: category, price: price, stock: stock, img: img };

    products.push(newProduct);
    saveData();
    renderProducts();
    renderInventory();
    updateDashboardUI(); 

    event.target.reset();
    alert(`${name} has been successfully added to the inventory!`);
}

// --- 7. Dashboard & Chart Logic ---
function updateDashboardUI() {
    document.getElementById('dash-total-sales').innerText = `₱${dailyTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('dash-trans-count').innerText = transCount;

    let lowStockCount = products.filter(p => p.stock <= 10).length;
    document.getElementById('dash-low-stock').innerText = lowStockCount;

    const list = document.getElementById('activity-list');
    if (salesHistory.length > 0) document.getElementById('no-activity').style.display = 'none';

    list.innerHTML = salesHistory.map(log =>
        `<li style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <strong>Txn #${log.id.toString().padStart(4,'0')}</strong>
            <span style="float:right; color:var(--success);">+ ₱${log.total.toFixed(2)}</span>
            <br><small style="color:#7f8c8d;">${log.time} • ${log.items} items</small>
        </li>`
    ).join('');

    renderInventory();
    setTimeout(updateChart, 50);
}

function renderInventory() {
    document.getElementById('inventory-table').innerHTML = products.map(p => {
        const badge = p.stock > 10 ? '<span class="badge badge-in">In Stock</span>' : p.stock > 0 ? '<span class="badge badge-low">Low Stock</span>' : '<span class="badge" style="background:#7f8c8d;">Out of Stock</span>';
        return `
        <tr>
            <td>${p.img} ${p.name}</td>
            <td>${p.stock} Units</td>
            <td>${badge}</td>
            <td>
                <button onclick="restockItem(${p.id})" style="background:var(--success); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">+ Stock</button>
                <button onclick="deleteItem(${p.id})" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function restockItem(id) {
    const qty = parseInt(prompt("How many new units arrived?"));
    if (qty && qty > 0) {
        const product = products.find(p => p.id === id);
        product.stock += qty;
        saveData();
        renderInventory();
        renderProducts();
        updateDashboardUI();
    }
}

function deleteItem(id) {
    if (confirm("Are you sure you want to remove this product entirely?")) {
        products = products.filter(p => p.id !== id);
        saveData();
        renderInventory();
        renderProducts();
    }
}

function updateChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const data = Object.values(categorySales);
    const labels = Object.keys(categorySales);

    const filteredLabels = [];
    const filteredData = [];
    for(let i=0; i<data.length; i++){
        if(data[i] > 0) { filteredLabels.push(labels[i]); filteredData.push(data[i]); }
    }

    if(filteredData.length === 0) return;

    if (salesChartInstance) salesChartInstance.destroy();

    salesChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: filteredLabels,
            datasets: [{
                data: filteredData,
                backgroundColor: ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
}

// Initialize App
window.onload = () => {
    loadData();
    renderCategories();
    renderProducts();
    updateDashboardUI();
    
    // Check if user is already logged in
    if (localStorage.getItem('sf_logged_in') === 'true') {
        document.getElementById('landing-page').style.display = 'none';
    }
};