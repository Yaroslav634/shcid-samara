const API_BASE_URL = window.location.origin.includes("localhost")
  ? `http://localhost:${window.location.port || 3001}/api`
  : "/api";

let currentUser = null;
let selectedCategory = null;
let selectedComponents = [];
let selectedServices = [];
let allComponents = [];
let allServices = [];
let categories = [];

document.addEventListener("DOMContentLoaded", () => {
  checkConnection();
  loadCategories();
  loadComponents();
  loadServices();
  checkAuth();
  initThemeToggle();

  document
    .getElementById("searchComponents")
    ?.addEventListener("input", filterComponents);
  document
    .getElementById("catalogSearch")
    ?.addEventListener("input", filterCatalog);
  document
    .getElementById("catalogCategory")
    ?.addEventListener("change", filterCatalog);
});

function initThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;

  const currentTheme = localStorage.getItem("theme");
  if (currentTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggle.checked = true;
  }

  themeToggle.addEventListener("change", function () {
    if (this.checked) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    }
  });
}

function toggleDeliveryAddress() {
  const method = document.getElementById("deliveryMethod");
  const group = document.getElementById("deliveryAddressGroup");
  if (method && group) {
    group.style.display = method.value === "delivery" ? "block" : "none";
  }
}

function calculateTotal() {
  const componentsTotal = selectedComponents.reduce(
    (sum, comp) => sum + parseFloat(comp.price) * (comp.quantity || 1),
    0,
  );
  const servicesTotal = selectedServices.reduce(
    (sum, service) => sum + parseFloat(service.price || 0),
    0,
  );
  return {
    components: componentsTotal,
    services: servicesTotal,
    total: componentsTotal + servicesTotal,
  };
}

function updateTotal() {
  const totals = calculateTotal();
  const totalPriceEl = document.getElementById("totalPrice");
  if (totalPriceEl) {
    totalPriceEl.textContent =
      new Intl.NumberFormat("ru-RU").format(totals.total) + " ₽";
  }

  if (
    document.getElementById("customerFormSection")?.style.display === "block"
  ) {
    updateSummary();
  }

  const saveConfigBtn = document.getElementById("saveConfigBtn");
  if (saveConfigBtn) {
    saveConfigBtn.disabled = selectedComponents.length === 0;
  }
}

function updateSummary() {
  const totals = calculateTotal();
  document.getElementById("summaryComponents").textContent =
    new Intl.NumberFormat("ru-RU").format(totals.components) + " ₽";
  document.getElementById("summaryServices").textContent =
    new Intl.NumberFormat("ru-RU").format(totals.services) + " ₽";
  document.getElementById("summaryTotal").textContent =
    new Intl.NumberFormat("ru-RU").format(totals.total) + " ₽";
}

function showOrderForm() {
  if (!currentUser) {
    showNotification("Необходимо авторизоваться", "warning");
    showLoginModal();
    return;
  }

  if (selectedComponents.length === 0) {
    showNotification("Добавьте хотя бы один компонент", "warning");
    return;
  }

  updateSummary();
  const form = document.getElementById("customerFormSection");
  if (form) {
    form.style.display = "block";
    form.scrollIntoView({ behavior: "smooth" });
  }
}

function showOrderSuccessNotification(orderNumber) {
  document.getElementById("orderSuccessMessage").textContent =
    `Заказ №${orderNumber} успешно создан`;
  document.getElementById("orderSuccessNotification").style.display = "block";
  setTimeout(closeSuccessNotification, 10000);
}

function closeSuccessNotification() {
  document.getElementById("orderSuccessNotification").style.display = "none";
}

function goToMyOrders() {
  window.location.href = "/orders.html";
}

async function submitOrder(event) {
  event.preventDefault();

  const customerName = document.getElementById("customerName")?.value.trim();
  if (!customerName) {
    showNotification("Введите ваше имя", "warning");
    return;
  }

  if (selectedComponents.length === 0) {
    showNotification("Добавьте компоненты", "warning");
    return;
  }

  const totals = calculateTotal();

  const orderData = {
    customer_name: customerName,
    customer_email:
      document.getElementById("customerEmail")?.value.trim() || null,
    customer_phone:
      document.getElementById("customerPhone")?.value.trim() || null,
    customer_address:
      document.getElementById("customerAddress")?.value.trim() || null,
    delivery_method:
      document.getElementById("deliveryMethod")?.value || "pickup",
    delivery_address:
      document.getElementById("deliveryAddress")?.value.trim() || null,
    payment_method: document.getElementById("paymentMethod")?.value || "cash",
    config_name:
      document.getElementById("configName")?.value.trim() || "Моя конфигурация",
    components: selectedComponents.map((c) => ({
      id: parseInt(c.id),
      name: c.name,
      price: parseFloat(c.price),
      quantity: parseInt(c.quantity || 1),
    })),
    services: selectedServices.map((s) => ({
      id: parseInt(s.id),
      name: s.name,
      price: parseFloat(s.price),
    })),
    total_amount: totals.total,
    comments: document.getElementById("comments")?.value.trim() || null,
  };

  try {
    showNotification("Создание заказа...", "info");

    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(orderData),
    });

    const data = await response.json();

    if (data.success) {
      showNotification(`Заказ №${data.orderNumber} создан!`, "success");
      showOrderSuccessNotification(data.orderNumber);

      selectedComponents = [];
      selectedServices = [];
      updateCart();
      updateTotal();
      document
        .querySelectorAll(".service-checkbox")
        .forEach((cb) => (cb.checked = false));
      document.getElementById("orderForm")?.reset();
      document.getElementById("customerFormSection").style.display = "none";
      loadComponents();
    } else {
      showNotification("Ошибка: " + data.message, "error");
    }
  } catch (error) {
    showNotification("Ошибка при создании заказа", "error");
  }
}

async function checkAuth() {
  try {
    const response = await fetch(`${API_BASE_URL}/me`, {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success && data.authenticated) {
      currentUser = data.user;

      const authSection = document.getElementById("authSection");
      if (!authSection) return;

      let authHtml = `
                <div class="user-menu">
                    <span><i class="fas fa-user"></i> ${currentUser.full_name}</span>
                    <span class="role-badge">${currentUser.role}</span>
            `;

      if (currentUser.role === "admin" || currentUser.role === "manager") {
        authHtml += `<a href="/admin.html" class="nav-link"><i class="fas fa-cog"></i> Админка</a>`;
      }

      authHtml += `<button onclick="logout()" class="logout-btn"><i class="fas fa-sign-out-alt"></i></button></div>`;

      authSection.innerHTML = authHtml;
      document.getElementById("saveConfigBtn").disabled = false;
    }
  } catch (error) {
    console.error("Ошибка авторизации:", error);
  }
}

async function logout() {
  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
    currentUser = null;
    window.location.reload();
  } catch (error) {
    showNotification("Ошибка при выходе", "error");
  }
}

function showLoginModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.style.display = "flex";
    showLoginForm();
  }
}

function showRegisterModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.style.display = "flex";
    showRegisterForm();
  }
}

function closeModal() {
  document.getElementById("authModal").style.display = "none";
  document.getElementById("loginError").textContent = "";
  document.getElementById("registerError").textContent = "";
}

function showLoginForm() {
  document.getElementById("modalTitle").textContent = "Вход";
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("registerForm").style.display = "none";
}

function showRegisterForm() {
  document.getElementById("modalTitle").textContent = "Регистрация";
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "block";
}

async function login() {
  const username = document.getElementById("loginUsername")?.value;
  const password = document.getElementById("loginPassword")?.value;
  const errorEl = document.getElementById("loginError");

  if (!username || !password) {
    errorEl.textContent = "Заполните все поля";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      closeModal();
      await checkAuth();
      showNotification(`Добро пожаловать, ${data.user.full_name}!`, "success");
    } else {
      errorEl.textContent = data.message;
    }
  } catch (error) {
    errorEl.textContent = "Ошибка соединения";
  }
}

async function register() {
  const username = document.getElementById("regUsername")?.value;
  const password = document.getElementById("regPassword")?.value;
  const password2 = document.getElementById("regPassword2")?.value;
  const email = document.getElementById("regEmail")?.value;
  const fullName = document.getElementById("regFullName")?.value;
  const phone = document.getElementById("regPhone")?.value;
  const errorEl = document.getElementById("registerError");

  if (!username || !password || !email || !fullName) {
    errorEl.textContent = "Заполните обязательные поля";
    return;
  }

  if (password !== password2) {
    errorEl.textContent = "Пароли не совпадают";
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = "Пароль должен быть не менее 6 символов";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        email,
        full_name: fullName,
        phone,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Регистрация успешна!", "success");
      showLoginForm();
      document.getElementById("loginUsername").value = username;
    } else {
      errorEl.textContent = data.message;
    }
  } catch (error) {
    errorEl.textContent = "Ошибка соединения";
  }
}

async function checkConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/test`);
    const data = await response.json();

    const statusEl = document.getElementById("dbStatus");
    const statusDot = document.getElementById("statusDot");

    if (statusEl && statusDot) {
      if (data.success) {
        statusEl.innerHTML = "✅ Подключено";
        statusDot.className = "status-dot connected";
      } else {
        statusEl.innerHTML = "❌ Ошибка";
        statusDot.className = "status-dot disconnected";
      }
    }
  } catch (error) {
    const statusEl = document.getElementById("dbStatus");
    const statusDot = document.getElementById("statusDot");
    if (statusEl) statusEl.innerHTML = "❌ Ошибка";
    if (statusDot) statusDot.className = "status-dot disconnected";
  }
}

async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`);
    categories = await response.json();

    const categoriesList = document.getElementById("categoriesList");
    const catalogSelect = document.getElementById("catalogCategory");

    if (categoriesList) {
      if (categories.length === 0) {
        categoriesList.innerHTML =
          '<div class="empty-message">Нет категорий</div>';
      } else {
        categoriesList.innerHTML = categories
          .map(
            (cat) => `
                    <div class="category-item ${selectedCategory === cat.id ? "active" : ""}" 
                         onclick="selectCategory(${cat.id})">
                        <h4>${cat.name}</h4>
                        <p>${cat.description || ""}</p>
                    </div>
                `,
          )
          .join("");
      }
    }

    if (catalogSelect) {
      catalogSelect.innerHTML =
        '<option value="">Все категории</option>' +
        categories
          .map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
          .join("");
    }
  } catch (error) {
    console.error("Ошибка загрузки категорий:", error);
  }
}

function selectCategory(categoryId) {
  selectedCategory = selectedCategory === categoryId ? null : categoryId;
  loadComponents();
}

async function loadComponents() {
  try {
    let url = `${API_BASE_URL}/components`;
    if (selectedCategory) {
      url += `?category_id=${selectedCategory}`;
    }

    const response = await fetch(url);
    allComponents = await response.json();

    const componentsList = document.getElementById("componentsList");
    if (!componentsList) return;

    if (allComponents.length === 0) {
      componentsList.innerHTML =
        '<div class="empty-message">Нет компонентов</div>';
      return;
    }

    componentsList.innerHTML = allComponents
      .map((comp) => {
        const isSelected = selectedComponents.some((c) => c.id === comp.id);
        return `
                <div class="component-item">
                    <div class="component-info">
                        <h4>${comp.name}</h4>
                        <p>${comp.description || ""}</p>
                        <p>${comp.manufacturer || ""}</p>
                    </div>
                    <div class="component-details">
                        <div class="component-price">${new Intl.NumberFormat("ru-RU").format(comp.price)} ₽</div>
                        <button class="add-btn" onclick="addToCart(${comp.id})" ${isSelected ? "disabled" : ""}>
                            <i class="fas fa-${isSelected ? "check" : "plus"}"></i>
                            ${isSelected ? "Добавлено" : "Добавить"}
                        </button>
                    </div>
                </div>
            `;
      })
      .join("");

    filterComponents();
  } catch (error) {
    console.error("Ошибка загрузки компонентов:", error);
  }
}

function filterComponents() {
  const searchTerm = document
    .getElementById("searchComponents")
    ?.value.toLowerCase();
  if (!searchTerm) return;

  document
    .querySelectorAll("#componentsList .component-item")
    .forEach((item) => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(searchTerm) ? "" : "none";
    });
}

function addToCart(componentId) {
  const component = allComponents.find((c) => c.id === componentId);
  if (!component || selectedComponents.some((c) => c.id === componentId))
    return;

  selectedComponents.push({ ...component, quantity: 1 });
  updateCart();
  updateTotal();
  loadComponents();
}

function removeFromCart(componentId) {
  selectedComponents = selectedComponents.filter((c) => c.id !== componentId);
  updateCart();
  updateTotal();
  loadComponents();
}

function updateCart() {
  const cartEl = document.getElementById("selectedComponents");
  if (!cartEl) return;

  if (selectedComponents.length === 0) {
    cartEl.innerHTML =
      '<div class="empty-message">Нет выбранных компонентов</div>';
  } else {
    cartEl.innerHTML = selectedComponents
      .map(
        (comp) => `
            <div class="selected-item">
                <div>
                    <h4>${comp.name}</h4>
                    <p>${new Intl.NumberFormat("ru-RU").format(comp.price)} ₽</p>
                    <div style="display: flex; gap: 10px; margin-top: 5px;">
                        <button onclick="changeQuantity(${comp.id}, -1)" class="btn-secondary btn-small">-</button>
                        <span>${comp.quantity || 1}</span>
                        <button onclick="changeQuantity(${comp.id}, 1)" class="btn-secondary btn-small">+</button>
                    </div>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${comp.id})">×</button>
            </div>
        `,
      )
      .join("");
  }
}

function changeQuantity(componentId, delta) {
  const index = selectedComponents.findIndex((c) => c.id === componentId);
  if (index !== -1) {
    const newQuantity = (selectedComponents[index].quantity || 1) + delta;
    if (newQuantity > 0) {
      selectedComponents[index].quantity = newQuantity;
      updateCart();
      updateTotal();
    }
  }
}

async function loadServices() {
  try {
    const response = await fetch(`${API_BASE_URL}/services`);
    allServices = await response.json();

    const servicesList = document.getElementById("servicesList");
    if (!servicesList) return;

    if (allServices.length === 0) {
      servicesList.innerHTML = '<div class="empty-message">Нет услуг</div>';
    } else {
      servicesList.innerHTML = allServices
        .map(
          (serv) => `
                <div class="service-item">
                    <label>
                        <input type="checkbox" class="service-checkbox" value="${serv.id}" 
                               onchange="toggleService(${serv.id}, ${serv.price}, '${serv.name}')">
                        ${serv.name} (${new Intl.NumberFormat("ru-RU").format(serv.price)} ₽)
                    </label>
                </div>
            `,
        )
        .join("");
    }
  } catch (error) {
    console.error("Ошибка загрузки услуг:", error);
  }
}

function toggleService(serviceId, price, name) {
  const checkbox = event.target;

  if (checkbox.checked) {
    selectedServices.push({ id: serviceId, name, price });
    showNotification(`Услуга "${name}" добавлена`, "success");
  } else {
    selectedServices = selectedServices.filter((s) => s.id !== serviceId);
    showNotification(`Услуга "${name}" удалена`, "info");
  }
  updateTotal();
}

function filterCatalog() {
  const searchTerm = document
    .getElementById("catalogSearch")
    ?.value.toLowerCase();
  const categoryId = document.getElementById("catalogCategory")?.value;

  let filtered = allComponents;

  if (categoryId) {
    filtered = filtered.filter((c) => c.category_id == categoryId);
  }

  if (searchTerm) {
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm) ||
        c.description?.toLowerCase().includes(searchTerm) ||
        c.manufacturer?.toLowerCase().includes(searchTerm),
    );
  }

  const catalogGrid = document.getElementById("catalogGrid");
  if (!catalogGrid) return;

  if (filtered.length === 0) {
    catalogGrid.innerHTML =
      '<div class="empty-message">Ничего не найдено</div>';
  } else {
    catalogGrid.innerHTML = filtered
      .map(
        (comp) => `
            <div class="component-card">
                <h4>${comp.name}</h4>
                <p>${comp.description || ""}</p>
                <p><strong>Производитель:</strong> ${comp.manufacturer || "Не указан"}</p>
                <div class="price">${new Intl.NumberFormat("ru-RU").format(comp.price)} ₽</div>
                <button class="btn-secondary" onclick="addToCart(${comp.id})">
                    <i class="fas fa-cart-plus"></i> Добавить
                </button>
            </div>
        `,
      )
      .join("");
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `<i class="fas fa-${
    type === "success"
      ? "check-circle"
      : type === "error"
        ? "exclamation-circle"
        : type === "warning"
          ? "exclamation-triangle"
          : "info-circle"
  }"></i> ${message}`;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}


window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.closeModal = closeModal;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.login = login;
window.register = register;
window.logout = logout;
window.selectCategory = selectCategory;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.changeQuantity = changeQuantity;
window.toggleService = toggleService;
window.showOrderForm = showOrderForm;
window.submitOrder = submitOrder;
window.toggleDeliveryAddress = toggleDeliveryAddress;
window.checkConnection = checkConnection;
window.filterCatalog = filterCatalog;
window.goToMyOrders = goToMyOrders;
window.closeSuccessNotification = closeSuccessNotification;
