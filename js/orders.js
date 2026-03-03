const API_BASE_URL = window.location.origin.includes("localhost")
  ? `http://localhost:${window.location.port || 3001}/api`
  : "/api";

let currentUser = null;
let allOrders = [];

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
      const authSection = document.getElementById("authSection");
      if (authSection) {
        authSection.innerHTML = `
                    <div class="user-menu">
                        <span><i class="fas fa-user"></i> ${currentUser.full_name}</span>
                        <span class="role-badge">${currentUser.role}</span>
                        <button onclick="logout()" class="btn-secondary btn-small"><i class="fas fa-sign-out-alt"></i></button>
                    </div>
                `;
      }
    } else {
      window.location.href = "/";
    }
  } catch (error) {
    window.location.href = "/";
  }
}

async function logout() {
  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/";
  } catch (error) {
    alert("Ошибка при выходе");
  }
}

async function loadOrders() {
  try {
    const response = await fetch(`${API_BASE_URL}/my-orders`, {
      credentials: "include",
    });
    allOrders = await response.json();
    displayOrders(allOrders);
  } catch (error) {
    document.getElementById("ordersList").innerHTML =
      '<div class="empty-message">Ошибка загрузки</div>';
  }
}

function displayOrders(orders) {
  const listEl = document.getElementById("ordersList");
  if (!listEl) return;

  if (orders.length === 0) {
    listEl.innerHTML = '<div class="empty-message">Нет заказов</div>';
    return;
  }

  listEl.innerHTML = orders
    .map((order) => {
      const displayAmount = order.final_amount || order.total_amount || 0;

      return `
            <div class="request-card" data-status="${order.status}">
                <div class="request-header">
                    <span class="request-number">${order.order_number}</span>
                    <span class="status-badge ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
                </div>
                <div class="request-info">
                    <p><i class="fas fa-calendar"></i> ${new Date(order.created_at).toLocaleDateString()}</p>
                    <p><i class="fas fa-user"></i> ${order.customer_name}</p>
                    ${order.customer_phone ? `<p><i class="fas fa-phone"></i> ${order.customer_phone}</p>` : ""}
                </div>
                <div class="request-total">${new Intl.NumberFormat("ru-RU").format(displayAmount)} ₽</div>
                <div class="request-actions">
                    <button onclick="viewOrder(${order.id})" class="btn btn-primary btn-small">Подробнее</button>
                </div>
            </div>
        `;
    })
    .join("");
}

function filterOrders(status) {
  document
    .querySelectorAll(".filter-tab")
    .forEach((tab) => tab.classList.remove("active"));
  event.target.classList.add("active");

  if (status === "all") {
    displayOrders(allOrders);
  } else if (status === "processing") {
    displayOrders(
      allOrders.filter((o) =>
        [
          "processing",
          "confirmed",
          "manufacturing",
          "ready",
          "delivered",
        ].includes(o.status),
      ),
    );
  } else if (status === "completed") {
    displayOrders(allOrders.filter((o) => ["completed"].includes(o.status)));
  } else {
    displayOrders(allOrders.filter((o) => o.status === status));
  }
}

async function viewOrder(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      displayOrderDetails(data);
    } else {
      alert("Ошибка загрузки");
    }
  } catch (error) {
    alert("Ошибка загрузки");
  }
}

function displayOrderDetails(data) {
  const order = data.order;
  const components = data.components || [];
  const services = data.services || [];
  const history = data.history || [];

  const statuses = [
    "new",
    "processing",
    "confirmed",
    "manufacturing",
    "ready",
    "delivered",
    "completed",
  ];
  const currentIndex = statuses.indexOf(order.status);

  let timeline = '<div class="status-timeline">';
  statuses.forEach((s, i) => {
    timeline += `
            <div class="status-step ${i < currentIndex ? "completed" : i === currentIndex ? "active" : ""}">
                <div class="status-icon">${getStatusIcon(s)}</div>
                <div class="status-label">${getStatusText(s)}</div>
            </div>
        `;
  });
  timeline += "</div>";

  let html =
    timeline +
    `
        <div class="order-details">
            <div class="info-block">
                <h4>Клиент</h4>
                <div class="info-row"><span class="label">Имя:</span><span class="value">${order.customer_name}</span></div>
                ${order.customer_email ? `<div class="info-row"><span class="label">Email:</span><span class="value">${order.customer_email}</span></div>` : ""}
                ${order.customer_phone ? `<div class="info-row"><span class="label">Телефон:</span><span class="value">${order.customer_phone}</span></div>` : ""}
                ${order.customer_address ? `<div class="info-row"><span class="label">Адрес:</span><span class="value">${order.customer_address}</span></div>` : ""}
            </div>
            
            <div class="info-block">
                <h4>Доставка и оплата</h4>
                <div class="info-row"><span class="label">Доставка:</span><span class="value">${order.delivery_method === "pickup" ? "Самовывоз" : "Доставка"}</span></div>
                ${order.delivery_address ? `<div class="info-row"><span class="label">Адрес доставки:</span><span class="value">${order.delivery_address}</span></div>` : ""}
                <div class="info-row"><span class="label">Оплата:</span><span class="value">${order.payment_method === "cash" ? "Наличные" : order.payment_method === "card" ? "Карта" : "По счету"}</span></div>
                <div class="info-row"><span class="label">Дата:</span><span class="value">${new Date(order.created_at).toLocaleString()}</span></div>
            </div>
        </div>
    `;

  if (components.length || services.length) {
    html += '<div class="info-block"><h4>Состав заказа</h4>';
    if (components.length) {
      components.forEach((c) => {
        html += `<div class="info-row"><span class="label">${c.name} x${c.quantity}</span><span class="value">${new Intl.NumberFormat("ru-RU").format(c.total_price)} ₽</span></div>`;
      });
    }
    if (services.length) {
      services.forEach((s) => {
        html += `<div class="info-row"><span class="label">${s.name}</span><span class="value">${new Intl.NumberFormat("ru-RU").format(s.total_price)} ₽</span></div>`;
      });
    }
    html += "</div>";
  }

  html += `<div class="total-summary"><div class="label">ИТОГО</div><div class="amount">${new Intl.NumberFormat("ru-RU").format(order.final_amount || order.total_amount || 0)} ₽</div></div>`;

  if (order.comments) {
    html += `<div class="info-block"><h4>Комментарий</h4><p style="background:var(--bg-panel);padding:15px;border-radius:6px">${order.comments}</p></div>`;
  }

  if (order.manager_comments) {
    html += `<div class="info-block"><h4>Комментарий менеджера</h4><p style="background:var(--bg-panel);padding:15px;border-radius:6px;border-left:4px solid #3498db">${order.manager_comments}</p></div>`;
  }

  if (history.length) {
    html += '<div class="info-block"><h4>История</h4>';
    history.forEach((h) => {
      html += `<div class="history-item"><strong>${getStatusText(h.new_status)}</strong> ${h.old_status ? `(было: ${getStatusText(h.old_status)})` : ""}<br><small>${new Date(h.created_at).toLocaleString()} - ${h.changed_by_name || "Система"}</small>${h.comment ? `<div>${h.comment}</div>` : ""}</div>`;
    });
    html += "</div>";
  }

  document.getElementById("modalOrderNumber").textContent = order.order_number;
  document.getElementById("orderDetails").innerHTML = html;
  document.getElementById("orderModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("orderModal").style.display = "none";
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

function getStatusIcon(status) {
  const map = {
    new: "📝",
    processing: "⚙️",
    confirmed: "✅",
    manufacturing: "🏭",
    ready: "📦",
    delivered: "🚚",
    completed: "🎉",
    cancelled: "❌",
  };
  return map[status] || "📋";
}

window.logout = logout;
window.viewOrder = viewOrder;
window.closeModal = closeModal;
window.filterOrders = filterOrders;
