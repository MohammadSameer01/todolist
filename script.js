// Utility function to create elements
function createElement(tag, className) {
  const el = document.createElement(tag);
  if (className) el.classList.add(className);
  return el;
}

// Label toggle functionality
const label = document.querySelector(".row label");
if (label) {
  label.addEventListener("click", function () {
    this.classList.add("labelActive");
  });
}

// Task management
const tasksContainer = document.querySelector(".tasks-ul");
const inputBox = document.getElementById("input-box");
const addButton = document.querySelector("#addButton");

function getDateString(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getOrCreateDateContainer(date) {
  const dateString = getDateString(date);
  let dateContainer = tasksContainer.querySelector(
    `[data-date="${dateString}"]`
  );

  if (!dateContainer) {
    dateContainer = createElement("div", "date-container");
    dateContainer.dataset.date = dateString;

    const dateHeader = createElement("h3", "date-header");
    dateHeader.textContent = dateString;

    const taskList = createElement("ul", "task-list");
    dateContainer.append(dateHeader, taskList);

    const allContainers = tasksContainer.querySelectorAll(".date-container");
    let inserted = false;
    for (const container of allContainers) {
      if (new Date(dateString) > new Date(container.dataset.date)) {
        tasksContainer.insertBefore(dateContainer, container);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      tasksContainer.appendChild(dateContainer);
    }
  }

  return dateContainer.querySelector(".task-list");
}

function saveTasks() {
  const tasks = [];
  tasksContainer.querySelectorAll("li").forEach((li) => {
    tasks.push({
      text: li.querySelector(".task-text").textContent,
      status: li.querySelector(".task-Status").textContent,
      time: li.querySelector(".task-Time").textContent,
      date: li.closest(".date-container").dataset.date,
      timestamp: li.dataset.timestamp || new Date().toISOString(),
    });
  });
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function addTask(text, status = "Pending", time, date, timestamp) {
  const now = date ? new Date(date) : new Date();
  const taskList = getOrCreateDateContainer(now);
  const li = createElement("li");

  // Task structure
  const taskText = createElement("div", "task-text");
  taskText.textContent = text || inputBox.value.trim();

  const taskExtraInfo = createElement("div", "task-Extra-Info");
  const taskStatus = createElement("span", "task-Status");
  taskStatus.textContent = status;
  const taskTime = createElement("span", "task-Time");

  // Add delete button container
  const deleteButton = createElement("button", "delete-button");
  deleteButton.textContent = "Delete";
  deleteButton.style.display = status === "Completed" ? "inline-block" : "none";

  if (time) {
    taskTime.textContent = time;
  } else {
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    taskTime.textContent = `${hours12}:${minutes} ${period}`;
  }

  li.dataset.timestamp = timestamp || new Date().toISOString();

  // Append elements
  taskExtraInfo.append(taskStatus, taskTime, deleteButton);
  li.append(taskText, taskExtraInfo);
  if (status === "Completed") li.classList.add("completed");
  taskList.appendChild(li);
  if (navigator) {
    navigator.vibrate(25, 50, 50);
  }

  // Delete button handler with confirmation
  deleteButton.addEventListener("click", () => {
    const confirmDelete = confirm("Are you sure you want to delete this task?");
    if (confirmDelete) {
      li.remove();
      saveTasks(); // Update localStorage after removal
      updateTasksCount();
    }
  });
  // Touch handling (only for completing tasks)
  let startX = 0;
  let startY = 0;
  let isSwiping = false;
  const COMPLETE_THRESHOLD = -120; // Left swipe to complete
  const VERTICAL_THRESHOLD = 30;

  li.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = false;
      li.style.transition = "none";
    },
    { passive: true }
  );

  li.addEventListener(
    "touchmove",
    (e) => {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = Math.abs(currentY - startY);

      if (deltaY > VERTICAL_THRESHOLD && !isSwiping) {
        return; // Allow vertical scrolling
      }

      if (Math.abs(deltaX) > 10 && deltaX < 0) {
        // Only allow left swipe
        isSwiping = true;
        e.preventDefault();
        li.style.transform = `translateX(${Math.max(
          deltaX,
          COMPLETE_THRESHOLD
        )}px)`;
      }
    },
    { passive: false }
  );

  li.addEventListener(
    "touchend",
    () => {
      if (!isSwiping) return;

      const currentX = parseFloat(
        li.style.transform.match(/-?\d*\.?\d+/)?.[0] || 0
      );
      li.style.transition = "transform 0.3s ease-out";

      if (currentX <= COMPLETE_THRESHOLD) {
        toggleTaskStatus(li, true);
      }
      li.style.transform = "translateX(0)"; // Always reset to original position
    },
    { passive: true }
  );

  if (!text) {
    inputBox.value = "";
    saveTasks();
    updateTasksCount();
  }
}

function toggleTaskStatus(taskElement, forceComplete = false) {
  const taskStatus = taskElement.querySelector(".task-Status");
  const deleteButton = taskElement.querySelector(".delete-button");
  if (!taskStatus || !deleteButton) return;

  const isCompleted =
    forceComplete || !taskElement.classList.contains("completed");

  taskElement.classList.toggle("completed", isCompleted);
  taskStatus.textContent = isCompleted ? "Completed" : "Pending";
  deleteButton.style.display = isCompleted ? "inline-block" : "none";
  if (navigator) {
    navigator.vibrate(25);
  }
  saveTasks();
  updateTasksCount();
}

function loadTasks() {
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  tasks.forEach((task) => {
    addTask(
      task.text,
      task.status,
      task.time,
      new Date(task.date),
      task.timestamp
    );
  });
}

// Event delegation for clicks
tasksContainer?.addEventListener("click", (event) => {
  const task = event.target.closest("li");
  if (task && !event.target.classList.contains("delete-button")) {
    toggleTaskStatus(task);
  }
});

// Add task button handler
addButton?.addEventListener("click", () => {
  if (inputBox?.value.trim()) {
    addTask();
  } else {
    alert("Task cannot be empty");
  }
});

// Add keyboard support
inputBox?.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && inputBox.value.trim()) {
    addTask();
  }
});

// Load tasks when page loads
window.addEventListener("load", loadTasks);

function getTaskCounts() {
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  const pendingTasksLength = tasks.filter(
    (task) => task.status === "Pending"
  ).length;
  const totalTasksLength = tasks.length;
  return { pending: pendingTasksLength, total: totalTasksLength };
}

function updateTasksCount() {
  const counts = getTaskCounts();
  let pendingCountSpan = document.querySelector(".pending-count");
  pendingCountSpan.innerHTML = counts.pending.toString().padStart(2, 0);

  let completedCountSpan = document.querySelector(".completed-count");
  let completedCount = counts.total - counts.pending;
  completedCountSpan.innerHTML = completedCount.toString().padStart(2, 0);
}
updateTasksCount();
