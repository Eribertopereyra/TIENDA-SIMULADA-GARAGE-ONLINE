document.addEventListener('DOMContentLoaded', () => {

    const AIRCRAFT_DATA_URL = './aviones.json';

    const aircraftContainer = document.getElementById('aircraftContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const myHangarCount = document.getElementById('myHangarCount');
    const myHangarItems = document.getElementById('myHangarItems');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const hangarTotalSpan = document.getElementById('hangarTotal');
    const modalElement = document.getElementById('aircraftDetailModal');
    
    const toastElement = document.getElementById('notificationToast');
    const toast = new bootstrap.Toast(toastElement);
    const toastIcon = document.getElementById('toast-icon');
    const backToTopBtn = document.getElementById('back-to-top-btn');
    const cartButton = document.getElementById('cart-button');

    const aircraftDetailModal = new bootstrap.Modal(modalElement);
    const hangarOffcanvas = new bootstrap.Offcanvas(document.getElementById('myHangarOffcanvas'));
    const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    
    const paymentForm = document.getElementById('paymentForm');
    const cardNameInput = document.getElementById('cardName');
    const cardNumberInput = document.getElementById('cardNumber');
    const cardExpiryInput = document.getElementById('cardExpiry');
    const cardCVCInput = document.getElementById('cardCVC');
    const processPaymentBtn = document.getElementById('processPaymentBtn');

    let allAircrafts = [];
    let myHangar = [];

    const showToast = (title, message, isError = false) => {
        document.getElementById('toast-title').textContent = title;
        document.getElementById('toast-body').textContent = message;
        toastIcon.className = isError ? 'fas fa-exclamation-circle text-danger me-2' : 'fas fa-check-circle text-success me-2';
        toast.show();
    };

    const validateInput = (input, regex, length) => {
        const value = input.value.trim();
        const isValid = regex.test(value) && value.length === length;
        input.classList.toggle('is-valid', isValid);
        input.classList.toggle('is-invalid', !isValid);
        return isValid;
    };
    
    const validateName = (input) => {
        const isValid = input.value.trim().length >= 5;
        input.classList.toggle('is-valid', isValid);
        input.classList.toggle('is-invalid', !isValid);
        return isValid;
    };

    const setupFormValidation = () => {
        cardNameInput.addEventListener('input', () => validateName(cardNameInput));
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formatted = value.match(/.{1,4}/g);
            e.target.value = formatted ? formatted.join(' ') : '';
            validateInput(cardNumberInput, /^(\d{4}\s){3}\d{4}$/, 19);
        });
        cardExpiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\//g, '').replace(/[^0-9]/gi, '');
            e.target.value = value.length > 2 ? `${value.slice(0, 2)}/${value.slice(2, 4)}` : value;
            validateInput(cardExpiryInput, /^(0[1-9]|1[0-2])\/\d{2}$/, 5);
        });
        cardCVCInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/gi, '');
            validateInput(cardCVCInput, /^\d{3}$/, 3);
        });
    };

    const initializeApp = async () => {
        loadHangarFromLocalStorage();
        updateMyHangarUI();
        await fetchAircrafts();
        setupEventListeners();
        setupFormValidation();
        AOS.init({ duration: 600, once: true });
    };

    const fetchAircrafts = async () => {
        loadingSpinner.style.display = 'block';
        try {
            const response = await fetch(AIRCRAFT_DATA_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allAircrafts = await response.json();
            displayAircrafts(allAircrafts);
            populateCategoryFilter();
        } catch (error) {
            console.error('Error al obtener las aeronaves:', error);
            aircraftContainer.innerHTML = `<p class="text-center text-danger">No se pudo cargar la flota.</p>`;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    };

    const formatCurrency = (number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
    };

    const displayAircrafts = (aircrafts) => {
        aircraftContainer.innerHTML = '';
        if (aircrafts.length === 0) {
            aircraftContainer.innerHTML = `<p class="text-center">No se encontraron aeronaves con esos criterios.</p>`;
            return;
        }
        aircrafts.forEach(craft => {
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'col-md-6 col-lg-4';
            cardWrapper.setAttribute('data-aos', 'zoom-in-up');
            cardWrapper.innerHTML = `
                <div class="aircraft-card" data-craft-id="${craft.id}">
                    <img src="${craft.imagen}" alt="${craft.modelo}" loading="lazy">
                    <div class="card-body">
                        <h5 class="card-title">${craft.modelo}</h5>
                        <p class="card-text">${craft.fabricante}</p>
                        <p class="aircraft-price">${formatCurrency(craft.precio)}</p>
                    </div>
                    <div class="card-overlay"><h4 class="overlay-title">${craft.modelo}</h4></div>
                    <button class="add-to-hangar-btn" data-craft-id="${craft.id}" aria-label="Añadir ${craft.modelo} a mi hangar"><i class="fas fa-plus"></i></button>
                </div>`;
            aircraftContainer.appendChild(cardWrapper);
        });
    };
    
    const populateCategoryFilter = () => {
        const categories = [...new Set(allAircrafts.map(craft => craft.categoria))];
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    };
    
    const applyFilters = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedCategory = categoryFilter.value;
        let filteredAircrafts = allAircrafts.filter(craft => 
            (craft.modelo.toLowerCase().includes(searchTerm) || craft.fabricante.toLowerCase().includes(searchTerm)) &&
            (!selectedCategory || craft.categoria === selectedCategory)
        );
        displayAircrafts(filteredAircrafts);
    };

    const loadHangarFromLocalStorage = () => {
        myHangar = JSON.parse(localStorage.getItem('aeroHubMyHangar')) || [];
    };

    const saveHangarToLocalStorage = () => {
        localStorage.setItem('aeroHubMyHangar', JSON.stringify(myHangar));
    };
    
    const addToMyHangar = (craftId) => {
        if (myHangar.some(craft => craft.id === craftId)) {
            showToast('Aviso', 'Esta aeronave ya está en tu carrito.', true);
            return;
        }
        const craftToAdd = allAircrafts.find(craft => craft.id === craftId);
        if (craftToAdd) {
            myHangar.push(craftToAdd);
            saveHangarToLocalStorage();
            updateMyHangarUI();
            showToast('Éxito', `${craftToAdd.modelo} ha sido añadido.`);
            cartButton.classList.add('shake');
            setTimeout(() => cartButton.classList.remove('shake'), 500);
        }
    };
    
    const removeFromMyHangar = (craftId) => {
        myHangar = myHangar.filter(craft => craft.id !== craftId);
        saveHangarToLocalStorage();
        updateMyHangarUI();
    };

    const updateMyHangarUI = () => {
        myHangarCount.textContent = myHangar.length;
        const total = myHangar.reduce((sum, craft) => sum + craft.precio, 0);
        hangarTotalSpan.textContent = formatCurrency(total);
        checkoutBtn.disabled = myHangar.length === 0;
        
        if (myHangar.length === 0) {
            myHangarItems.innerHTML = '<p>Tu carrito de cotización está vacío.</p>';
        } else {
            myHangarItems.innerHTML = myHangar.map(craft => `
                <div class="hangar-item">
                    <img src="${craft.imagen}" alt="${craft.modelo}">
                    <div class="flex-grow-1">
                        <strong>${craft.modelo}</strong>
                        <small class="d-block text-info">${formatCurrency(craft.precio)}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger remove-from-hangar-btn" data-craft-id="${craft.id}" aria-label="Quitar"><i class="fas fa-trash-alt"></i></button>
                </div>`).join('');
        }
    };
    
    const showAircraftDetails = (craftId) => {
        const craft = allAircrafts.find(c => c.id === craftId);
        if (!craft) return;
        const modalContent = document.querySelector('#aircraftDetailModal .modal-content');
        modalContent.innerHTML = `
            <div class="modal-header border-secondary"><h5 class="modal-title">${craft.modelo}</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-6"><img src="${craft.imagen}" alt="${craft.modelo}" class="img-fluid rounded"></div>
                    <div class="col-md-6">
                        <h3>${craft.modelo}</h3>
                        <p class="text-white-50">Por ${craft.fabricante}</p><hr>
                        <h4>Especificaciones Clave</h4>
                        <ul class="list-unstyled">
                            <li><strong>Categoría:</strong> ${craft.categoria}</li>
                            <li><strong>Velocidad Máxima:</strong> ${craft.detalles.velocidad_maxima}</li>
                            <li><strong>Alcance:</strong> ${craft.detalles.alcance}</li>
                            <li><strong>Año:</strong> ${craft.anio}</li>
                            <li class="mt-2"><strong>Precio:</strong> <span class="text-info fs-5">${formatCurrency(craft.precio)}</span></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="modal-footer border-secondary">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                <button type="button" class="btn btn-info add-to-cart-modal-btn" data-craft-id="${craft.id}"><i class="fas fa-plus me-2"></i>Añadir al Carrito</button>
            </div>`;
        aircraftDetailModal.show();
    };

    const processPayment = () => {
        try {
            const isNameValid = validateName(cardNameInput);
            const isCardNumberValid = validateInput(cardNumberInput, /^(\d{4}\s){3}\d{4}$/, 19);
            const isExpiryValid = validateInput(cardExpiryInput, /^(0[1-9]|1[0-2])\/\d{2}$/, 5);
            const isCVCValid = validateInput(cardCVCInput, /^\d{3}$/, 3);

            if (isNameValid && isCardNumberValid && isExpiryValid && isCVCValid) {
                showToast('Pago Confirmado', '¡Pago procesado con éxito! Su factura se está generando.');
                generateInvoicePDF();
                myHangar = [];
                saveHangarToLocalStorage();
                updateMyHangarUI();
                paymentModal.hide();
                [cardNameInput, cardNumberInput, cardExpiryInput, cardCVCInput].forEach(input => {
                    input.classList.remove('is-valid', 'is-invalid');
                });
                paymentForm.reset();
            } else {
                showToast('Error de Validación', 'Por favor, corrija los campos marcados.', true);
            }
        } catch (error) {
            console.error('Error durante el pago:', error);
            showToast('Error', 'Ocurrió un error al procesar el pago.', true);
        }
    };

    const generateInvoicePDF = () => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const date = new Date().toLocaleDateString('es-ES');
            const cardName = document.getElementById('cardName').value || 'Cliente Valorado';
            const transactionId = `AERO-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const pageCenter = doc.internal.pageSize.getWidth() / 2;
            let y = 20;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(28); doc.setTextColor(3, 169, 244);
            doc.text("AeroHub", pageCenter, y, { align: 'center' });
            y += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10); doc.setTextColor(150, 150, 150);
            doc.text("Su Hangar del Futuro", pageCenter, y, { align: 'center' });
            y += 15;
            doc.setDrawColor(220, 220, 220); doc.line(15, y, 195, y);
            y += 15;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16); doc.setTextColor(40, 40, 40);
            doc.text("FACTURA", 15, y);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
            doc.text(`Fecha: ${date}`, 195, y, { align: 'right' });
            y += 7;
            doc.text(`Pagado por: ${cardName}`, 15, y);
            doc.text(`Transacción: ${transactionId}`, 195, y, { align: 'right' });
            y += 15;
            doc.setFillColor(230, 230, 230); doc.rect(15, y, 180, 10, 'F');
            doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
            doc.text("AERONAVE (MODELO Y FABRICANTE)", 20, y + 7);
            doc.text("PRECIO (USD)", 195, y + 7, { align: 'right' });
            y += 10;
            doc.setFont('helvetica', 'normal');
            myHangar.forEach((craft, index) => {
                if (index % 2 === 1) { doc.setFillColor(245, 245, 245); doc.rect(15, y, 180, 10, 'F'); }
                doc.text(`${craft.modelo} (${craft.fabricante})`, 20, y + 7);
                doc.text(formatCurrency(craft.precio), 195, y + 7, { align: 'right' });
                y += 10;
            });
            y += 5;
            doc.setDrawColor(180, 180, 180); doc.line(15, y, 195, y);
            y += 10;
            const total = myHangar.reduce((sum, craft) => sum + craft.precio, 0);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
            doc.text("TOTAL PAGADO:", 140, y, { align: 'right' });
            doc.setFontSize(16); doc.setTextColor(3, 169, 244);
            doc.text(formatCurrency(total), 195, y, { align: 'right' });
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.15 }));
            doc.setTextColor(255, 0, 0);
            doc.setFontSize(100);
            doc.setFont('helvetica', 'bold');
            doc.text('P A G A D O', pageCenter, 160, { align: 'center', angle: -30 });
            doc.restoreGraphicsState();
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10); doc.setTextColor(150, 150, 150);
            doc.text("¡Gracias por su compra en AeroHub!", pageCenter, 280, { align: 'center' });
            doc.save(`factura-aerohub-${Date.now()}.pdf`);
        } catch (error) {
            console.error("Error al generar el PDF:", error);
            showToast("Error de Factura", "Hubo un problema al generar el PDF.", true);
        }
    };

    const setupEventListeners = () => {
        document.getElementById('searchInput').addEventListener('input', applyFilters);
        document.getElementById('categoryFilter').addEventListener('change', applyFilters);
        document.getElementById('checkoutBtn').addEventListener('click', () => { if (myHangar.length > 0) { hangarOffcanvas.hide(); paymentModal.show(); } });
        document.getElementById('processPaymentBtn').addEventListener('click', processPayment);
        
        document.getElementById('aircraftContainer').addEventListener('click', (e) => {
            const addButton = e.target.closest('.add-to-hangar-btn');
            const card = e.target.closest('.aircraft-card');
            if (addButton) { e.stopPropagation(); addToMyHangar(parseInt(addButton.dataset.craftId, 10)); } 
            else if (card) { showAircraftDetails(parseInt(card.dataset.craftId, 10)); }
        });
        
        document.getElementById('myHangarItems').addEventListener('click', (e) => {
            const removeButton = e.target.closest('.remove-from-hangar-btn');
            if (removeButton) { removeFromMyHangar(parseInt(removeButton.dataset.craftId, 10)); }
        });
        
        document.getElementById('aircraftDetailModal').addEventListener('click', (e) => {
            const addToCartBtn = e.target.closest('.add-to-cart-modal-btn');
            if (addToCartBtn) { addToMyHangar(parseInt(addToCartBtn.dataset.craftId, 10)); aircraftDetailModal.hide(); }
        });

        window.onscroll = () => {
            if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
                backToTopBtn.style.display = "block";
            } else {
                backToTopBtn.style.display = "none";
            }
        };
    };

    const initParticles = () => {
        particlesJS('particles-js', {
            "particles": { "number": { "value": 80, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#00BFFF" }, "shape": { "type": "circle" }, "opacity": { "value": 0.4, "random": true }, "size": { "value": 2.5, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.1, "width": 1 }, "move": { "enable": true, "speed": 1, "direction": "none", "out_mode": "out" } },
            "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": false } }, "modes": { "grab": { "distance": 140, "line_opacity": 0.3 } } },
            "retina_detect": true
        });
    };

    initParticles();
    initializeApp();
});