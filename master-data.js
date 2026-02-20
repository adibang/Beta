// master-data.js
// Fungsi-fungsi master data yang dipisahkan dari index.html

// ==================== FUNGSI MODAL KATEGORI ====================
function openTambahKategoriKasirModal(editId = null) {
    const modal = document.getElementById('kasir-category-modal');
    const input = document.getElementById('kasir-category-name');
    const title = document.getElementById('kasir-category-title');
    if (editId) {
        const cat = kasirCategories.find(c => c.id === editId);
        if (cat) {
            input.value = cat.name;
            editingKasirCategoryId = editId;
            title.innerHTML = `<svg class="icon icon-primary" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Kategori Kasir`;
        }
    } else {
        input.value = '';
        editingKasirCategoryId = null;
        title.innerHTML = `<svg class="icon icon-primary" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Tambah Kategori Kasir`;
    }
    modal.style.display = 'flex';
    closeDrawer();
}

function closeKasirCategoryModal() {
    document.getElementById('kasir-category-modal').style.display = 'none';
    editingKasirCategoryId = null;
}

async function saveKasirCategory() {
    const nameInput = document.getElementById('kasir-category-name');
    const name = nameInput.value.trim();
    if (!name) { showNotification('Nama kategori harus diisi!', 'error'); return; }
    try {
        showLoading();
        const now = new Date().toISOString();
        if (editingKasirCategoryId) {
            const cat = kasirCategories.find(c => c.id === editingKasirCategoryId);
            if (cat) {
                const duplicate = kasirCategories.find(c => c.id !== editingKasirCategoryId && c.name.toLowerCase() === name.toLowerCase());
                if (duplicate) { showNotification(`Kategori "${name}" sudah ada!`, 'error'); return; }
                cat.name = name;
                cat.updatedAt = now;
                await dbPut(STORES.KASIR_CATEGORIES, cat);
            }
        } else {
            const duplicate = kasirCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
            if (duplicate) { showNotification(`Kategori "${name}" sudah ada!`, 'error'); return; }
            const newCat = { name: name, createdAt: now, updatedAt: now };
            const id = await dbAdd(STORES.KASIR_CATEGORIES, newCat);
            newCat.id = id;
            kasirCategories.push(newCat);
        }
        await loadKasirCategories();
        showNotification('Kategori kasir berhasil disimpan!', 'success');
        closeKasirCategoryModal();
    } catch (error) { console.error('Error saving kasir category:', error); showNotification('Gagal menyimpan: ' + error.message, 'error'); } finally { hideLoading(); }
}

async function deleteKasirCategory(categoryId) {
    if (!confirm('Hapus kategori ini? Semua item dengan kategori ini akan kehilangan kategori.')) return;
    try {
        showLoading();
        const itemsToUpdate = kasirItems.filter(i => i.categoryId === categoryId);
        for (let item of itemsToUpdate) {
            item.categoryId = null;
            await dbPut(STORES.KASIR_ITEMS, item);
        }
        await dbDelete(STORES.KASIR_CATEGORIES, categoryId);
        await loadKasirCategories();
        await loadKasirItems();
        showNotification('Kategori dihapus', 'success');
        closeListKasirCategoryModal();
        openDaftarKategoriKasirModal();
    } catch (error) { console.error('Error deleting kasir category:', error); showNotification('Gagal hapus: ' + error.message, 'error'); } finally { hideLoading(); }
}

function openDaftarKategoriKasirModal() {
    const modal = document.getElementById('list-kasir-category-modal');
    const container = document.getElementById('kasir-category-list-container');
    container.innerHTML = '';
    if (kasirCategories.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Belum ada kategori.</div>';
    } else {
        kasirCategories.forEach(cat => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '10px';
            div.style.borderBottom = '1px solid #eee';
            div.innerHTML = `
                <span>${cat.name}</span>
                <div class="three-dots-menu">
                    <button class="three-dots-btn" onclick="toggleDropdown(this)">⋮</button>
                    <div class="three-dots-dropdown">
                        <div class="dropdown-item edit" onclick="openTambahKategoriKasirModal(${cat.id}); event.stopPropagation();">${icons.edit} Edit</div>
                        <div class="dropdown-item delete" onclick="deleteKasirCategory(${cat.id}); event.stopPropagation();">${icons.delete} Hapus</div>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }
    modal.style.display = 'flex';
    closeDrawer();
}

function closeListKasirCategoryModal() { document.getElementById('list-kasir-category-modal').style.display = 'none'; }

// ==================== FUNGSI LEVEL HARGA ====================
function addLevelRow(qty = '', price = '', levelNumber = null) {
    const container = document.getElementById('level-harga-container');
    const div = document.createElement('div');
    div.className = 'level-harga-item';
    const number = levelNumber || (container.children.length + 1);
    div.innerHTML = `
        <span class="level-number">Level ${number}</span>
        <input type="number" class="form-input level-qty" placeholder="" value="${qty}" min="0" step="any">
        <input type="number" class="form-input level-price" placeholder="" value="${price}" min="0" step="0.01">
        <button type="button" class="level-harga-remove" onclick="hapusLevelHarga(this)">×</button>
    `;
    container.appendChild(div);
}

function hapusLevelHarga(btn) {
    if (document.querySelectorAll('.level-harga-item').length <= 1) {
        showNotification('Minimal harus ada 1 level harga', 'error');
        return;
    }
    btn.closest('.level-harga-item').remove();
    renumberLevels();
}

function renumberLevels() {
    const items = document.querySelectorAll('.level-harga-item');
    items.forEach((item, index) => {
        const span = item.querySelector('.level-number');
        span.textContent = `Level ${index + 1}`;
    });
}

function validateLevels() {
    const items = document.querySelectorAll('.level-harga-item');
    const errorDiv = document.getElementById('level-error');
    if (!errorDiv) return true;

    let errors = [];
    let levels = [];

    items.forEach((item, idx) => {
        const qtyInput = item.querySelector('.level-qty');
        const priceInput = item.querySelector('.level-price');
        const qty = parseFloat(qtyInput.value);
        const price = parseFloat(priceInput.value);

        if (isNaN(qty) || qty < 0) {
            errors.push(`Level ${idx+1}: Qty harus angka positif`);
        }
        if (isNaN(price) || price < 0) {
            errors.push(`Level ${idx+1}: Harga harus ≥ 0`);
        }

        levels.push({ qty, price, idx });
    });

    const qtyValues = levels.map(l => l.qty);
    const duplicateQty = qtyValues.filter((q, i) => qtyValues.indexOf(q) !== i);
    if (duplicateQty.length > 0) {
        errors.push('Qty antar level tidak boleh sama');
    }

    let sorted = true;
    for (let i = 0; i < levels.length - 1; i++) {
        if (levels[i].qty > levels[i+1].qty) {
            sorted = false;
            break;
        }
    }
    if (!sorted) {
        errors.push('Qty harus berurutan naik (ascending)');
    }

    if (errors.length > 0) {
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = errors.join('<br>');
        return false;
    } else {
        errorDiv.style.display = 'none';
        return true;
    }
}

function getPriceLevelsFromDOM() {
    const items = document.querySelectorAll('.level-harga-item');
    const priceLevels = [];
    items.forEach((item, index) => {
        const qty = parseFloat(item.querySelector('.level-qty').value) || 0;
        const price = parseFloat(item.querySelector('.level-price').value) || 0;
        priceLevels.push({
            level: index + 1,
            minQty: qty,
            price: price
        });
    });
    return priceLevels;
}

// ==================== FUNGSI MODAL ITEM ====================
function openTambahItemKasirModal(editId = null) {
    const modal = document.getElementById('kasir-item-modal');
    const title = document.getElementById('kasir-item-title');
    const nameInput = document.getElementById('kasir-item-name');
    const codeInput = document.getElementById('kasir-item-code');
    const barcodeInput = document.getElementById('kasir-item-barcode');
    const catSelect = document.getElementById('kasir-item-category');
    const hargaDasarInput = document.getElementById('kasir-item-harga-dasar');
    const hargaJualInput = document.getElementById('kasir-item-harga-jual');
    const beratInput = document.getElementById('kasir-item-berat');
    const satuanSelect = document.getElementById('kasir-item-satuan');
    const diskonInput = document.getElementById('kasir-item-diskon');
    const stockInput = document.getElementById('kasir-item-stock');
    const weighableCheck = document.getElementById('kasir-item-weighable');
    const levelContainer = document.getElementById('level-harga-container');
    const errorDiv = document.getElementById('level-error');
    
    catSelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';
    kasirCategories.forEach(cat => { catSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`; });
    
    const satuanOptions = kasirSatuan.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    satuanSelect.innerHTML = '<option value="">-- Pilih Satuan --</option>' + satuanOptions;
    
    nameInput.value = '';
    codeInput.value = '';
    barcodeInput.value = '';
    catSelect.value = '';
    hargaDasarInput.value = '';
    hargaJualInput.value = '';
    beratInput.value = '';
    satuanSelect.value = '';
    diskonInput.value = '';
    stockInput.value = '0';
    weighableCheck.checked = false;
    
    levelContainer.innerHTML = '';
    if (editId) {
        const item = kasirItems.find(i => i.id === editId);
        if (item) {
            nameInput.value = item.name;
            codeInput.value = item.code;
            barcodeInput.value = item.barcode || item.code;
            catSelect.value = item.categoryId || '';
            hargaDasarInput.value = item.hargaDasar || '';
            hargaJualInput.value = item.hargaJual || '';
            beratInput.value = item.berat || '';
            satuanSelect.value = item.satuanId || '';
            diskonInput.value = item.diskon || '';
            stockInput.value = item.stock || 0;
            weighableCheck.checked = item.isWeighable || false;
            
            if (item.priceLevels && item.priceLevels.length > 0) {
                item.priceLevels.forEach(l => {
                    addLevelRow(l.minQty, l.price, l.level);
                });
            } else {
                addLevelRow('', '', 1);
                addLevelRow('', '', 2);
                addLevelRow('', '', 3);
            }
            
            tempUnitConversions = item.unitConversions ? JSON.parse(JSON.stringify(item.unitConversions)) : [];
            editingKasirItemId = editId;
            title.innerHTML = `<svg class="icon icon-primary" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Item Kasir`;
        }
    } else {
        editingKasirItemId = null;
        title.innerHTML = `<svg class="icon icon-primary" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Tambah Item Kasir`;
        addLevelRow('', '', 1);
        addLevelRow('', '', 2);
        addLevelRow('', '', 3);
    }

    if (errorDiv) errorDiv.style.display = 'none';
    
    const convUnitSelect = document.getElementById('conv-unit');
    if (convUnitSelect) {
        convUnitSelect.innerHTML = '<option value="">-- Pilih Satuan --</option>';
        kasirSatuan.forEach(sat => {
            convUnitSelect.innerHTML += `<option value="${sat.id}">${sat.name}</option>`;
        });
    }
    
    renderConversionsList();
    hideConversionForm();
    modal.style.display = 'flex';
    closeDrawer();
}

function closeKasirItemModal() {
    document.getElementById('kasir-item-modal').style.display = 'none';
    editingKasirItemId = null;
    tempUnitConversions = [];
    hideConversionForm();
}

async function saveKasirItem() {
    const name = document.getElementById('kasir-item-name').value.trim();
    const code = document.getElementById('kasir-item-code').value.trim();
    const barcode = document.getElementById('kasir-item-barcode').value.trim() || code;
    const categoryId = document.getElementById('kasir-item-category').value || null;
    const hargaDasar = parseFloat(document.getElementById('kasir-item-harga-dasar').value) || '';
    const hargaJual = parseFloat(document.getElementById('kasir-item-harga-jual').value) || '';
    const berat = parseFloat(document.getElementById('kasir-item-berat').value) || '';
    const satuanId = document.getElementById('kasir-item-satuan').value || null;
    const diskon = parseFloat(document.getElementById('kasir-item-diskon').value) || '';
    const stock = parseFloat(document.getElementById('kasir-item-stock').value) || 0;
    const isWeighable = document.getElementById('kasir-item-weighable').checked;
    
    const priceLevels = getPriceLevelsFromDOM();
    if (!validateLevels()) {
        showNotification('Level harga tidak valid, periksa kembali', 'error');
        return;
    }
    
    if (!name || !code) { showNotification('Nama dan kode harus diisi!', 'error'); return; }
    
    try {
        showLoading();
        const now = new Date().toISOString();
        const duplicate = kasirItems.find(i => {
            if (editingKasirItemId && i.id === editingKasirItemId) return false;
            return i.code === code;
        });
        if (duplicate) { showNotification(`Kode "${code}" sudah digunakan!`, 'error'); return; }
        
        const unitConversions = [...tempUnitConversions];
        
        if (editingKasirItemId) {
            const item = kasirItems.find(i => i.id === editingKasirItemId);
            if (item) {
                item.name = name;
                item.code = code;
                item.barcode = barcode;
                item.categoryId = categoryId;
                item.hargaDasar = hargaDasar;
                item.hargaJual = hargaJual;
                item.berat = berat;
                item.satuanId = satuanId;
                item.diskon = diskon;
                item.stock = stock;
                item.isWeighable = isWeighable;
                item.priceLevels = priceLevels;
                item.unitConversions = unitConversions;
                item.updatedAt = now;
                await dbPut(STORES.KASIR_ITEMS, item);
            }
        } else {
            const newItem = {
                name, code, barcode, categoryId, hargaDasar, hargaJual, berat, satuanId,
                diskon, stock, isWeighable, priceLevels, unitConversions,
                createdAt: now, updatedAt: now
            };
            const id = await dbAdd(STORES.KASIR_ITEMS, newItem);
            newItem.id = id;
            kasirItems.push(newItem);
        }
        await loadKasirItems();
        showNotification('Item kasir berhasil disimpan!', 'success');
        closeKasirItemModal();
    } catch (error) {
        console.error('Error saving kasir item:', error);
        showNotification('Gagal menyimpan: ' + error.message, 'error');
    } finally { hideLoading(); }
}

async function deleteKasirItem(itemId) {
    if (!confirm('Hapus item ini?')) return;
    try {
        showLoading();
        await dbDelete(STORES.KASIR_ITEMS, itemId);
        await loadKasirItems();
        showNotification('Item dihapus', 'success');
        closeListKasirItemModal();
        openDaftarItemKasirModal();
    } catch (error) { console.error('Error deleting kasir item:', error); showNotification('Gagal hapus: ' + error.message, 'error'); } finally { hideLoading(); }
}

function openDaftarItemKasirModal() {
    const modal = document.getElementById('list-kasir-item-modal');
    const container = document.getElementById('kasir-item-list-container');
    const catMap = {}; kasirCategories.forEach(c => catMap[c.id] = c.name);
    const satuanMap = {}; kasirSatuan.forEach(s => satuanMap[s.id] = s.name);
    container.innerHTML = '';
    if (kasirItems.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Belum ada item.</div>';
    } else {
        kasirItems.forEach(item => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '10px';
            div.style.borderBottom = '1px solid #eee';
            div.innerHTML = `
                <div style="flex:1;">
                    <strong>${item.name}</strong><br>
                    <span style="font-size:0.8rem;">
                        Kode: ${item.code} | Barcode: ${item.barcode || item.code}<br>
                        Harga Jual: Rp ${item.hargaJual.toLocaleString()} | Kategori: ${item.categoryId ? catMap[item.categoryId] || '-' : '-'}<br>
                        Berat: ${item.berat} ${item.satuanId ? satuanMap[item.satuanId] : ''}
                        ${item.diskon ? ' | Diskon: '+item.diskon+'%' : ''}
                        ${item.isWeighable ? ' | Timbangan' : ''}
                        | Stok: ${item.stock !== undefined ? item.stock : 0}
                    </span>
                </div>
                <div>
                    <button class="action-btn edit-btn" onclick="openTambahItemKasirModal(${item.id})">${icons.edit}</button>
                    <button class="action-btn delete-btn" onclick="deleteKasirItem(${item.id})">${icons.delete}</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    modal.style.display = 'flex';
    closeDrawer();
}

function closeListKasirItemModal() { document.getElementById('list-kasir-item-modal').style.display = 'none'; }

// ==================== FUNGSI SATUAN ====================
function openTambahSatuanModal(editId = null) {
    const modal = document.getElementById('satuan-modal');
    const title = document.getElementById('satuan-modal-title');
    const input = document.getElementById('satuan-name');
    if (editId) {
        const sat = kasirSatuan.find(s => s.id === editId);
        if (sat) {
            input.value = sat.name;
            editingSatuanId = editId;
            title.innerHTML = `<svg class="icon icon-primary" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Satuan`;
        }
    } else {
        input.value = '';
        editingSatuanId = null;
        title.innerHTML = `<svg class="icon icon-primary" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Tambah Satuan`;
    }
    modal.style.display = 'flex';
    closeDrawer();
}

function closeSatuanModal() { document.getElementById('satuan-modal').style.display = 'none'; editingSatuanId = null; }

async function saveSatuan() {
    const name = document.getElementById('satuan-name').value.trim();
    if (!name) { showNotification('Nama satuan harus diisi!', 'error'); return; }
    try {
        showLoading();
        const now = new Date().toISOString();
        if (editingSatuanId) {
            const sat = kasirSatuan.find(s => s.id === editingSatuanId);
            if (sat) {
                const duplicate = kasirSatuan.find(s => s.id !== editingSatuanId && s.name.toLowerCase() === name.toLowerCase());
                if (duplicate) { showNotification(`Satuan "${name}" sudah ada!`, 'error'); return; }
                sat.name = name;
                sat.updatedAt = now;
                await dbPut(STORES.KASIR_SATUAN, sat);
            }
        } else {
            const duplicate = kasirSatuan.find(s => s.name.toLowerCase() === name.toLowerCase());
            if (duplicate) { showNotification(`Satuan "${name}" sudah ada!`, 'error'); return; }
            const newSat = { name: name, createdAt: now, updatedAt: now };
            const id = await dbAdd(STORES.KASIR_SATUAN, newSat);
            newSat.id = id;
            kasirSatuan.push(newSat);
        }
        await loadKasirSatuan();
        showNotification('Satuan berhasil disimpan!', 'success');
        closeSatuanModal();
    } catch (error) { console.error('Error saving satuan:', error); showNotification('Gagal menyimpan: ' + error.message, 'error'); } finally { hideLoading(); }
}

async function deleteSatuan(satuanId) {
    if (!confirm('Hapus satuan ini? Item yang menggunakan satuan ini akan kehilangan satuan.')) return;
    try {
        showLoading();
        const itemsToUpdate = kasirItems.filter(i => i.satuanId === satuanId);
        for (let item of itemsToUpdate) {
            item.satuanId = null;
            await dbPut(STORES.KASIR_ITEMS, item);
        }
        await dbDelete(STORES.KASIR_SATUAN, satuanId);
        await loadKasirSatuan();
        await loadKasirItems();
        showNotification('Satuan dihapus', 'success');
        closeListSatuanModal();
        openDaftarSatuanModal();
    } catch (error) { console.error('Error deleting satuan:', error); showNotification('Gagal hapus: ' + error.message, 'error'); } finally { hideLoading(); }
}

function openDaftarSatuanModal() {
    const modal = document.getElementById('list-satuan-modal');
    const container = document.getElementById('satuan-list-container');
    container.innerHTML = '';
    if (kasirSatuan.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Belum ada satuan.</div>';
    } else {
        kasirSatuan.forEach(sat => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '10px';
            div.style.borderBottom = '1px solid #eee';
            div.innerHTML = `
                <span>${sat.name}</span>
                <div>
                    <button class="action-btn edit-btn" onclick="openTambahSatuanModal(${sat.id})">${icons.edit}</button>
                    <button class="action-btn delete-btn" onclick="deleteSatuan(${sat.id})">${icons.delete}</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    modal.style.display = 'flex';
    closeDrawer();
}

function closeListSatuanModal() { document.getElementById('list-satuan-modal').style.display = 'none'; }

// ==================== FUNGSI KONVERSI SATUAN ====================
function showConversionForm(index = -1) {
    const formContainer = document.getElementById('conversion-form-container');
    const selectUnit = document.getElementById('conv-unit');
    const valueInput = document.getElementById('conv-value');
    const barcodeInput = document.getElementById('conv-barcode');
    const skuInput = document.getElementById('conv-sku');
    const basePriceInput = document.getElementById('conv-base-price');
    const sellPriceInput = document.getElementById('conv-sell-price');
    const pointsInput = document.getElementById('conv-points');
    const commissionInput = document.getElementById('conv-commission');

    selectUnit.innerHTML = '<option value="">-- Pilih Satuan --</option>';
    kasirSatuan.forEach(sat => {
        selectUnit.innerHTML += `<option value="${sat.id}">${sat.name}</option>`;
    });

    if (index >= 0) {
        editingConversionIndex = index;
        const conv = tempUnitConversions[index];
        selectUnit.value = conv.unit;
        valueInput.value = conv.value;
        barcodeInput.value = conv.barcode;
        skuInput.value = conv.sku || '';
        basePriceInput.value = conv.basePrice;
        sellPriceInput.value = conv.sellPrice;
        pointsInput.value = conv.customerPoint || '';
        commissionInput.value = conv.salesCommission || '';
    } else {
        editingConversionIndex = -1;
        selectUnit.value = '';
        valueInput.value = '';
        barcodeInput.value = '';
        skuInput.value = '';
        basePriceInput.value = '';
        sellPriceInput.value = '';
        pointsInput.value = '';
        commissionInput.value = '';
    }

    document.querySelectorAll('.conversion-edit-btn').forEach(btn => {
        btn.disabled = true;
    });

    formContainer.style.display = 'block';
}

function hideConversionForm() {
    document.querySelectorAll('.conversion-edit-btn').forEach(btn => {
        btn.disabled = false;
    });
    document.getElementById('conversion-form-container').style.display = 'none';
    editingConversionIndex = -1;
}

function saveConversion() {
    const unit = document.getElementById('conv-unit').value;
    const value = parseFloat(document.getElementById('conv-value').value);
    const barcode = document.getElementById('conv-barcode').value.trim();
    const sku = document.getElementById('conv-sku').value.trim();
    const basePrice = parseFloat(document.getElementById('conv-base-price').value) || '';
    const sellPrice = parseFloat(document.getElementById('conv-sell-price').value) || '';
    const customerPoint = parseFloat(document.getElementById('conv-points').value) || '';
    const salesCommission = parseFloat(document.getElementById('conv-commission').value) || '';

    if (!unit) { showNotification('Satuan harus dipilih!', 'error'); return; }
    if (!value || value <= 0) { showNotification('Nilai satuan harus lebih dari 0!', 'error'); return; }
    if (!barcode) { showNotification('Barcode satuan harus diisi!', 'error'); return; }

    const isDuplicateValue = tempUnitConversions.some((conv, idx) => 
        idx !== editingConversionIndex && conv.value === value
    );
    const isDuplicateBarcode = tempUnitConversions.some((conv, idx) => 
        idx !== editingConversionIndex && conv.barcode === barcode
    );

    if (isDuplicateValue) { showNotification('Nilai satuan harus unik!', 'error'); return; }
    if (isDuplicateBarcode) { showNotification('Barcode satuan harus unik!', 'error'); return; }

    const conversionData = { unit, value, barcode, sku, basePrice, sellPrice, customerPoint, salesCommission };

    if (editingConversionIndex >= 0) {
        tempUnitConversions[editingConversionIndex] = conversionData;
    } else {
        tempUnitConversions.push(conversionData);
    }

    renderConversionsList();
    hideConversionForm();
}

function renderConversionsList() {
    const container = document.getElementById('conversions-list');
    container.innerHTML = '';

    if (tempUnitConversions.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:10px; color:#666;">Belum ada konversi satuan. Klik tombol di atas untuk menambah.</div>';
        return;
    }

    tempUnitConversions.forEach((conv, index) => {
        const unitName = kasirSatuan.find(s => s.id == conv.unit)?.name || '?';
        const div = document.createElement('div');
        div.className = 'conversion-item';
        div.innerHTML = `
            <div class="conversion-item-header">
                <span>${unitName} — Nilai: ${conv.value}</span>
                <div class="conversion-actions">
                    <button class="conversion-edit-btn" onclick="editConversion(${index})">${icons.edit}</button>
                    <button class="conversion-delete-btn" onclick="deleteConversion(${index})">${icons.delete}</button>
                </div>
            </div>
            <div class="conversion-item-details">
                <div>Barcode: ${conv.barcode}</div>
                <div>SKU: ${conv.sku || '-'}</div>
                <div>Harga Dasar: Rp ${conv.basePrice.toLocaleString()}</div>
                <div>Harga Jual: Rp ${conv.sellPrice.toLocaleString()}</div>
                ${conv.customerPoint ? `<div>Poin: ${conv.customerPoint}</div>` : ''}
                ${conv.salesCommission ? `<div>Komisi: ${conv.salesCommission}</div>` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

function editConversion(index) { showConversionForm(index); }

function deleteConversion(index) {
    if (confirm('Hapus konversi ini?')) {
        tempUnitConversions.splice(index, 1);
        renderConversionsList();
    }
}

// ==================== FUNGSI CUSTOMER ====================
function openTambahCustomerModal(editId = null) {
    const modal = document.getElementById('customer-modal');
    const title = document.getElementById('customer-modal-title');
    const nameInput = document.getElementById('customer-name');
    const codeInput = document.getElementById('customer-code');
    const tierSelect = document.getElementById('customer-tier');
    const accountInput = document.getElementById('customer-account');
    const bankInput = document.getElementById('customer-bank');      // <-- tambahkan ini
    const tokenInput = document.getElementById('customer-token');
    const emailInput = document.getElementById('customer-email');
    const phoneInput = document.getElementById('customer-phone');
    const addressInput = document.getElementById('customer-address');
    const outstandingInput = document.getElementById('customer-outstanding');

    if (editId) {
        const cust = customers.find(c => c.id === editId);
        if (cust) {
            nameInput.value = cust.name || '';
            codeInput.value = cust.code || '';
            tierSelect.value = cust.tier || 'Bronze';
            accountInput.value = cust.account || '';
            bankInput.value = cust.bank || '';                      // <-- tambahkan ini
            tokenInput.value = cust.token || '';
            emailInput.value = cust.email || '';
            phoneInput.value = cust.phone || '';
            addressInput.value = cust.address || '';
            outstandingInput.value = cust.outstanding || 0;
            editingCustomerId = editId;
            title.innerHTML = `<svg class="icon icon-primary" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Pelanggan`;
        }
    } else {
        nameInput.value = '';
        codeInput.value = '';
        tierSelect.value = 'Bronze';
        accountInput.value = '';
        bankInput.value = '';                                      // <-- tambahkan ini
        tokenInput.value = '';
        emailInput.value = '';
        phoneInput.value = '';
        addressInput.value = '';
        outstandingInput.value = 0;
        editingCustomerId = null;
        title.innerHTML = `<svg class="icon icon-primary" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/></svg> Tambah Pelanggan`;
    }
    modal.style.display = 'flex';
    closeDrawer();
}

function closeCustomerModal() {
    document.getElementById('customer-modal').style.display = 'none';
    editingCustomerId = null;
}

async function saveCustomer() {
    const name = document.getElementById('customer-name').value.trim();
    const code = document.getElementById('customer-code').value.trim();
    const tier = document.getElementById('customer-tier').value;
    const account = document.getElementById('customer-account').value.trim();
    const bank = document.getElementById('customer-bank').value.trim();      // <-- tambahkan ini
    const token = document.getElementById('customer-token').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const outstanding = parseFloat(document.getElementById('customer-outstanding').value) || 0;

    if (!name) { showNotification('Nama pelanggan harus diisi!', 'error'); return; }

    try {
        showLoading();
        const now = new Date().toISOString();
        if (editingCustomerId) {
            const cust = customers.find(c => c.id === editingCustomerId);
            if (cust) {
                cust.name = name;
                cust.code = code;
                cust.tier = tier;
                cust.account = account;
                cust.bank = bank;                // <-- tambahkan ini
                cust.token = token;
                cust.email = email;
                cust.phone = phone;
                cust.address = address;
                cust.outstanding = outstanding;
                cust.updatedAt = now;
                await dbPut(STORES.CUSTOMERS, cust);
            }
        } else {
            const newCust = { 
                name, code, tier, account, bank, token, email, phone, address, outstanding,
                createdAt: now, updatedAt: now 
            };
            const id = await dbAdd(STORES.CUSTOMERS, newCust);
            newCust.id = id;
            customers.push(newCust);
        }
        await loadCustomers();
        showNotification('Data pelanggan berhasil disimpan!', 'success');
        closeCustomerModal();
    } catch (error) {
        console.error('Error saving customer:', error);
        showNotification('Gagal menyimpan: ' + error.message, 'error');
    } finally { hideLoading(); }
}

async function deleteCustomer(customerId) {
    if (!confirm('Hapus pelanggan ini?')) return;
    try {
        showLoading();
        await dbDelete(STORES.CUSTOMERS, customerId);
        await loadCustomers();
        showNotification('Pelanggan dihapus', 'success');
        closeListCustomerModal();
        openDaftarCustomerModal();
    } catch (error) {
        console.error('Error deleting customer:', error);
        showNotification('Gagal hapus: ' + error.message, 'error');
    } finally { hideLoading(); }
}

function openDaftarCustomerModal() {
    const modal = document.getElementById('list-customer-modal');
    const container = document.getElementById('customer-list-container');
    container.innerHTML = '';
    if (customers.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Belum ada pelanggan.</div>';
    } else {
        customers.forEach(cust => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '10px';
            div.style.borderBottom = '1px solid #eee';
            div.innerHTML = `
                <div style="flex:1;">
                    <strong>${cust.name}</strong><br>
                    <span style="font-size:0.8rem;">
                        Kode: ${cust.code || '-'}<br>
                        Tier: ${cust.tier || '-'}<br>
                        Telepon: ${cust.phone || '-'}<br>
                        Email: ${cust.email || '-'}<br>
                        Rekening: ${cust.account || '-'}<br>
                        Bank: ${cust.bank || '-'}<br>   <!-- tambahkan baris ini -->
                        Token: ${cust.token || '-'}<br>
                        Alamat: ${cust.address || '-'}<br>
                        Piutang: ${formatRupiah(cust.outstanding || 0)}
                    </span>
                </div>
                <div>
                    <button class="action-btn edit-btn" onclick="openTambahCustomerModal(${cust.id})">${icons.edit}</button>
                    <button class="action-btn delete-btn" onclick="deleteCustomer(${cust.id})">${icons.delete}</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    modal.style.display = 'flex';
    closeDrawer();
}

function closeListCustomerModal() {
    document.getElementById('list-customer-modal').style.display = 'none';
}

// ==================== FUNGSI SUPPLIER ====================
function openTambahSupplierModal(editId = null) {
    const modal = document.getElementById('supplier-modal');
    const title = document.getElementById('supplier-modal-title');
    const nameInput = document.getElementById('supplier-name');
    const codeInput = document.getElementById('supplier-code');
    const accountInput = document.getElementById('supplier-account');
    const emailInput = document.getElementById('supplier-email');
    const phoneInput = document.getElementById('supplier-phone');
    const addressInput = document.getElementById('supplier-address');

    if (editId) {
        const supp = suppliers.find(s => s.id === editId);
        if (supp) {
            nameInput.value = supp.name || '';
            codeInput.value = supp.code || '';
            accountInput.value = supp.account || '';
            emailInput.value = supp.email || '';
            phoneInput.value = supp.phone || '';
            addressInput.value = supp.address || '';
            editingSupplierId = editId;
            title.innerHTML = `<svg class="icon icon-primary" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Supplier`;
        }
    } else {
        nameInput.value = '';
        codeInput.value = '';
        accountInput.value = '';
        emailInput.value = '';
        phoneInput.value = '';
        addressInput.value = '';
        editingSupplierId = null;
        title.innerHTML = `<svg class="icon icon-primary" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><circle cx="12" cy="12" r="2"/></svg> Tambah Supplier`;
    }
    modal.style.display = 'flex';
    closeDrawer();
}

function closeSupplierModal() {
    document.getElementById('supplier-modal').style.display = 'none';
    editingSupplierId = null;
}

async function saveSupplier() {
    const name = document.getElementById('supplier-name').value.trim();
    const code = document.getElementById('supplier-code').value.trim();
    const account = document.getElementById('supplier-account').value.trim();
    const email = document.getElementById('supplier-email').value.trim();
    const phone = document.getElementById('supplier-phone').value.trim();
    const address = document.getElementById('supplier-address').value.trim();

    if (!name) { showNotification('Nama supplier harus diisi!', 'error'); return; }

    try {
        showLoading();
        const now = new Date().toISOString();
        if (editingSupplierId) {
            const supp = suppliers.find(s => s.id === editingSupplierId);
            if (supp) {
                supp.name = name;
                supp.code = code;
                supp.account = account;
                supp.email = email;
                supp.phone = phone;
                supp.address = address;
                supp.updatedAt = now;
                await dbPut(STORES.SUPPLIERS, supp);
            }
        } else {
            const newSupp = { 
                name, code, account, email, phone, address,
                createdAt: now, updatedAt: now 
            };
            const id = await dbAdd(STORES.SUPPLIERS, newSupp);
            newSupp.id = id;
            suppliers.push(newSupp);
        }
        await loadSuppliers();
        showNotification('Data supplier berhasil disimpan!', 'success');
        closeSupplierModal();
    } catch (error) {
        console.error('Error saving supplier:', error);
        showNotification('Gagal menyimpan: ' + error.message, 'error');
    } finally { hideLoading(); }
}

async function deleteSupplier(supplierId) {
    if (!confirm('Hapus supplier ini?')) return;
    try {
        showLoading();
        await dbDelete(STORES.SUPPLIERS, supplierId);
        await loadSuppliers();
        showNotification('Supplier dihapus', 'success');
        closeListSupplierModal();
        openDaftarSupplierModal();
    } catch (error) {
        console.error('Error deleting supplier:', error);
        showNotification('Gagal hapus: ' + error.message, 'error');
    } finally { hideLoading(); }
}

function openDaftarSupplierModal() {
    const modal = document.getElementById('list-supplier-modal');
    const container = document.getElementById('supplier-list-container');
    container.innerHTML = '';
    if (suppliers.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Belum ada supplier.</div>';
    } else {
        suppliers.forEach(supp => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '10px';
            div.style.borderBottom = '1px solid #eee';
            div.innerHTML = `
                <div style="flex:1;">
                    <strong>${supp.name}</strong><br>
                    <span style="font-size:0.8rem;">
                        Kode: ${supp.code || '-'}<br>
                        Telepon: ${supp.phone || '-'}<br>
                        Email: ${supp.email || '-'}<br>
                        Rekening: ${supp.account || '-'}<br>
                        Alamat: ${supp.address || '-'}
                    </span>
                </div>
                <div>
                    <button class="action-btn edit-btn" onclick="openTambahSupplierModal(${supp.id})">${icons.edit}</button>
                    <button class="action-btn delete-btn" onclick="deleteSupplier(${supp.id})">${icons.delete}</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    modal.style.display = 'flex';
    closeDrawer();
}

function closeListSupplierModal() {
    document.getElementById('list-supplier-modal').style.display = 'none';
}

// ==================== FUNGSI DROPDOWN ====================
function toggleDropdown(btn) {
    const dropdown = btn.nextElementSibling;
    dropdown.classList.toggle('show');
    document.addEventListener('click', function close(e) {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
            document.removeEventListener('click', close);
        }
    });
}
