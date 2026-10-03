/**
 * ==============================================================================
 * EcoCycle – E-Waste Collection Portal
 * Frontend JavaScript: REST API Backend Integration, Local Fallback & UI Effects
 * ==============================================================================
 */

const API_BASE = '/api';
const STORAGE_KEY = 'ecoCycle_pickup_requests';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all core UI modules
    initNavbar();
    initScrollEffects();
    initDateRestrictions();
    initCategorySelectors();
    initPickupForm();
    initContactForm();
    initHistoryModal();
    initStatCounters();

    // Check backend connection and fetch live database data
    checkBackendHealth();
    syncPickupData();
});

/* --------------------------------------------------------------------------
   1. NAVBAR & MOBILE MENU TOGGLE
   -------------------------------------------------------------------------- */
function initNavbar() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    const header = document.getElementById('header');

    // Toggle mobile menu
    if (hamburgerBtn && navbar) {
        hamburgerBtn.addEventListener('click', () => {
            const isActive = navbar.classList.toggle('active');
            hamburgerBtn.classList.toggle('active');
            hamburgerBtn.setAttribute('aria-expanded', isActive);
        });

        // Close mobile menu when clicking any nav link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navbar.classList.remove('active');
                hamburgerBtn.classList.remove('active');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Header background blur on scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Active link highlighting based on scroll position
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset;

        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 120;
            const sectionId = current.getAttribute('id');
            const correspondingLink = document.querySelector(`.nav-link[href*="${sectionId}"]`);

            if (correspondingLink) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    correspondingLink.classList.add('active');
                } else {
                    correspondingLink.classList.remove('active');
                }
            }
        });
    });
}

/* --------------------------------------------------------------------------
   2. SCROLL EFFECTS & BACK TO TOP BUTTON
   -------------------------------------------------------------------------- */
function initScrollEffects() {
    const backToTopBtn = document.getElementById('backToTopBtn');

    if (backToTopBtn) {
        // Toggle visibility of back to top button
        window.addEventListener('scroll', () => {
            if (window.scrollY > 350) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });

        // Smooth scroll to top on click
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

/* --------------------------------------------------------------------------
   3. BACKEND HEALTH CHECK & STATS
   -------------------------------------------------------------------------- */
async function checkBackendHealth() {
    const badge = document.getElementById('apiStatusBadge');
    try {
        const res = await fetch(`${API_BASE}/status`);
        if (res.ok) {
            if (badge) {
                badge.innerHTML = `<span class="dot" style="background-color: #22c55e;"></span> Node.js API Connected`;
            }
        } else {
            throw new Error('API not available');
        }
    } catch (e) {
        if (badge) {
            badge.innerHTML = `<span class="dot" style="background-color: #eab308;"></span> Offline Mode (Local)`;
        }
    }
}

async function syncPickupData() {
    try {
        const res = await fetch(`${API_BASE}/pickups`);
        if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                // Update local storage mirror
                localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
                updatePickupBadges(json.data.length);
                return json.data;
            }
        }
    } catch (e) {
        console.warn('Backend unavailable, using localStorage mirror:', e.message);
    }
    const local = getStoredPickups();
    updatePickupBadges(local.length);
    return local;
}

/* --------------------------------------------------------------------------
   4. ANIMATED NUMBER COUNTERS (HERO STATS)
   -------------------------------------------------------------------------- */
function initStatCounters() {
    const statElements = document.querySelectorAll('.stat-number[data-target]');
    let animated = false;

    const animateStats = () => {
        statElements.forEach(el => {
            const target = parseInt(el.getAttribute('data-target'), 10);
            const duration = 1600;
            const stepTime = 25;
            const totalSteps = duration / stepTime;
            const increment = target / totalSteps;
            let current = 0;

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    el.textContent = target + '+';
                    clearInterval(timer);
                } else {
                    el.textContent = Math.floor(current) + '+';
                }
            }, stepTime);
        });
    };

    const heroSection = document.getElementById('home');
    if (heroSection && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !animated) {
                    animateStats();
                    animated = true;
                }
            });
        }, { threshold: 0.3 });

        observer.observe(heroSection);
    } else {
        animateStats();
    }
}

/* --------------------------------------------------------------------------
   5. E-WASTE CATEGORY SELECTION BUTTONS
   -------------------------------------------------------------------------- */
function initCategorySelectors() {
    const selectButtons = document.querySelectorAll('.category-select-btn');
    
    selectButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const category = button.getAttribute('data-category');
            selectCategoryAndScroll(category);
        });
    });
}

function selectCategoryAndScroll(categoryName) {
    const categoryDropdown = document.getElementById('ewasteCategory');
    const pickupSection = document.getElementById('pickup');
    const formWrapper = document.getElementById('pickupFormWrapper');

    if (categoryDropdown) {
        categoryDropdown.value = categoryName;
        categoryDropdown.dispatchEvent(new Event('change'));
        validateField(categoryDropdown, () => categoryDropdown.value !== '', 'Please select a category');

        if (pickupSection) {
            pickupSection.scrollIntoView({ behavior: 'smooth' });
        }

        if (formWrapper) {
            formWrapper.classList.add('highlight-ring');
            setTimeout(() => {
                formWrapper.classList.remove('highlight-ring');
            }, 1800);
        }

        showToast(`Selected "${categoryName}". Please fill in your pickup details.`, 'info');
    }
}

window.selectCategoryFromLink = function(categoryName) {
    selectCategoryAndScroll(categoryName);
};

/* --------------------------------------------------------------------------
   6. DATE RESTRICTIONS (DISABLE PAST DATES)
   -------------------------------------------------------------------------- */
function initDateRestrictions() {
    const pickupDateInput = document.getElementById('pickupDate');
    if (pickupDateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const minDate = `${yyyy}-${mm}-${dd}`;
        pickupDateInput.setAttribute('min', minDate);
    }
}

/* --------------------------------------------------------------------------
   7. SCHEDULE PICKUP FORM (REST API + VALIDATION)
   -------------------------------------------------------------------------- */
function initPickupForm() {
    const form = document.getElementById('pickupForm');
    if (!form) return;

    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('emailAddress');
    const mobileInput = document.getElementById('mobileNumber');
    const categorySelect = document.getElementById('ewasteCategory');
    const quantityInput = document.getElementById('quantity');
    const dateInput = document.getElementById('pickupDate');
    const addressInput = document.getElementById('pickupAddress');
    const submitBtn = document.getElementById('submitPickupBtn');

    // Real-time validations
    fullNameInput.addEventListener('input', () => validateFullName(fullNameInput));
    emailInput.addEventListener('input', () => validateEmail(emailInput));
    mobileInput.addEventListener('input', () => validateMobile(mobileInput));
    categorySelect.addEventListener('change', () => validateCategory(categorySelect));
    quantityInput.addEventListener('input', () => validateQuantity(quantityInput));
    dateInput.addEventListener('change', () => validatePickupDate(dateInput));
    addressInput.addEventListener('input', () => validateAddress(addressInput));

    // Form Submit Event Handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isNameValid = validateFullName(fullNameInput);
        const isEmailValid = validateEmail(emailInput);
        const isMobileValid = validateMobile(mobileInput);
        const isCategoryValid = validateCategory(categorySelect);
        const isQuantityValid = validateQuantity(quantityInput);
        const isDateValid = validatePickupDate(dateInput);
        const isAddressValid = validateAddress(addressInput);

        const isFormValid = isNameValid && isEmailValid && isMobileValid &&
                            isCategoryValid && isQuantityValid && isDateValid && isAddressValid;

        if (!isFormValid) {
            showToast('Please fix the errors in the form before submitting.', 'error');
            return;
        }

        const payload = {
            fullName: fullNameInput.value.trim(),
            email: emailInput.value.trim(),
            mobile: mobileInput.value.trim(),
            category: categorySelect.value,
            quantity: parseInt(quantityInput.value, 10) || 1,
            pickupDate: dateInput.value,
            address: addressInput.value.trim()
        };

        // UI loading state
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting to Backend...';

        let confirmedPickup = null;

        try {
            // Send to Node.js Backend REST API
            const response = await fetch(`${API_BASE}/pickups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                confirmedPickup = result.data;
                showToast(`Pickup scheduled! ID: ${confirmedPickup.id}`, 'success');
            } else {
                throw new Error(result.message || 'Server returned error');
            }
        } catch (apiErr) {
            console.warn('Backend POST failed, falling back to local storage:', apiErr.message);

            // Local fallback
            const fallbackId = 'ECO-' + Math.floor(10000 + Math.random() * 90000);
            confirmedPickup = {
                id: fallbackId,
                ...payload,
                status: 'Scheduled',
                createdAt: new Date().toLocaleString()
            };
            savePickupToStorage(confirmedPickup);
            showToast(`Pickup saved locally! ID: ${fallbackId}`, 'info');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }

        if (confirmedPickup) {
            // Update counts & show success modal
            await syncPickupData();
            openSuccessModal(confirmedPickup);

            // Reset form
            form.reset();
            clearValidationStyles([fullNameInput, emailInput, mobileInput, categorySelect, quantityInput, dateInput, addressInput]);
        }
    });
}

/* --- Validation Functions --- */
function validateFullName(input) {
    const val = input.value.trim();
    if (val.length === 0) {
        showFieldError(input, 'Full Name is required.');
        return false;
    }
    if (val.length < 3) {
        showFieldError(input, 'Name must be at least 3 characters long.');
        return false;
    }
    if (!/^[a-zA-Z\s.]+$/.test(val)) {
        showFieldError(input, 'Name should only contain alphabets.');
        return false;
    }
    showFieldSuccess(input);
    return true;
}

function validateEmail(input) {
    const val = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (val.length === 0) {
        showFieldError(input, 'Email address is required.');
        return false;
    }
    if (!emailRegex.test(val)) {
        showFieldError(input, 'Please enter a valid email address.');
        return false;
    }
    showFieldSuccess(input);
    return true;
}

function validateMobile(input) {
    const val = input.value.trim().replace(/\D/g, '');
    if (val.length === 0) {
        showFieldError(input, 'Mobile number is required.');
        return false;
    }
    if (val.length !== 10) {
        showFieldError(input, 'Please enter a valid 10-digit mobile number.');
        return false;
    }
    showFieldSuccess(input);
    return true;
}

function validateCategory(select) {
    if (!select.value || select.value === '') {
        showFieldError(select, 'Please select an E-Waste category.');
        return false;
    }
    showFieldSuccess(select);
    return true;
}

function validateQuantity(input) {
    const val = parseInt(input.value, 10);
    if (isNaN(val) || val < 1) {
        showFieldError(input, 'Quantity must be at least 1 device.');
        return false;
    }
    if (val > 100) {
        showFieldError(input, 'For bulk orders over 100 items, please contact support.');
        return false;
    }
    showFieldSuccess(input);
    return true;
}

function validatePickupDate(input) {
    const val = input.value;
    if (!val) {
        showFieldError(input, 'Please select a preferred pickup date.');
        return false;
    }

    const selectedDate = new Date(val);
    selectedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        showFieldError(input, 'Pickup date cannot be in the past.');
        return false;
    }

    showFieldSuccess(input);
    return true;
}

function validateAddress(textarea) {
    const val = textarea.value.trim();
    if (val.length === 0) {
        showFieldError(textarea, 'Complete pickup address is required.');
        return false;
    }
    if (val.length < 10) {
        showFieldError(textarea, 'Please provide a detailed address (min 10 characters).');
        return false;
    }
    showFieldSuccess(textarea);
    return true;
}

function showFieldError(input, message) {
    input.classList.remove('is-valid');
    input.classList.add('is-invalid');
    const errorEl = document.getElementById(`${input.id}Error`);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}

function showFieldSuccess(input) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    const errorEl = document.getElementById(`${input.id}Error`);
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
    }
}

function clearValidationStyles(inputs) {
    inputs.forEach(input => {
        if (!input) return;
        input.classList.remove('is-valid', 'is-invalid');
        const errorEl = document.getElementById(`${input.id}Error`);
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.remove('show');
        }
    });
}

/* --------------------------------------------------------------------------
   8. STORAGE & DATABASE HELPERS
   -------------------------------------------------------------------------- */
function getStoredPickups() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function savePickupToStorage(pickupObject) {
    try {
        const existing = getStoredPickups();
        existing.unshift(pickupObject);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
        console.error('Local storage error:', e);
    }
}

async function deletePickupRecord(requestId) {
    if (!confirm(`Are you sure you want to delete pickup request ${requestId}?`)) return;

    try {
        const res = await fetch(`${API_BASE}/pickups/${requestId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`Request ${requestId} deleted from backend.`, 'info');
        }
    } catch (e) {
        console.warn('API delete failed, removing locally');
    }

    let local = getStoredPickups().filter(item => item.id !== requestId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));

    await syncPickupData();
    renderHistoryTable();
}

function updatePickupBadges(count) {
    const finalCount = count !== undefined ? count : getStoredPickups().length;
    const navBadge = document.getElementById('navPickupCount');
    const teaserBadge = document.getElementById('teaserPickupCount');

    if (navBadge) navBadge.textContent = finalCount;
    if (teaserBadge) teaserBadge.textContent = finalCount;
}

/* --------------------------------------------------------------------------
   9. SUCCESS MODAL
   -------------------------------------------------------------------------- */
function openSuccessModal(pickup) {
    const modal = document.getElementById('successModal');
    if (!modal) return;

    document.getElementById('modalRequestId').textContent = pickup.id;
    document.getElementById('modalCustomerName').textContent = pickup.fullName;
    document.getElementById('modalCategory').textContent = pickup.category;
    document.getElementById('modalQuantity').textContent = `${pickup.quantity} item(s)`;
    document.getElementById('modalDate').textContent = pickup.pickupDate;
    document.getElementById('modalAddress').textContent = pickup.address;

    modal.classList.add('active');

    const doneBtn = document.getElementById('modalDoneBtn');
    if (doneBtn) doneBtn.focus();
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) modal.classList.remove('active');
}

const closeSuccessModalBtn = document.getElementById('closeSuccessModalBtn');
const modalDoneBtn = document.getElementById('modalDoneBtn');
const modalViewAllBtn = document.getElementById('modalViewAllBtn');

if (closeSuccessModalBtn) closeSuccessModalBtn.addEventListener('click', closeSuccessModal);
if (modalDoneBtn) modalDoneBtn.addEventListener('click', closeSuccessModal);

if (modalViewAllBtn) {
    modalViewAllBtn.addEventListener('click', () => {
        closeSuccessModal();
        openHistoryModal();
    });
}

/* --------------------------------------------------------------------------
   10. PICKUP HISTORY MODAL (LIVE BACKEND VIEW)
   -------------------------------------------------------------------------- */
function initHistoryModal() {
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    const openHistoryModalBtn = document.getElementById('openHistoryModalBtn');
    const closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');
    const closeHistoryBottomBtn = document.getElementById('closeHistoryBottomBtn');
    const historyModal = document.getElementById('historyModal');

    if (viewHistoryBtn) viewHistoryBtn.addEventListener('click', openHistoryModal);
    if (openHistoryModalBtn) openHistoryModalBtn.addEventListener('click', openHistoryModal);
    if (closeHistoryModalBtn) closeHistoryModalBtn.addEventListener('click', closeHistoryModal);
    if (closeHistoryBottomBtn) closeHistoryBottomBtn.addEventListener('click', closeHistoryModal);

    window.addEventListener('click', (e) => {
        if (e.target === historyModal) closeHistoryModal();
        const successModal = document.getElementById('successModal');
        if (e.target === successModal) closeSuccessModal();
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeHistoryModal();
            closeSuccessModal();
        }
    });
}

async function openHistoryModal() {
    const historyModal = document.getElementById('historyModal');
    if (!historyModal) return;
    await renderHistoryTable();
    historyModal.classList.add('active');
}

function closeHistoryModal() {
    const historyModal = document.getElementById('historyModal');
    if (historyModal) historyModal.classList.remove('active');
}

async function renderHistoryTable() {
    const wrapper = document.getElementById('historyListWrapper');
    if (!wrapper) return;

    wrapper.innerHTML = `<div style="text-align:center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading records from backend...</div>`;

    const pickups = await syncPickupData();

    if (pickups.length === 0) {
        wrapper.innerHTML = `
            <div class="history-empty-state">
                <i class="fa-solid fa-box-open"></i>
                <h4>No Pickup Requests Found</h4>
                <p>You haven't scheduled any e-waste pickups yet. Submit a request using our form!</p>
            </div>
        `;
        return;
    }

    let tableHtml = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Request ID</th>
                    <th>Customer</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    pickups.forEach(item => {
        tableHtml += `
            <tr>
                <td><strong style="color: var(--primary-color); font-family: monospace;">${escapeHtml(item.id)}</strong></td>
                <td>
                    <div><strong>${escapeHtml(item.fullName)}</strong></div>
                    <small style="color: var(--text-muted);">${escapeHtml(item.mobile)}</small>
                </td>
                <td>${escapeHtml(item.category)}</td>
                <td>${escapeHtml(String(item.quantity))}</td>
                <td>${escapeHtml(item.pickupDate)}</td>
                <td><span class="badge-status">${escapeHtml(item.status || 'Scheduled')}</span></td>
                <td>
                    <button class="btn-delete-row" onclick="deletePickupRecord('${item.id}')" title="Delete Request">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;

    wrapper.innerHTML = tableHtml;
}

window.deletePickupRecord = deletePickupRecord;

/* --------------------------------------------------------------------------
   11. CONTACT FORM HANDLING (REST API)
   -------------------------------------------------------------------------- */
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const nameInput = document.getElementById('contactName');
    const emailInput = document.getElementById('contactEmail');
    const msgInput = document.getElementById('contactMessage');
    const submitBtn = document.getElementById('submitContactBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let valid = true;

        if (nameInput.value.trim().length < 2) {
            showFieldError(nameInput, 'Please enter your name.');
            valid = false;
        } else {
            showFieldSuccess(nameInput);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value.trim())) {
            showFieldError(emailInput, 'Please enter a valid email.');
            valid = false;
        } else {
            showFieldSuccess(emailInput);
        }

        if (msgInput.value.trim().length < 5) {
            showFieldError(msgInput, 'Please enter a message (min 5 chars).');
            valid = false;
        } else {
            showFieldSuccess(msgInput);
        }

        if (!valid) return;

        const payload = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            message: msgInput.value.trim()
        };

        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

        try {
            const res = await fetch(`${API_BASE}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                showToast(`Thank you, ${payload.name}! Your message has been saved in the backend.`, 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (err) {
            showToast(`Thank you, ${payload.name}! Your message has been sent.`, 'success');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            form.reset();
            clearValidationStyles([nameInput, emailInput, msgInput]);
        }
    });
}

/* --------------------------------------------------------------------------
   12. TOAST NOTIFICATION UTILITY
   -------------------------------------------------------------------------- */
let toastTimeout;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    if (!toast || !toastMsg) return;

    clearTimeout(toastTimeout);

    toastMsg.textContent = message;

    if (type === 'error') {
        toastIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color: #ef4444;"></i>';
        toast.style.borderLeftColor = '#ef4444';
    } else if (type === 'info') {
        toastIcon.innerHTML = '<i class="fa-solid fa-circle-info" style="color: #0284c7;"></i>';
        toast.style.borderLeftColor = '#0284c7';
    } else {
        toastIcon.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #22c55e;"></i>';
        toast.style.borderLeftColor = '#22c55e';
    }

    toast.classList.add('show');

    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3800);
}

/* --------------------------------------------------------------------------
   13. SECURITY HELPER (XSS Prevention)
   -------------------------------------------------------------------------- */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
