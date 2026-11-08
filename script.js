// Document Node Wireframes
const itemForm = document.getElementById('item-form');
const itemName = document.getElementById('item-name');
const itemSku = document.getElementById('item-sku');
const itemQty = document.getElementById('item-qty');
const itemPrice = document.getElementById('item-price');
const itemCategory = document.getElementById('item-category');
const itemList = document.getElementById('item-list');
const totalValueEl = document.getElementById('total-value');
const totalSalesEl = document.getElementById('total-sales');
const lowStockCountEl = document.getElementById('low-stock-count');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const exportBtn = document.getElementById('export-btn');
const themeToggle = document.getElementById('theme-toggle');
const thresholdSetting = document.getElementById('threshold-setting');
const saleItemSelect = document.getElementById('sale-item-select');
const salesForm = document.getElementById('sales-form');
const saleQty = document.getElementById('sale-qty');
const clearDataBtn = document.getElementById('clear-data-btn');

// Database Initializations from Device Storage
let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
let totalRevenue = parseFloat(localStorage.getItem('revenue')) || 0;
let currentTheme = localStorage.getItem('theme') || 'light';
let alertThreshold = parseInt(thresholdSetting.value) || 5;

// System Setup Framework Rules
document.documentElement.setAttribute('data-theme', currentTheme);
themeToggle.innerText = currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    themeToggle.innerText = currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
});

thresholdSetting.addEventListener('input', (e) => {
    alertThreshold = parseInt(e.target.value) || 5;
    renderSystem();
});

// Calculate metrics and update displays
function renderSystem(filterText = '', filterCategory = 'All') {
    itemList.innerHTML = '';
    saleItemSelect.innerHTML = '<option value="" disabled selected>Select Item to Sell</option>';
    
    let currentTotalInventoryVal = 0;
    let currentLowStockCounter = 0;

    inventory.forEach((item, index) => {
        currentTotalInventoryVal += item.qty * item.price;
        
        if (item.qty <= alertThreshold) {
            currentLowStockCounter++;
        }

        // Add to POS Checkout selection pool if item is in stock
        if (item.qty > 0) {
            const opt = document.createElement('option');
            opt.value = index;
            opt.innerText = `${item.name} (${item.qty} left - $${item.price.toFixed(2)})`;
            saleItemSelect.appendChild(opt);
        }

        // Apply filters
        const searchString = (item.name + " " + (item.sku || '')).toLowerCase();
        if (!searchString.includes(filterText.toLowerCase())) return;
        if (filterCategory !== 'All' && item.category !== filterCategory) return;

        // Build active markup table structure
        let badgeClass = 'badge-ok';
        let statusText = 'In Stock';
        if (item.qty === 0) {
            badgeClass = 'badge-out';
            statusText = 'Out of Stock';
        } else if (item.qty <= alertThreshold) {
            badgeClass = 'badge-low';
            statusText = 'Low Stock';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td><code style="font-size:12px;">${item.sku || 'N/A'}</code></td>
            <td><span style="opacity: 0.75; font-size: 13px;">${item.category}</span></td>
            <td>
                <button type="button" class="btn-qty" onclick="adjustQty(${index}, -1)">-</button>
                <strong style="margin: 0 6px; color: ${item.qty <= alertThreshold ? '#ef4444' : 'inherit'}">${item.qty}</strong>
                <button type="button" class="btn-qty" onclick="adjustQty(${index}, 1)">+</button>
            </td>
            <td>$${item.price.toFixed(2)}</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td>
                <button type="button" class="btn-delete" onclick="removeItem(${index})">Remove</button>
            </td>
        `;
        itemList.appendChild(row);
    });

    totalValueEl.innerText = `$${currentTotalInventoryVal.toFixed(2)}`;
    totalSalesEl.innerText = `$${totalRevenue.toFixed(2)}`;
    lowStockCountEl.innerText = currentLowStockCounter;
}

// Add Item Event
itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newItem = {
        name: itemName.value.trim(),
        sku: itemSku.value.trim() || 'N/A',
        qty: parseInt(itemQty.value),
        price: parseFloat(itemPrice.value),
        category: itemCategory.value
    };
    inventory.push(newItem);
    commitStorage();
    renderSystem(searchInput.value, categoryFilter.value);
    itemForm.reset();
});

// Process Sales Checkout Register Event
salesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const targetIdx = parseInt(saleItemSelect.value);
    const qtyToSell = parseInt(saleQty.value);

    if (isNaN(targetIdx) || !inventory[targetIdx]) {
        alert("Invalid product target item selected!");
        return;
    }

    if (qtyToSell > inventory[targetIdx].qty) {
        alert(`Transaction Denied! You do not have enough stock. Max available is ${inventory[targetIdx].qty}.`);
        return;
    }

    // Deduct stock levels and add sales metrics values
    inventory[targetIdx].qty -= qtyToSell;
    totalRevenue += qtyToSell * inventory[targetIdx].price;

    commitStorage();
    renderSystem(searchInput.value, categoryFilter.value);
    salesForm.reset();
});

// HARDWARE BARCODE INTERCEPTOR LOGIC
let barcodeBuffer = "";
let lastKeyTime = Date.now();

window.addEventListener('keypress', (e) => {
    const currentTime = Date.now();
    
    // Hardware scanners type character clusters faster than 50 milliseconds
    if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = ""; 
    }
    
    lastKeyTime = currentTime;

    if (e.key === 'Enter') {
        if (barcodeBuffer.length > 2) {
            // Check if scanned value maps against product register array
            const foundIndex = inventory.findIndex(item => item.sku === barcodeBuffer);
            
            if (foundIndex !== -1) {
                if (inventory[foundIndex].qty > 0) {
                    // Automated Checkout Triggers
                    inventory[foundIndex].qty -= 1;
                    totalRevenue += inventory[foundIndex].price;
                    commitStorage();
                    renderSystem(searchInput.value, categoryFilter.value);
                    alert(`✅ Barcode Scanned & Sold: 1x ${inventory[foundIndex].name}`);
                } else {
                    alert(`❌ ${inventory[foundIndex].name} is completely Out of Stock!`);
                }
            } else {
                alert(`🔍 Barcode code "${barcodeBuffer}" doesn't exist inside database yet.`);
            }
            barcodeBuffer = "";
            e.preventDefault();
        }
    } else {
        // Collect keyboard buffer sequences if fields aren't engaged actively by the user
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
            barcodeBuffer += e.key;
        }
    }
});

// Inline Utility Adjustments
window.adjustQty = function(index, quantityOffset) {
    inventory[index].qty += quantityOffset;
    if (inventory[index].qty < 0) inventory[index].qty = 0;
    commitStorage();
    renderSystem(searchInput.value, categoryFilter.value);
}

window.removeItem = function(index) {
    if (confirm("Permanently wipe this entry record off your tracking matrix ledger?")) {
        inventory.splice(index, 1);
        commitStorage();
        renderSystem(searchInput.value, categoryFilter.value);
    }
}

// Search Inputs & Filters Actions
searchInput.addEventListener('input', () => renderSystem(searchInput.value, categoryFilter.value));
categoryFilter.addEventListener('change', () => renderSystem(searchInput.value, categoryFilter.value));

// Export CSV Ledger Sheet
exportBtn.addEventListener('click', () => {
    if (inventory.length === 0) {
        alert("No tracking array listings present to convert.");
        return;
    }
    let csvDataContent = "data:text/csv;charset=utf-8,Product Name,Barcode SKU,Category,Inventory Quantity,Unit Retail Price,Total Stock Val\n";
    inventory.forEach(p => {
        let line = `"${p.name}","${p.sku}", "${p.category}",${p.qty},${p.price},${(p.qty * p.price).toFixed(2)}`;
        csvDataContent += line + "\n";
    });
    const encodedUri = encodeURI(csvDataContent);
    const hiddenTriggerNode = document.createElement("a");
    hiddenTriggerNode.setAttribute("href", encodedUri);
    hiddenTriggerNode.setAttribute("download", "Global_Store_Inventory_Report.csv");
    document.body.appendChild(hiddenTriggerNode);
    hiddenTriggerNode.click();
    document.body.removeChild(hiddenTriggerNode);
});

// Wipe Dashboard System 
clearDataBtn.addEventListener('click', () => {
    if (confirm("CRITICAL WARNING: This will completely delete all inventory data and clear your sales register profit records forever. Proceed?")) {
        localStorage.clear();
        inventory = [];
        totalRevenue = 0;
        renderSystem();
    }
});

function commitStorage() {
    localStorage.setItem('inventory', JSON.stringify(inventory));
    localStorage.setItem('revenue', totalRevenue.toString());
}

// Initial Run
renderSystem();
