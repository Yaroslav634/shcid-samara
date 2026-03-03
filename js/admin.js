// admin.js
const API_BASE_URL = window.location.origin.includes("localhost")
  ? `http://localhost:${window.location.port || 3001}/api`
  : "/api";

let currentUser = null;
let currentDeleteType = null;
let currentDeleteId = null;
let currentOrderId = null;

function showLoading(show) {
  const loading = document.getElementById("loading");
  if (loading) loading.style.display = show ? "flex" : "none";
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Страница загружена, проверяем авторизацию...");
  showLoading(true);
  await checkAuth();
  showLoading(false);
});

async function checkAuth() {
  try {
    console.log("Проверка авторизации...");
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ошибка ${response.status}`);
    }

    const data = await response.json();
    console.log("Ответ от /api/me:", data);

    if (data.success && data.authenticated) {
      currentUser = data.user;
      console.log("Пользователь:", currentUser);

      if (currentUser.role === "admin") {
        document.getElementById("adminContent").style.display = "block";
        document.getElementById("accessDenied").style.display = "none";
        document.getElementById("userName").textContent =
          currentUser.full_name || currentUser.username;
        document.getElementById("userRole").textContent = "Администратор";

        loadStats();
        loadOrders();
        loadComponents();
        loadCategories();
        loadUsers();

        document
          .getElementById("addComponentForm")
          ?.addEventListener("submit", async (e) => {
            e.preventDefault();
            await addComponent();
          });

        document
          .getElementById("addCategoryForm")
          ?.addEventListener("submit", async (e) => {
            e.preventDefault();
            await addCategory();
          });

        document
          .getElementById("editComponentForm")
          ?.addEventListener("submit", async (e) => {
            e.preventDefault();
            await updateComponent();
          });

        document
          .getElementById("editCategoryForm")
          ?.addEventListener("submit", async (e) => {
            e.preventDefault();
            await updateCategory();
          });

        document
          .getElementById("searchOrders")
          ?.addEventListener("input", filterOrders);
        document
          .getElementById("searchComponents")
          ?.addEventListener("input", filterComponents);
        document
          .getElementById("searchCategories")
          ?.addEventListener("input", filterCategories);
        document
          .getElementById("searchUsers")
          ?.addEventListener("input", filterUsers);

        return true;
      } else {
        document.getElementById("adminContent").style.display = "none";
        document.getElementById("accessDenied").style.display = "block";
        document.getElementById("accessDeniedMessage").textContent =
          `У вас права ${currentUser.role}. Для доступа нужны права администратора.`;
        setTimeout(() => (window.location.href = "/"), 3000);
        return false;
      }
    } else {
      console.log("Не авторизован, перенаправление...");
      window.location.href = "/";
      return false;
    }
  } catch (error) {
    console.error("❌ Ошибка авторизации:", error);
    document.getElementById("adminContent").style.display = "none";
    document.getElementById("accessDenied").style.display = "block";
    document.getElementById("accessDeniedMessage").textContent =
      "Ошибка подключения к серверу. Проверьте соединение.";
    setTimeout(() => (window.location.href = "/"), 3000);
    return false;
  }
}

async function logout() {
  showLoading(true);
  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/";
  } catch (error) {
    showNotification("Ошибка при выходе", "error");
  } finally {
    showLoading(false);
  }
}

function showTab(tabName) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
  event.target.classList.add("active");
  document.getElementById(`tab-${tabName}`).classList.add("active");
}

async function loadStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`, {
      credentials: "include",
    });
    const stats = await response.json();

    document.getElementById("totalOrders").textContent = stats.totalOrders || 0;
    document.getElementById("newOrders").textContent = stats.newOrders || 0;
    document.getElementById("totalComponents").textContent =
      stats.totalComponents || 0;
    document.getElementById("totalCategories").textContent =
      stats.totalCategories || 0;
  } catch (error) {
    console.error("Ошибка статистики:", error);
  }
}

async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      credentials: "include",
    });
    const categories = await response.json();

    const tbody = document.getElementById("categoriesTable");
    if (tbody) {
      if (categories.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="4" class="empty-message">Нет категорий</td></tr>';
      } else {
        tbody.innerHTML = categories
          .map(
            (cat) => `
                    <tr>
                        <td><strong>${cat.id}</strong></td>
                        <td>${cat.name}</td>
                        <td>${cat.description || "—"}</td>
                        <td>
                            <div class="action-buttons">
                                <button onclick="editCategory(${cat.id})" class="action-btn edit" title="Редактировать">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="confirmDeleteCategory(${cat.id}, '${cat.name}')" class="action-btn delete" title="Удалить">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `,
          )
          .join("");
      }
    }

    await loadCategoriesSelect();
    await loadEditCategoriesSelect();
  } catch (error) {
    console.error("Ошибка загрузки категорий:", error);
  }
}

async function loadCategoriesSelect() {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      credentials: "include",
    });
    const categories = await response.json();

    const select = document.getElementById("compCategory");
    if (select) {
      select.innerHTML =
        '<option value="">Без категории</option>' +
        categories
          .map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
          .join("");
    }
  } catch (error) {
    console.error("Ошибка загрузки категорий:", error);
  }
}

async function loadEditCategoriesSelect() {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      credentials: "include",
    });
    const categories = await response.json();

    const select = document.getElementById("editCompCategory");
    if (select) {
      select.innerHTML =
        '<option value="">Без категории</option>' +
        categories
          .map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
          .join("");
    }
  } catch (error) {
    console.error("Ошибка загрузки категорий:", error);
  }
}

async function addCategory() {
  const name = document.getElementById("catName")?.value.trim();
  const description = document.getElementById("catDescription")?.value.trim();

  if (!name) {
    showNotification("Введите название категории", "warning");
    return;
  }

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, description }),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Категория добавлена", "success");
      document.getElementById("addCategoryForm")?.reset();
      loadCategories();
      loadStats();
    } else {
      showNotification(
        "Ошибка: " + (data.message || "Неизвестная ошибка"),
        "error",
      );
    }
  } catch (error) {
    showNotification("Ошибка при добавлении", "error");
  } finally {
    showLoading(false);
  }
}

async function editCategory(id) {
  try {
    showLoading(true);
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      document.getElementById("editCatId").value = data.category.id;
      document.getElementById("editCatName").value = data.category.name;
      document.getElementById("editCatDescription").value =
        data.category.description || "";
      document.getElementById("editCategoryModal").style.display = "flex";
    } else {
      showNotification("Ошибка загрузки категории", "error");
    }
  } catch (error) {
    showNotification("Ошибка при загрузке", "error");
  } finally {
    showLoading(false);
  }
}

async function updateCategory() {
  const id = document.getElementById("editCatId")?.value;
  const name = document.getElementById("editCatName")?.value.trim();
  const description = document
    .getElementById("editCatDescription")
    ?.value.trim();

  if (!name) {
    showNotification("Введите название категории", "warning");
    return;
  }

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, description }),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Категория обновлена", "success");
      closeEditCategoryModal();
      loadCategories();
    } else {
      showNotification(
        "Ошибка: " + (data.message || "Неизвестная ошибка"),
        "error",
      );
    }
  } catch (error) {
    showNotification("Ошибка при обновлении", "error");
  } finally {
    showLoading(false);
  }
}

async function loadComponents() {
  try {
    const response = await fetch(`${API_BASE_URL}/components`, {
      credentials: "include",
    });
    const components = await response.json();

    const tbody = document.getElementById("componentsTable");
    if (tbody) {
      if (components.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="empty-message">Нет компонентов</td></tr>';
      } else {
        tbody.innerHTML = components
          .map(
            (comp) => `
                    <tr>
                        <td><strong>${comp.id}</strong></td>
                        <td>
                            <strong>${comp.name}</strong><br>
                            <small style="color: var(--text-muted);">${comp.manufacturer || ""}</small>
                        </td>
                        <td><strong>${new Intl.NumberFormat("ru-RU").format(comp.price)} ₽</strong></td>
                        <td>${comp.category_name || "Без категории"}</td>
                        <td>
                            <span class="stock-status ${comp.in_stock ? "stock-in" : "stock-out"}">
                                <i class="fas fa-${comp.in_stock ? "check-circle" : "times-circle"}"></i>
                                ${comp.in_stock ? "В наличии" : "Нет в наличии"}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button onclick="editComponent(${comp.id})" class="action-btn edit" title="Редактировать">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="confirmDeleteComponent(${comp.id}, '${comp.name}')" class="action-btn delete" title="Удалить">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `,
          )
          .join("");
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки компонентов:", error);
  }
}

async function addComponent() {
  const name = document.getElementById("compName")?.value.trim();
  const price = parseFloat(document.getElementById("compPrice")?.value);

  if (!name) {
    showNotification("Введите название компонента", "warning");
    return;
  }

  if (!price || price <= 0) {
    showNotification("Введите корректную цену", "warning");
    return;
  }

  const componentData = {
    name: name,
    description:
      document.getElementById("compDescription")?.value.trim() || null,
    price: price,
    category_id: document.getElementById("compCategory")?.value || null,
    manufacturer:
      document.getElementById("compManufacturer")?.value.trim() || null,
    power_rating: document.getElementById("compPower")?.value.trim() || null,
    voltage: document.getElementById("compVoltage")?.value.trim() || null,
    in_stock: document.getElementById("compInStock")?.checked || true,
  };

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/components`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(componentData),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Компонент добавлен", "success");
      document.getElementById("addComponentForm")?.reset();
      document.getElementById("compInStock").checked = true;
      loadComponents();
      loadStats();
    } else {
      showNotification(
        "Ошибка: " + (data.message || "Неизвестная ошибка"),
        "error",
      );
    }
  } catch (error) {
    showNotification("Ошибка при добавлении", "error");
  } finally {
    showLoading(false);
  }
}

async function editComponent(id) {
  try {
    showLoading(true);
    const response = await fetch(`${API_BASE_URL}/components/${id}`, {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      const comp = data.component;
      document.getElementById("editCompId").value = comp.id;
      document.getElementById("editCompName").value = comp.name;
      document.getElementById("editCompDescription").value =
        comp.description || "";
      document.getElementById("editCompPrice").value = comp.price;
      document.getElementById("editCompManufacturer").value =
        comp.manufacturer || "";
      document.getElementById("editCompPower").value = comp.power_rating || "";
      document.getElementById("editCompVoltage").value = comp.voltage || "";
      document.getElementById("editCompInStock").checked = comp.in_stock;
      if (comp.category_id) {
        document.getElementById("editCompCategory").value = comp.category_id;
      }
      document.getElementById("editComponentModal").style.display = "flex";
    } else {
      showNotification("Ошибка загрузки компонента", "error");
    }
  } catch (error) {
    showNotification("Ошибка при загрузке", "error");
  } finally {
    showLoading(false);
  }
}

async function updateComponent() {
  const id = document.getElementById("editCompId")?.value;
  const name = document.getElementById("editCompName")?.value.trim();
  const price = parseFloat(document.getElementById("editCompPrice")?.value);

  if (!name) {
    showNotification("Введите название компонента", "warning");
    return;
  }

  if (!price || price <= 0) {
    showNotification("Введите корректную цену", "warning");
    return;
  }

  const componentData = {
    name: name,
    description:
      document.getElementById("editCompDescription")?.value.trim() || null,
    price: price,
    category_id: document.getElementById("editCompCategory")?.value || null,
    manufacturer:
      document.getElementById("editCompManufacturer")?.value.trim() || null,
    power_rating:
      document.getElementById("editCompPower")?.value.trim() || null,
    voltage: document.getElementById("editCompVoltage")?.value.trim() || null,
    in_stock: document.getElementById("editCompInStock")?.checked || false,
  };

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/components/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(componentData),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Компонент обновлен", "success");
      closeEditComponentModal();
      loadComponents();
    } else {
      showNotification(
        "Ошибка: " + (data.message || "Неизвестная ошибка"),
        "error",
      );
    }
  } catch (error) {
    showNotification("Ошибка при обновлении", "error");
  } finally {
    showLoading(false);
  }
}

function confirmDeleteCategory(id, name) {
  currentDeleteType = "category";
  currentDeleteId = id;
  document.getElementById("deleteMessage").textContent =
    `Удалить категорию "${name}"?`;
  document.getElementById("deleteConfirmModal").style.display = "flex";
}

function confirmDeleteComponent(id, name) {
  currentDeleteType = "component";
  currentDeleteId = id;
  document.getElementById("deleteMessage").textContent =
    `Удалить компонент "${name}"?`;
  document.getElementById("deleteConfirmModal").style.display = "flex";
}

document.getElementById("confirmDeleteBtn").onclick = function () {
  if (currentDeleteType === "category") deleteCategory(currentDeleteId);
  else if (currentDeleteType === "component") deleteComponent(currentDeleteId);
};

async function deleteCategory(id) {
  showLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      showNotification("Категория удалена", "success");
      closeDeleteModal();
      loadCategories();
      loadStats();
    } else {
      showNotification(
        "Ошибка: " + (data.message || "Неизвестная ошибка"),
        "error",
      );
    }
  } catch (error) {
    showNotification("Ошибка при удалении", "error");
  } finally {
    showLoading(false);
  }
}

async function deleteComponent(id) {
  showLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/components/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      showNotification("Компонент удален", "success");
      closeDeleteModal();
      loadComponents();
      loadStats();
    } else {
      showNotification(
        "Ошибка: " + (data.message || "Неизвестная ошибка"),
        "error",
      );
    }
  } catch (error) {
    showNotification("Ошибка при удалении", "error");
  } finally {
    showLoading(false);
  }
}

function closeDeleteModal() {
  document.getElementById("deleteConfirmModal").style.display = "none";
  currentDeleteType = null;
  currentDeleteId = null;
}

function closeEditComponentModal() {
  document.getElementById("editComponentModal").style.display = "none";
}

function closeEditCategoryModal() {
  document.getElementById("editCategoryModal").style.display = "none";
}

function closeStatusModal() {
  document.getElementById("statusModal").style.display = "none";
}

async function loadOrders() {
  try {
    const response = await fetch(`${API_BASE_URL}/my-orders`, {
      credentials: "include",
    });
    const orders = await response.json();

    const tbody = document.getElementById("ordersTable");
    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="empty-message">Нет заказов</td></tr>';
      return;
    }

    tbody.innerHTML = orders
      .map((order) => {
        const total = order.final_amount || order.total_amount || 0;
        let statusClass = "status-new";
        let statusText = "Новый";

        if (
          order.status === "processing" ||
          order.status === "confirmed" ||
          order.status === "manufacturing" ||
          order.status === "ready" ||
          order.status === "delivered"
        ) {
          statusClass = "status-processing";
          statusText =
            order.status === "processing"
              ? "В обработке"
              : order.status === "confirmed"
                ? "Подтвержден"
                : order.status === "manufacturing"
                  ? "В производстве"
                  : order.status === "ready"
                    ? "Готов"
                    : "Доставлен";
        } else if (order.status === "completed") {
          statusClass = "status-completed";
          statusText = "Выполнен";
        } else if (order.status === "cancelled") {
          statusClass = "status-cancelled";
          statusText = "Отменен";
        }

        return `
                <tr>
                    <td><strong>${order.order_number || order.id}</strong></td>
                    <td>
                        ${order.customer_name}<br>
                        <small>${order.customer_phone || ""}</small>
                    </td>
                    <td>${order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}</td>
                    <td>
                        <span class="status-badge ${statusClass}" 
                              onclick="openStatusModal('${order.id}', '${order.status}', '${order.order_number}')"
                              title="Нажмите для изменения статуса">
                            ${statusText}
                        </span>
                    </td>
                    <td><strong>${new Intl.NumberFormat("ru-RU").format(total)} ₽</strong></td>
                    <td>
                        <div class="action-buttons">
                            <button onclick="viewOrder(${order.id})" class="action-btn view" title="Просмотр">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="openStatusModal('${order.id}', '${order.status}', '${order.order_number}')" class="action-btn status" title="Изменить статус">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
      })
      .join("");
  } catch (error) {
    console.error("Ошибка загрузки заказов:", error);
  }
}

function viewOrder(id) {
  window.location.href = `/orders.html?id=${id}`;
}

function openStatusModal(id, status, orderNumber) {
  currentOrderId = id;
  document.getElementById("statusOrderNumber").textContent = orderNumber;
  document.getElementById("currentStatusDisplay").textContent =
    getStatusText(status);
  document.getElementById("newStatus").value = status;
  document.getElementById("statusComment").value = "";
  document.getElementById("statusModal").style.display = "flex";
}

function getStatusText(status) {
  const map = {
    new: "Новый",
    processing: "В обработке",
    confirmed: "Подтвержден",
    manufacturing: "В производстве",
    ready: "Готов",
    delivered: "Доставлен",
    completed: "Выполнен",
    cancelled: "Отменен",
  };
  return map[status] || status;
}

async function saveStatusChange() {
  const newStatus = document.getElementById("newStatus").value;
  const comment = document.getElementById("statusComment").value;

  if (!newStatus) {
    showNotification("Выберите новый статус", "warning");
    return;
  }

  showLoading(true);
  try {
    const response = await fetch(
      `${API_BASE_URL}/orders/${currentOrderId}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus, comment }),
      },
    );

    const data = await response.json();

    if (data.success) {
      showNotification(`Статус заказа изменен`, "success");
      closeStatusModal();
      await loadOrders();
    } else {
      showNotification(
        "Ошибка: " + (data.message || "Неизвестная ошибка"),
        "error",
      );
    }
  } catch (error) {
    console.error("Ошибка при обновлении статуса:", error);
    showNotification("Ошибка при обновлении статуса", "error");
  } finally {
    showLoading(false);
  }
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      credentials: "include",
    });
    const users = await response.json();

    const tbody = document.getElementById("usersTable");
    if (!tbody) return;

    if (users.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-message">Нет пользователей</td></tr>';
    } else {
      tbody.innerHTML = users
        .map(
          (user) => `
                <tr>
                    <td><strong>${user.id}</strong></td>
                    <td>${user.username}</td>
                    <td>${user.full_name || "—"}</td>
                    <td>${user.email || "—"}</td>
                    <td>
                        <span class="role-badge" style="background: ${user.role === "admin" ? "#e74c3c" : user.role === "manager" ? "#f39c12" : "#3498db"}; color: white;">
                            ${user.role === "admin" ? "Админ" : user.role === "manager" ? "Менеджер" : "Пользователь"}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${user.is_active ? "status-completed" : "status-cancelled"}">
                            <i class="fas fa-${user.is_active ? "check" : "times"}"></i>
                            ${user.is_active ? "Активен" : "Заблокирован"}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button onclick="toggleUserStatus(${user.id})" class="action-btn edit" title="Изменить статус">
                                <i class="fas fa-ban"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `,
        )
        .join("");
    }
  } catch (error) {
    console.error("Ошибка загрузки пользователей:", error);
  }
}

async function toggleUserStatus(id) {
  showLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/users/${id}/toggle`, {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      showNotification("Статус пользователя изменен", "success");
      loadUsers();
    } else {
      showNotification(
        "Ошибка: " + (data.message || "Неизвестная ошибка"),
        "error",
      );
    }
  } catch (error) {
    showNotification("Ошибка при изменении статуса", "error");
  } finally {
    showLoading(false);
  }
}

function filterOrders() {
  const search = document.getElementById("searchOrders")?.value.toLowerCase();
  if (!search) {
    document
      .querySelectorAll("#ordersTable tr")
      .forEach((row) => (row.style.display = ""));
    return;
  }
  document.querySelectorAll("#ordersTable tr").forEach((row) => {
    if (row.cells?.length) {
      row.style.display = row.textContent.toLowerCase().includes(search)
        ? ""
        : "none";
    }
  });
}

function filterComponents() {
  const search = document
    .getElementById("searchComponents")
    ?.value.toLowerCase();
  if (!search) {
    document
      .querySelectorAll("#componentsTable tr")
      .forEach((row) => (row.style.display = ""));
    return;
  }
  document.querySelectorAll("#componentsTable tr").forEach((row) => {
    if (row.cells?.length) {
      row.style.display = row.textContent.toLowerCase().includes(search)
        ? ""
        : "none";
    }
  });
}

function filterCategories() {
  const search = document
    .getElementById("searchCategories")
    ?.value.toLowerCase();
  if (!search) {
    document
      .querySelectorAll("#categoriesTable tr")
      .forEach((row) => (row.style.display = ""));
    return;
  }
  document.querySelectorAll("#categoriesTable tr").forEach((row) => {
    if (row.cells?.length) {
      row.style.display = row.textContent.toLowerCase().includes(search)
        ? ""
        : "none";
    }
  });
}

function filterUsers() {
  const search = document.getElementById("searchUsers")?.value.toLowerCase();
  if (!search) {
    document
      .querySelectorAll("#usersTable tr")
      .forEach((row) => (row.style.display = ""));
    return;
  }
  document.querySelectorAll("#usersTable tr").forEach((row) => {
    if (row.cells?.length) {
      row.style.display = row.textContent.toLowerCase().includes(search)
        ? ""
        : "none";
    }
  });
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


const themeToggle = document.getElementById("theme-toggle");
if (themeToggle) {
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


window.logout = logout;
window.showTab = showTab;
window.viewOrder = viewOrder;
window.openStatusModal = openStatusModal;
window.closeStatusModal = closeStatusModal;
window.saveStatusChange = saveStatusChange;
window.editCategory = editCategory;
window.editComponent = editComponent;
window.toggleUserStatus = toggleUserStatus;
window.confirmDeleteCategory = confirmDeleteCategory;
window.confirmDeleteComponent = confirmDeleteComponent;
window.closeDeleteModal = closeDeleteModal;
window.closeEditComponentModal = closeEditComponentModal;
window.closeEditCategoryModal = closeEditCategoryModal;
