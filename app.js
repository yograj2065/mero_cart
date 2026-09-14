  // ---- Product data ----
  const defaultProducts = [
    {name:"Trail Sneakers", price:1799, old:null, tag:"New", rating:4.6, reviews:142, color:"#EAE3D0", icon:"shoe"},
    {name:"Handwoven Tote", price:640, old:850, tag:"Sale", rating:4.4, reviews:96, color:"#DCE7DD", icon:"bag"},
    {name:"Copper Kettle", price:999, old:null, tag:null, rating:4.8, reviews:67, color:"#F0DCC4", icon:"kettle"},
    {name:"Wireless Earbuds", price:2499, old:2999, tag:"Sale", rating:4.3, reviews:210, color:"#DDE3EC", icon:"buds"},
    {name:"Ceramic Mug Set", price:790, old:null, tag:"New", rating:4.7, reviews:54, color:"#EAD6D6", icon:"mug"},
    {name:"Cotton Kurta", price:1299, old:null, tag:null, rating:4.5, reviews:88, color:"#E3DEC9", icon:"kurta"},
    {name:"Desk Lamp", price:1150, old:1450, tag:"Sale", rating:4.2, reviews:39, color:"#D7E0D8", icon:"lamp"},
    {name:"Leather Wallet", price:850, old:null, tag:null, rating:4.6, reviews:121, color:"#E6D9C6", icon:"wallet"},
  ];
  let products = JSON.parse(localStorage.getItem('merocartProducts') || 'null') || defaultProducts.map(product => ({...product}));
  let supabaseClient = null;
  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseClient = window.supabase.createClient(
        'https://roiluuuhmdrxcyibcoix.supabase.co',
        'sb_publishable_80UOxMFj71mzFUvifhnDCQ_CHRvqbgZ'
      );
    }
  } catch (error) {
    console.warn('Supabase client unavailable; using local fallback.', error);
  }

  function toProduct(row){
    return {...row, old: row.old_price ?? null};
  }

  function toRow(product){
    return {
      ...(product.id ? {id: product.id} : {}),
      name: product.name,
      price: product.price,
      old_price: product.old || null,
      tag: product.tag || null,
      rating: product.rating || 4.5,
      reviews: product.reviews || 0,
      color: product.color || '#DCE7DD',
      icon: product.icon || 'bag',
      image: product.image || null
    };
  }

  async function loadSharedProducts(){
    if (!supabaseClient) return;
    const {data, error} = await supabaseClient.from('products').select('*').order('created_at');
    if (error) { console.warn('Supabase products unavailable; using local catalogue.', error.message); return; }
    if (data.length) {
      products = data.map(toProduct);
    } else {
      const {data: seeded, error: seedError} = await supabaseClient.from('products').insert(defaultProducts.map(toRow)).select();
      if (seedError) { console.warn('Supabase catalogue is empty and could not be seeded.', seedError.message); return; }
      products = seeded.map(toProduct);
    }
    localStorage.setItem('merocartProducts', JSON.stringify(products));
    renderProducts();
    renderAdminProducts();
  }

  function subscribeToProductChanges(){
    if (!supabaseClient) return;
    try {
      supabaseClient.channel('products-live')
        .on('postgres_changes', {event: '*', schema: 'public', table: 'products'}, payload => {
          if (payload.eventType === 'INSERT' && !products.some(product => product.id === payload.new.id)) products.push(toProduct(payload.new));
          if (payload.eventType === 'UPDATE') {
            const index = products.findIndex(product => product.id === payload.new.id);
            if (index >= 0) products[index] = toProduct(payload.new);
          }
          if (payload.eventType === 'DELETE') products = products.filter(product => product.id !== payload.old.id);
          saveProducts();
          renderProducts();
          renderAdminProducts();
        })
        .subscribe();
    } catch (error) {
      console.warn('Realtime unavailable; Admin and local catalogue remain available.', error);
    }
  }

  const icons = {
    shoe:'<path d="M3 17c0-2 1.5-3 3-3 1 0 1.5.5 2.5.5s1.5-1 2.5-1c1.5 0 2 1 3.5 1 2 0 4-1 6-1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M8 14V8c1.5 0 2.5 1 3.5 2 1 1 2.5 1 3.5 1"/>',
    bag:'<path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    kettle:'<path d="M6 20h9a3 3 0 0 0 3-3v-1a3 3 0 0 0-3-3H9"/><path d="M6 13V9a3 3 0 0 1 3-3h1"/><path d="M9 6V4"/><circle cx="7" cy="17" r="1"/>',
    buds:'<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M8 12v4a2 2 0 0 0 4 0"/><path d="M16 12v4a2 2 0 0 1-4 0"/>',
    mug:'<path d="M5 8h11v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8Z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/>',
    kurta:'<path d="M9 3l3 2 3-2 3 3-2 2v13H8V8L6 6l3-3Z"/>',
    lamp:'<path d="M6 4h12l-3 6H9L6 4Z"/><path d="M12 10v10"/><path d="M8 20h8"/>',
    wallet:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.4"/>'
  };

  let cartItems = JSON.parse(localStorage.getItem('merocartCart') || '[]');
  const grid = document.getElementById('prodGrid');
  function renderProducts(){
    grid.innerHTML = '';
    products.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'prod-card';
    card.innerHTML = `
      <div class="prod-img" style="background:${p.color}">
        ${p.tag ? `<span class="prod-tag ${p.tag==='Sale'?'sale':''}">${p.tag}</span>` : ''}
        <div class="heart" data-liked="false"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.1C.4 8.6 2 5 5.6 5 8 5 9.6 6.4 12 9c2.4-2.6 4-4 6.4-4C22 5 23.6 8.6 22 11.9 19.5 16.4 12 21 12 21Z"/></svg></div>
        ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">` : `<svg viewBox="0 0 24 24" fill="none" stroke="#1E3B2C" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${icons[p.icon]}</svg>`}
      </div>
      <div class="prod-body">
        <div class="name">${p.name}</div>
        <div class="stars">★★★★★ <span class="n">(${p.reviews})</span></div>
        <div class="price-row">
          <span class="price">Rs. ${p.price.toLocaleString()}</span>
          ${p.old ? `<span class="price-old">Rs. ${p.old.toLocaleString()}</span>` : ''}
        </div>
        <button class="add-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21.5 8H6"/></svg>
          Add to cart
        </button>
      </div>`;
    grid.appendChild(card);

    card.querySelector('.heart').addEventListener('click', (e) => {
      const h = e.currentTarget;
      h.classList.toggle('liked');
    });

    card.querySelector('.add-btn').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      btn.textContent = '';
      const check = document.createElement('span');
      check.textContent = 'Added ✓';
      btn.appendChild(check);
      btn.classList.add('added');
      addToCart(p);
      setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21.5 8H6"/></svg> Add to cart';
      }, 1400);
    });
    });
  }
  renderProducts();

  // ---- Walking cat: strolls along the first row of products, highlighting each ----
  function initCatWalk(){
    const track = document.getElementById('catTrack');
    const cat = document.getElementById('catSvg');
    const speech = document.getElementById('catSpeech');
    const cards = Array.from(document.querySelectorAll('#prodGrid .prod-card'));
    if (!track || !cat || cards.length === 0) return;

    let rowCards = cards.filter(c => c.offsetTop === cards[0].offsetTop);
    if (rowCards.length === 0) rowCards = [cards[0]];

    let i = 0;
    let current = null;

    function stepTo(index){
      if (current) current.classList.remove('cat-highlight');
      const card = rowCards[index];
      current = card;
      const targetLeft = Math.max(0, card.offsetLeft + card.offsetWidth / 2 - cat.getBoundingClientRect().width / 2);
      cat.style.left = targetLeft + 'px';
      speech.style.left = targetLeft + 'px';
      speech.textContent = ['psst, try this one 🐾','this one\'s popular! 🐾','meow-st wanted 🐾','tap to add 🐾'][index % 4];
      speech.classList.remove('show');
      setTimeout(() => {
        card.classList.add('cat-highlight');
        speech.classList.add('show');
      }, 650);
    }

    stepTo(0);
    setInterval(() => {
      i = (i + 1) % rowCards.length;
      stepTo(i);
    }, 2800);

    window.addEventListener('resize', () => {
      rowCards = cards.filter(c => c.offsetTop === cards[0].offsetTop);
      if (rowCards.length === 0) rowCards = [cards[0]];
      i = 0;
      stepTo(0);
    });
  }
  window.addEventListener('load', initCatWalk);

  // ---- Cart ----
  const cartCountEl = document.getElementById('cartCount');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalPriceEl = document.getElementById('cartTotalPrice');
  const cartOrderEl = document.getElementById('cartOrder');
  function saveCart(){ localStorage.setItem('merocartCart', JSON.stringify(cartItems)); }
  function renderCart(){
    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    cartCountEl.textContent = itemCount;
    cartItemsEl.innerHTML = cartItems.length ? cartItems.map((item, index) => `
      <div class="cart-item">
        <div class="cart-item-image">${item.image ? `<img src="${item.image}" alt="${item.name}">` : `<svg viewBox="0 0 24 24" fill="none" stroke="#1E3B2C" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${icons[item.icon] || icons.bag}</svg>`}</div>
        <div class="cart-item-info"><strong>${item.name}</strong><span>Rs. ${item.price.toLocaleString()} × ${item.quantity}</span></div>
        <button class="cart-remove" type="button" data-remove-cart="${index}">Remove</button>
      </div>`).join('') : '<div class="cart-empty">Your cart is empty.</div>';
    cartTotalPriceEl.textContent = `Rs. ${totalPrice.toLocaleString()}`;
    const message = cartItems.length ? `Hi MeroCart, I would like to order:\n${cartItems.map(item => `• ${item.name} x${item.quantity} - Rs. ${item.price * item.quantity}`).join('\n')}\n\nTotal: Rs. ${totalPrice}` : 'Hi MeroCart, I would like to place an order.';
    cartOrderEl.href = `https://wa.me/9779807919525?text=${encodeURIComponent(message)}`;
  }
  function addToCart(product){
    const existing = cartItems.find(item => item.name === product.name);
    if (existing) existing.quantity++; else cartItems.push({...product, quantity: 1});
    saveCart(); renderCart();
    cartCountEl.classList.add('bump');
    setTimeout(() => cartCountEl.classList.remove('bump'), 250);
  }
  renderCart();
  document.getElementById('cartIcon').addEventListener('click', event => { event.preventDefault(); cartOverlay.classList.add('open'); cartOverlay.setAttribute('aria-hidden', 'false'); });
  document.getElementById('cartClose').addEventListener('click', () => { cartOverlay.classList.remove('open'); cartOverlay.setAttribute('aria-hidden', 'true'); });
  cartOverlay.addEventListener('click', event => { if (event.target === cartOverlay) document.getElementById('cartClose').click(); });
  cartItemsEl.addEventListener('click', event => {
    const index = event.target.dataset.removeCart;
    if (index === undefined) return;
    cartItems.splice(Number(index), 1); saveCart(); renderCart();
  });

  // ---- Sticky nav shadow ----
  const navHeader = document.getElementById('navHeader');
  window.addEventListener('scroll', () => {
    navHeader.classList.toggle('scrolled', window.scrollY > 8);
  });

  // ---- Mobile menu ----
  const burgerBtn = document.getElementById('burgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  burgerBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));

  // ---- Scroll reveal (restrained: section headers + key blocks only) ----
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, {threshold: 0.15});
  revealEls.forEach(el => io.observe(el));

  // ---- Admin catalogue ----
  const adminOverlay = document.getElementById('adminOverlay');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminDashboard = document.getElementById('adminDashboard');
  const adminError = document.getElementById('adminError');
  const adminProductList = document.getElementById('adminProductList');
  const productForm = document.getElementById('productForm');
  let selectedProductImage = null;

  function saveProducts(){
    localStorage.setItem('merocartProducts', JSON.stringify(products));
  }

  async function saveProductToCloud(product){
    if (!supabaseClient) return product;
    const {data, error} = product.id
      ? await supabaseClient.from('products').update(toRow(product)).eq('id', product.id).select().single()
      : await supabaseClient.from('products').insert(toRow(product)).select().single();
    if (error) throw new Error(error.message);
    return toProduct(data);
  }

  function resetProductForm(){
    productForm.reset();
    selectedProductImage = null;
    const imagePreview = document.getElementById('productImagePreview');
    imagePreview.removeAttribute('src');
    imagePreview.classList.remove('visible');
    document.getElementById('productIndex').value = '';
    document.getElementById('adminFormTitle').textContent = 'Add product';
    document.getElementById('productSubmit').textContent = 'Add product';
  }

  function renderAdminProducts(){
    adminProductList.innerHTML = products.map((product, index) => `
      <div class="admin-product">
        <div class="admin-product-info"><strong>${product.name}</strong><span>Rs. ${product.price.toLocaleString()}${product.tag ? ` · ${product.tag}` : ''}</span></div>
        <div class="admin-product-actions"><button type="button" data-edit="${index}">Edit</button><button type="button" data-delete="${index}">Delete</button></div>
      </div>`).join('');
    document.getElementById('adminProductCount').textContent = products.length;
  }

  function openAdmin(){
    adminOverlay.classList.add('open');
    adminOverlay.setAttribute('aria-hidden', 'false');
    adminLoginForm.hidden = false;
    adminDashboard.hidden = true;
    adminError.textContent = '';
    document.getElementById('adminUsername').focus();
  }

  document.getElementById('adminMenuLink').addEventListener('click', event => {
    event.preventDefault();
    openAdmin();
  });
  document.getElementById('adminClose').addEventListener('click', () => { adminOverlay.classList.remove('open'); adminOverlay.setAttribute('aria-hidden', 'true'); });
  adminOverlay.addEventListener('click', event => { if (event.target === adminOverlay) document.getElementById('adminClose').click(); });
  adminLoginForm.addEventListener('submit', event => {
    event.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    if (username === 'yog' && password === 'yograj@123') {
      adminLoginForm.hidden = true;
      adminDashboard.hidden = false;
      renderAdminProducts();
      resetProductForm();
    } else {
      adminError.textContent = 'Incorrect username or password.';
    }
  });
  document.getElementById('adminLogout').addEventListener('click', openAdmin);
  document.getElementById('adminReset').addEventListener('click', async () => {
    if (!window.confirm('Restore the original catalogue?')) return;
    if (supabaseClient) await supabaseClient.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (supabaseClient) {
      const {data} = await supabaseClient.from('products').insert(defaultProducts.map(toRow)).select();
      products = data ? data.map(toProduct) : defaultProducts.map(product => ({...product}));
    } else products = defaultProducts.map(product => ({...product}));
    saveProducts(); renderProducts(); renderAdminProducts(); resetProductForm();
  });
  productForm.addEventListener('submit', async event => {
    event.preventDefault();
    const productError = document.getElementById('productError');
    productError.textContent = '';
    const index = document.getElementById('productIndex').value;
    const product = {
      name: document.getElementById('productName').value.trim(),
      price: Number(document.getElementById('productPrice').value),
      old: Number(document.getElementById('productOld').value) || null,
      tag: document.getElementById('productTag').value || null,
      rating: 4.5, reviews: 0, color: '#DCE7DD', icon: document.getElementById('productIcon').value, image: selectedProductImage
    };
    try {
      const savedProduct = await saveProductToCloud(index === '' ? product : {...product, id: products[Number(index)].id});
      if (index === '') products.push(savedProduct); else products[Number(index)] = savedProduct;
      saveProducts(); renderProducts(); renderAdminProducts(); resetProductForm();
    } catch (error) {
      productError.textContent = `Could not save to Supabase: ${error.message}`;
    }
  });
  document.getElementById('productImage').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      selectedProductImage = reader.result;
      const imagePreview = document.getElementById('productImagePreview');
      imagePreview.src = selectedProductImage;
      imagePreview.classList.add('visible');
    });
    reader.readAsDataURL(file);
  });
  adminProductList.addEventListener('click', async event => {
    const editIndex = event.target.dataset.edit;
    const deleteIndex = event.target.dataset.delete;
    if (editIndex !== undefined) {
      const product = products[Number(editIndex)];
      document.getElementById('productIndex').value = editIndex;
      document.getElementById('productName').value = product.name;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productOld').value = product.old || '';
      document.getElementById('productTag').value = product.tag || '';
      document.getElementById('productIcon').value = product.icon;
      selectedProductImage = product.image || null;
      const imagePreview = document.getElementById('productImagePreview');
      if (selectedProductImage) { imagePreview.src = selectedProductImage; imagePreview.classList.add('visible'); }
      else { imagePreview.removeAttribute('src'); imagePreview.classList.remove('visible'); }
      document.getElementById('adminFormTitle').textContent = 'Edit product';
      document.getElementById('productSubmit').textContent = 'Save changes';
    }
    if (deleteIndex !== undefined && window.confirm(`Delete ${products[Number(deleteIndex)].name}?`)) {
      const product = products[Number(deleteIndex)];
      if (supabaseClient && product.id) await supabaseClient.from('products').delete().eq('id', product.id);
      products.splice(Number(deleteIndex), 1); saveProducts(); renderProducts(); renderAdminProducts(); resetProductForm();
    }
  });

  loadSharedProducts();
  subscribeToProductChanges();
