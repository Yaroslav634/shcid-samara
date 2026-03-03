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

function safeParseNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function formatNumber(value) {
  const num = safeParseNumber(value);
  return num.toFixed(2);
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

async function exportOrders() {
  try {
    showLoading(true);

    const response = await fetch(`${API_BASE_URL}/my-orders`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Ошибка загрузки заказов");

    const orders = await response.json();

    if (!orders || orders.length === 0) {
      showNotification("Нет заказов для экспорта", "warning");
      return;
    }

    const data = orders.map((order) => ({
      ID: order.id,
      "Номер заказа": order.order_number || "—",
      Дата: order.created_at
        ? new Date(order.created_at).toLocaleString()
        : "—",
      Клиент: order.customer_name || "—",
      Телефон: order.customer_phone || "—",
      Email: order.customer_email || "—",
      Статус: getStatusText(order.status),
      Сумма: formatNumber(order.final_amount || order.total_amount),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Заказы");

    const fileName = `orders_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showNotification(`Заказы экспортированы: ${fileName}`, "success");
  } catch (error) {
    console.error("Ошибка экспорта заказов:", error);
    showNotification("Ошибка при экспорте заказов", "error");
  } finally {
    showLoading(false);
  }
}

async function exportComponents() {
  try {
    showLoading(true);

    const response = await fetch(`${API_BASE_URL}/components`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Ошибка загрузки компонентов");

    const components = await response.json();

    if (!components || components.length === 0) {
      showNotification("Нет компонентов для экспорта", "warning");
      return;
    }

    const data = components.map((comp) => ({
      ID: comp.id,
      Название: comp.name || "—",
      Цена: formatNumber(comp.price),
      Категория: comp.category_name || "—",
      Производитель: comp.manufacturer || "—",
      "В наличии": comp.in_stock ? "Да" : "Нет",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Компоненты");

    const fileName = `components_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showNotification(`Компоненты экспортированы: ${fileName}`, "success");
  } catch (error) {
    console.error("Ошибка экспорта компонентов:", error);
    showNotification("Ошибка при экспорте компонентов", "error");
  } finally {
    showLoading(false);
  }
}

async function exportCategories() {
  try {
    showLoading(true);

    const response = await fetch(`${API_BASE_URL}/categories`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Ошибка загрузки категорий");

    const categories = await response.json();

    if (!categories || categories.length === 0) {
      showNotification("Нет категорий для экспорта", "warning");
      return;
    }

    const data = categories.map((cat) => ({
      ID: cat.id,
      Название: cat.name || "—",
      Описание: cat.description || "—",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Категории");

    const fileName = `categories_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showNotification(`Категории экспортированы: ${fileName}`, "success");
  } catch (error) {
    console.error("Ошибка экспорта категорий:", error);
    showNotification("Ошибка при экспорте категорий", "error");
  } finally {
    showLoading(false);
  }
}

async function exportUsers() {
  try {
    showLoading(true);

    const response = await fetch(`${API_BASE_URL}/users`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Ошибка загрузки пользователей");

    const users = await response.json();

    if (!users || users.length === 0) {
      showNotification("Нет пользователей для экспорта", "warning");
      return;
    }

    const data = users.map((user) => ({
      ID: user.id,
      Логин: user.username || "—",
      ФИО: user.full_name || "—",
      Email: user.email || "—",
      Роль:
        user.role === "admin"
          ? "Админ"
          : user.role === "manager"
            ? "Менеджер"
            : "Пользователь",
      Статус: user.is_active ? "Активен" : "Заблокирован",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Пользователи");

    const fileName = `users_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showNotification(`Пользователи экспортированы: ${fileName}`, "success");
  } catch (error) {
    console.error("Ошибка экспорта пользователей:", error);
    showNotification("Ошибка при экспорте пользователей", "error");
  } finally {
    showLoading(false);
  }
}

async function exportAllTables() {
  try {
    showLoading(true);

    const [ordersRes, componentsRes, categoriesRes, usersRes] =
      await Promise.all([
        fetch(`${API_BASE_URL}/my-orders`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/components`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/categories`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/users`, { credentials: "include" }),
      ]);

    const orders = await ordersRes.json();
    const components = await componentsRes.json();
    const categories = await categoriesRes.json();
    const users = await usersRes.json();

    const workbook = XLSX.utils.book_new();

    if (orders && orders.length > 0) {
      const ordersData = orders.map((order) => ({
        ID: order.id,
        "Номер заказа": order.order_number,
        Дата: order.created_at
          ? new Date(order.created_at).toLocaleDateString()
          : "—",
        Клиент: order.customer_name,
        Статус: getStatusText(order.status),
        Сумма: formatNumber(order.final_amount || order.total_amount),
      }));
      const ordersSheet = XLSX.utils.json_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(workbook, ordersSheet, "Заказы");
    }

    if (components && components.length > 0) {
      const componentsData = components.map((comp) => ({
        ID: comp.id,
        Название: comp.name,
        Цена: formatNumber(comp.price),
        Категория: comp.category_name,
        "В наличии": comp.in_stock ? "Да" : "Нет",
      }));
      const componentsSheet = XLSX.utils.json_to_sheet(componentsData);
      XLSX.utils.book_append_sheet(workbook, componentsSheet, "Компоненты");
    }

    if (categories && categories.length > 0) {
      const categoriesData = categories.map((cat) => ({
        ID: cat.id,
        Название: cat.name,
        Описание: cat.description,
      }));
      const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
      XLSX.utils.book_append_sheet(workbook, categoriesSheet, "Категории");
    }

    if (users && users.length > 0) {
      const usersData = users.map((user) => ({
        ID: user.id,
        Логин: user.username,
        ФИО: user.full_name,
        Email: user.email,
        Роль: user.role,
        Статус: user.is_active ? "Активен" : "Заблокирован",
      }));
      const usersSheet = XLSX.utils.json_to_sheet(usersData);
      XLSX.utils.book_append_sheet(workbook, usersSheet, "Пользователи");
    }

    const fileName = `all_tables_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showNotification(`Все таблицы экспортированы: ${fileName}`, "success");
  } catch (error) {
    console.error("Ошибка экспорта всех таблиц:", error);
    showNotification("Ошибка при экспорте", "error");
  } finally {
    showLoading(false);
  }
}


window.exportOrders = exportOrders;
window.exportComponents = exportComponents;
window.exportCategories = exportCategories;
window.exportUsers = exportUsers;
window.exportAllTables = exportAllTables;
