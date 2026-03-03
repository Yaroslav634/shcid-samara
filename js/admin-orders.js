const API_BASE_URL = window.location.origin.includes("localhost")
  ? `http://localhost:${window.location.port || 3001}/api`
  : "/api";

let currentUser = null;
let orders = [];
let filteredOrders = [];
let currentOrderId = null;
let currentOrderNumber = "";
let currentOrderData = null;

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  await loadOrders();
});

async function checkAuth() {
  try {
    const response = await fetch(`${API_BASE_URL}/me`, {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success && data.authenticated) {
      currentUser = data.user;
      if (currentUser.role !== "admin" && currentUser.role !== "manager") {
        window.location.href = "/";
      } else {
        document.getElementById("userName").textContent = currentUser.full_name;
        document.getElementById("userRole").textContent =
          currentUser.role === "admin" ? "Админ" : "Менеджер";
      }
    } else {
      window.location.href = "/";
    }
  } catch (error) {
    window.location.href = "/";
  }
}

async function loadOrders() {
  showLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/my-orders`, {
      credentials: "include",
    });
    orders = await response.json();
    filteredOrders = [...orders];
    renderOrders();
    updateStats();
  } catch (error) {
    showNotification("Ошибка загрузки заказов", "error");
  } finally {
    showLoading(false);
  }
}

function renderOrders() {
  const tbody = document.getElementById("ordersTableBody");

  if (filteredOrders.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">Заказы не найдены</td></tr>';
    document.getElementById("ordersCount").textContent = "Найдено: 0";
    return;
  }

  tbody.innerHTML = filteredOrders
    .map((order) => {
      const statusClass = getStatusClass(order.status);
      const statusText = getStatusText(order.status);
      const total = order.final_amount || order.total_amount || 0;

      return `
            <tr>
                <td><strong>${order.order_number}</strong></td>
                <td>${order.customer_name}<br><small>${order.customer_phone || ""}</small></td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td><span class="status-badge ${statusClass}" onclick="openStatusModal('${order.id}', '${order.status}', '${order.order_number}')">${statusText}</span></td>
                <td><strong>${new Intl.NumberFormat("ru-RU").format(total)} ₽</strong></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewOrder('${order.id}')"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" onclick="editOrder('${order.id}')"><i class="fas fa-edit"></i></button>
                        <button class="action-btn status" onclick="openStatusModal('${order.id}', '${order.status}', '${order.order_number}')"><i class="fas fa-sync-alt"></i></button>
                        <button class="action-btn cancel" onclick="openCancelModal('${order.id}', '${order.order_number}')"><i class="fas fa-times"></i></button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");

  document.getElementById("ordersCount").textContent =
    `Найдено: ${filteredOrders.length}`;
}

function getStatusClass(status) {
  const map = {
    new: "status-new",
    processing: "status-processing",
    confirmed: "status-confirmed",
    manufacturing: "status-manufacturing",
    ready: "status-ready",
    delivered: "status-delivered",
    completed: "status-completed",
    cancelled: "status-cancelled",
  };
  return map[status] || "status-new";
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

function updateStats() {
  const total = orders.length;
  const newOrders = orders.filter((o) => o.status === "new").length;
  const processing = orders.filter((o) =>
    ["processing", "confirmed", "manufacturing", "ready", "delivered"].includes(
      o.status,
    ),
  ).length;
  const completed = orders.filter((o) => o.status === "completed").length;

  document.getElementById("totalOrders").textContent = total;
  document.getElementById("newOrders").textContent = newOrders;
  document.getElementById("processingOrders").textContent = processing;
  document.getElementById("completedOrders").textContent = completed;
}

function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const dateFrom = document.getElementById("dateFrom").value;
  const dateTo = document.getElementById("dateTo").value;

  filteredOrders = orders.filter((order) => {
    if (
      search &&
      !`${order.order_number} ${order.customer_name} ${order.customer_phone || ""}`
        .toLowerCase()
        .includes(search)
    )
      return false;
    if (status !== "all" && order.status !== status) return false;
    if (
      dateFrom &&
      new Date(order.created_at).toISOString().split("T")[0] < dateFrom
    )
      return false;
    if (
      dateTo &&
      new Date(order.created_at).toISOString().split("T")[0] > dateTo
    )
      return false;
    return true;
  });

  renderOrders();
  showNotification("Фильтры применены", "success");
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("statusFilter").value = "all";
  document.getElementById("dateFrom").value = "";
  document.getElementById("dateTo").value = "";
  filteredOrders = [...orders];
  renderOrders();
  showNotification("Фильтры сброшены", "info");
}

async function viewOrder(id) {
  currentOrderId = id;
  showLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      currentOrderData = data;
      currentOrderNumber = data.order.order_number;
      displayOrderDetails(data);
      document.getElementById("viewOrderModal").style.display = "flex";
    } else {
      showNotification("Ошибка загрузки", "error");
    }
  } catch (error) {
    showNotification("Ошибка при загрузке", "error");
  } finally {
    showLoading(false);
  }
}

function displayOrderDetails(data) {
  const order = data.order;
  const components = data.components || [];
  const services = data.services || [];

  document.getElementById("viewOrderNumber").textContent = order.order_number;

  let html = `
        <div class="order-details">
            <h3>Клиент</h3>
            <div class="detail-row"><span class="detail-label">Имя:</span><span class="detail-value">${order.customer_name}</span></div>
            <div class="detail-row"><span class="detail-label">Телефон:</span><span class="detail-value">${order.customer_phone || "—"}</span></div>
            <div class="detail-row"><span class="detail-label">Email:</span><span class="detail-value">${order.customer_email || "—"}</span></div>
            <div class="detail-row"><span class="detail-label">Адрес:</span><span class="detail-value">${order.customer_address || "—"}</span></div>
            
            <h3 style="margin-top:20px">Детали</h3>
            <div class="detail-row"><span class="detail-label">Дата:</span><span class="detail-value">${new Date(order.created_at).toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">Статус:</span><span class="detail-value"><span class="status-badge ${getStatusClass(order.status)}">${getStatusText(order.status)}</span></span></div>
            <div class="detail-row"><span class="detail-label">Доставка:</span><span class="detail-value">${order.delivery_method === "pickup" ? "Самовывоз" : "Доставка"}</span></div>
            <div class="detail-row"><span class="detail-label">Оплата:</span><span class="detail-value">${order.payment_method === "cash" ? "Наличные" : order.payment_method === "card" ? "Карта" : "По счету"}</span></div>
            
            <h3 style="margin-top:20px">Состав</h3>
            <table class="items-table">
                <thead><tr><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
                <tbody>
    `;

  let total = 0;
  components.forEach((item) => {
    const sum = item.total_price || item.unit_price * item.quantity;
    total += sum;
    html += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${new Intl.NumberFormat("ru-RU").format(item.unit_price)} ₽</td><td>${new Intl.NumberFormat("ru-RU").format(sum)} ₽</td></tr>`;
  });

  if (services.length) {
    html += `<tr><td colspan="4" style="background:var(--bg-panel)"><strong>Услуги:</strong></td></tr>`;
    services.forEach((service) => {
      total += service.total_price || service.unit_price;
      html += `<tr><td>${service.name}</td><td>1</td><td>${new Intl.NumberFormat("ru-RU").format(service.unit_price)} ₽</td><td>${new Intl.NumberFormat("ru-RU").format(service.total_price || service.unit_price)} ₽</td></tr>`;
    });
  }

  html += `
                </tbody>
                <tfoot><tr class="total-row"><td colspan="3" style="text-align:right"><strong>Итого:</strong></td><td><strong>${new Intl.NumberFormat("ru-RU").format(total)} ₽</strong></td></tr></tfoot>
            </table>
    `;

  if (order.comments)
    html += `<h3 style="margin-top:20px">Комментарий</h3><div class="comment-box">${order.comments}</div>`;
  if (order.manager_comments)
    html += `<h3 style="margin-top:20px">Комментарий менеджера</h3><div class="comment-box" style="border-left-color:var(--warning-color)">${order.manager_comments}</div>`;

  html += `</div>`;
  document.getElementById("viewOrderContent").innerHTML = html;
}

function switchToEditMode() {
  closeViewModal();
  loadOrderForEdit(currentOrderId);
}

async function loadOrderForEdit(id) {
  showLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      const order = data.order;
      document.getElementById("editOrderNumber").textContent =
        order.order_number;
      document.getElementById("editCustomerName").value =
        order.customer_name || "";
      document.getElementById("editCustomerPhone").value =
        order.customer_phone || "";
      document.getElementById("editCustomerEmail").value =
        order.customer_email || "";
      document.getElementById("editCustomerAddress").value =
        order.customer_address || "";
      document.getElementById("editDeliveryMethod").value =
        order.delivery_method || "pickup";
      document.getElementById("editDeliveryAddress").value =
        order.delivery_address || "";
      document.getElementById("editPaymentMethod").value =
        order.payment_method || "cash";
      document.getElementById("editStatus").value = order.status || "new";
      document.getElementById("editComments").value = order.comments || "";
      document.getElementById("editManagerComments").value =
        order.manager_comments || "";
      document.getElementById("editOrderModal").style.display = "flex";
    } else {
      showNotification("Ошибка загрузки", "error");
    }
  } catch (error) {
    showNotification("Ошибка при загрузке", "error");
  } finally {
    showLoading(false);
  }
}

async function saveOrderChanges() {
  const updatedData = {
    customer_name: document.getElementById("editCustomerName").value,
    customer_phone: document.getElementById("editCustomerPhone").value || null,
    customer_email: document.getElementById("editCustomerEmail").value || null,
    customer_address:
      document.getElementById("editCustomerAddress").value || null,
    delivery_method: document.getElementById("editDeliveryMethod").value,
    delivery_address:
      document.getElementById("editDeliveryAddress").value || null,
    payment_method: document.getElementById("editPaymentMethod").value,
    status: document.getElementById("editStatus").value,
    comments: document.getElementById("editComments").value || null,
    manager_comments:
      document.getElementById("editManagerComments").value || null,
  };

  if (!updatedData.customer_name) {
    showNotification("Имя клиента обязательно", "warning");
    return;
  }

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${currentOrderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updatedData),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Заказ обновлен", "success");
      closeEditModal();
      await loadOrders();
    } else {
      showNotification("Ошибка: " + data.message, "error");
    }
  } catch (error) {
    showNotification("Ошибка при обновлении", "error");
  } finally {
    showLoading(false);
  }
}

function editOrder(id) {
  loadOrderForEdit(id);
}

function openStatusModal(id, status, orderNumber) {
  currentOrderId = id;
  document.getElementById("statusOrderNumber").textContent = orderNumber;
  document.getElementById("currentStatusDisplay").className =
    `status-badge ${getStatusClass(status)}`;
  document.getElementById("currentStatusDisplay").innerHTML =
    getStatusText(status);
  document.getElementById("newStatus").value = status;
  document.getElementById("statusComment").value = "";
  document.getElementById("statusModal").style.display = "flex";
}

async function saveStatusChange() {
  const newStatus = document.getElementById("newStatus").value;
  const comment = document.getElementById("statusComment").value;

  if (!newStatus) {
    showNotification("Выберите статус", "warning");
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
      showNotification("Статус обновлен", "success");
      closeStatusModal();
      await loadOrders();
    } else {
      showNotification("Ошибка: " + data.message, "error");
    }
  } catch (error) {
    showNotification("Ошибка при обновлении", "error");
  } finally {
    showLoading(false);
  }
}

function closeStatusModal() {
  document.getElementById("statusModal").style.display = "none";
}

function openCancelModal(id, orderNumber) {
  currentOrderId = id;
  currentOrderNumber = orderNumber;
  document.getElementById("cancelOrderNumber").textContent = orderNumber;
  document.getElementById("cancelReason").value = "";
  document.getElementById("cancelOrderModal").style.display = "flex";
}

function closeCancelModal() {
  document.getElementById("cancelOrderModal").style.display = "none";
}

async function confirmCancelOrder() {
  const reason = document.getElementById("cancelReason").value;

  showLoading(true);
  try {
    const response = await fetch(
      `${API_BASE_URL}/orders/${currentOrderId}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: "cancelled",
          comment: reason || "Заказ отменен",
        }),
      },
    );

    const data = await response.json();

    if (data.success) {
      showNotification(`Заказ ${currentOrderNumber} отменен`, "success");
      closeCancelModal();
      closeViewModal();
      await loadOrders();
    } else {
      showNotification("Ошибка: " + data.message, "error");
    }
  } catch (error) {
    showNotification("Ошибка при отмене", "error");
  } finally {
    showLoading(false);
  }
}

function closeViewModal() {
  document.getElementById("viewOrderModal").style.display = "none";
}

function closeEditModal() {
  document.getElementById("editOrderModal").style.display = "none";
}

function switchToViewMode() {
  closeEditModal();
  viewOrder(currentOrderId);
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

function showLoading(show) {
  const loading = document.getElementById("loading");
  if (loading) loading.style.display = show ? "flex" : "none";
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

window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.viewOrder = viewOrder;
window.switchToEditMode = switchToEditMode;
window.editOrder = editOrder;
window.switchToViewMode = switchToViewMode;
window.saveOrderChanges = saveOrderChanges;
window.openStatusModal = openStatusModal;
window.saveStatusChange = saveStatusChange;
window.closeStatusModal = closeStatusModal;
window.openCancelModal = openCancelModal;
window.confirmCancelOrder = confirmCancelOrder;
window.closeCancelModal = closeCancelModal;
window.closeViewModal = closeViewModal;
window.closeEditModal = closeEditModal;
window.logout = logout;
