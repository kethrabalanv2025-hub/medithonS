/**
 * ==============================================================================
 * SMART CAMPUS RESOURCE CONFLICT RESOLVER - SCRIPT.JS
 * 
 * Plain JavaScript (Vanilla JS) for Hackathon Presentation
 * Features:
 *   1. Mock Data of campus bookings (with intentional overlaps to show red/green)
 *   2. Conflict Detection Algorithm (evaluates time overlaps on the same resource)
 *   3. Intelligent Alternative Suggestions (suggests free halls or time slots)
 *   4. FullCalendar.js initialization and dynamic re-rendering
 *   5. Form submission handling & in-page notification display (no popups)
 * ==============================================================================
 */

// ==============================================================================
// 1. MOCK DATA - replace with real API call later
// ==============================================================================
// Helper function to get dates relative to today in 'YYYY-MM-DD' format.
// This ensures that whenever you open this demo, the calendar displays events
// on the CURRENT active week for your hackathon presentation!
function getRelativeDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 8-10 Sample bookings stored in memory.
// Note: We deliberately included overlapping bookings for 'Seminar Hall 1'
// on today's date so you can immediately demonstrate the RED conflict highlight!
let mockBookings = [
  {
    id: "BKG-101",
    resource: "Seminar Hall 1",
    dept: "Computer Science Dept",
    purpose: "AI & Deep Learning Guest Lecture",
    date: getRelativeDate(0), // Today
    startTime: "10:00",
    endTime: "12:30"
  },
  {
    id: "BKG-102",
    resource: "Seminar Hall 1",
    dept: "Robotics Club",
    purpose: "Drone Workshop & Practice",
    date: getRelativeDate(0), // Today (CLASHES with BKG-101: 11:00 - 13:00 overlaps 10:00 - 12:30!)
    startTime: "11:00",
    endTime: "13:00"
  },
  {
    id: "BKG-103",
    resource: "MG Auditorium",
    dept: "Cultural Society",
    purpose: "Annual Drama Rehearsal",
    date: getRelativeDate(0), // Today (Clear / No conflict)
    startTime: "14:00",
    endTime: "17:00"
  },
  {
    id: "BKG-104",
    resource: "Lab 204",
    dept: "Data Science Society",
    purpose: "Python & Pandas Bootcamp",
    date: getRelativeDate(1), // Tomorrow
    startTime: "09:00",
    endTime: "11:30"
  },
  {
    id: "BKG-105",
    resource: "Lab 205",
    dept: "IoT & Embedded Club",
    purpose: "Arduino & ESP32 Hands-on Lab",
    date: getRelativeDate(1), // Tomorrow
    startTime: "13:00",
    endTime: "15:30"
  },
  {
    id: "BKG-106",
    resource: "Seminar Hall 2",
    dept: "Placement & Training Cell",
    purpose: "Mock Technical Interview Drive",
    date: getRelativeDate(2), // 2 days later
    startTime: "10:00",
    endTime: "14:00"
  },
  {
    id: "BKG-107",
    resource: "MG Auditorium",
    dept: "Alumni Association",
    purpose: "Campus Reunion Keynote",
    date: getRelativeDate(3), // 3 days later
    startTime: "15:00",
    endTime: "18:00"
  },
  {
    id: "BKG-108",
    resource: "Lab 204",
    dept: "ACM Student Chapter",
    purpose: "Algorithmic Problem Solving Contest",
    date: getRelativeDate(3), // 3 days later
    startTime: "13:30",
    endTime: "16:30"
  },
  {
    id: "BKG-109",
    resource: "Seminar Hall 2",
    dept: "E-Cell (Entrepreneurship)",
    purpose: "Startup Pitch Deck Presentation",
    date: getRelativeDate(4), // 4 days later
    startTime: "11:00",
    endTime: "13:00"
  }
];

// Available campus resources list (matches dropdown values)
const ALL_RESOURCES = [
  "Seminar Hall 1",
  "Seminar Hall 2",
  "MG Auditorium",
  "Lab 204",
  "Lab 205"
];

// Variable to hold the FullCalendar instance
let calendar = null;


// ==============================================================================
// 2. DOM ELEMENT REFERENCES
// Grab elements using the exact IDs requested by the user / backend API team
// ==============================================================================
const resourceSelect = document.getElementById("resource");
const deptInput      = document.getElementById("dept");
const purposeInput   = document.getElementById("purpose");
const dateInput      = document.getElementById("date");
const startTimeInput = document.getElementById("startTime");
const endTimeInput   = document.getElementById("endTime");
const bookingForm    = document.getElementById("bookingForm");
const notificationBox= document.getElementById("notificationBox");
const resourceFilter = document.getElementById("resourceFilter");

// Quick stats badges
const statTotalBookings = document.getElementById("statTotalBookings");
const statConflicts     = document.getElementById("statConflicts");
const statClearBookings = document.getElementById("statClearBookings");

// Demo quick-action buttons
const demoConflictBtn  = document.getElementById("demoConflictBtn");
const demoAvailableBtn = document.getElementById("demoAvailableBtn");
const resetBtn         = document.getElementById("resetBtn");

// Modal elements for viewing event details
const detailModal      = document.getElementById("detailModal");
const modalCloseBtn    = document.getElementById("modalCloseBtn");
const modalDismissBtn  = document.getElementById("modalDismissBtn");
const modalBody        = document.getElementById("modalBody");


// ==============================================================================
// 3. TIME CONVERSION & TIME OVERLAP MATHEMATICS
// ==============================================================================

/**
 * Helper function: Converts "HH:MM" (e.g. "10:30") into total minutes from midnight.
 * Example: "10:30" -> (10 * 60) + 30 = 630 minutes.
 * 
 * Why this is useful: Comparing numbers (like 630 < 720) is much easier and
 * less error-prone than comparing date objects or strings!
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours * 60) + minutes;
}

/**
 * Checks if two time intervals on the same day overlap each other.
 * 
 * STANDARD TIME OVERLAP FORMULA:
 * Interval 1: [startA, endA]
 * Interval 2: [startB, endB]
 * 
 * They overlap IF AND ONLY IF:
 *   startA < endB  AND  endA > startB
 * 
 * Why? If booking A starts before booking B finishes, AND booking A finishes
 * after booking B starts, there must be a common overlapping window!
 */
function doTimeSlotsOverlap(startA, endA, startB, endB) {
  const aStart = timeToMinutes(startA);
  const aEnd   = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd   = timeToMinutes(endB);

  return (aStart < bEnd) && (aEnd > bStart);
}


// ==============================================================================
// 4. CONFLICT DETECTION FUNCTION
// Checks a proposed new booking against all existing bookings in the mock array.
// ==============================================================================
/**
 * @param {Object} candidate - { resource, date, startTime, endTime }
 * @param {string|null} ignoreBookingId - (Optional) ID to skip if editing
 * @returns {Array} List of conflicting bookings found
 */
function findConflicts(candidate, ignoreBookingId = null) {
  const clashingBookings = [];

  for (const existing of mockBookings) {
    // Skip if it's the exact same booking (useful during edits/updates)
    if (ignoreBookingId && existing.id === ignoreBookingId) {
      continue;
    }

    // A conflict can ONLY happen if BOTH the resource AND date are identical
    const isSameResource = (existing.resource === candidate.resource);
    const isSameDate     = (existing.date === candidate.date);

    if (isSameResource && isSameDate) {
      // Check if their time intervals overlap
      if (doTimeSlotsOverlap(candidate.startTime, candidate.endTime, existing.startTime, existing.endTime)) {
        clashingBookings.push(existing);
      }
    }
  }

  return clashingBookings;
}

/**
 * Determines which bookings in the entire mockBookings array are in a conflict state.
 * Returns a Set of booking IDs that are currently involved in any overlap.
 */
function getConflictedBookingIds() {
  const conflictedIds = new Set();

  // Compare every booking with every other booking
  for (let i = 0; i < mockBookings.length; i++) {
    for (let j = i + 1; j < mockBookings.length; j++) {
      const b1 = mockBookings[i];
      const b2 = mockBookings[j];

      if (b1.resource === b2.resource && b1.date === b2.date) {
        if (doTimeSlotsOverlap(b1.startTime, b1.endTime, b2.startTime, b2.endTime)) {
          conflictedIds.add(b1.id);
          conflictedIds.add(b2.id);
        }
      }
    }
  }

  return conflictedIds;
}


// ==============================================================================
// 5. SMART ALTERNATIVE SUGGESTION ENGINE
// When a booking clashes, recommend available halls or slots so the user isn't stuck!
// ==============================================================================
function findAlternatives(candidate) {
  const suggestions = [];

  // Suggestion 1: Check which OTHER campus resources are completely free at this exact time
  for (const facility of ALL_RESOURCES) {
    if (facility === candidate.resource) continue; // Skip the currently clashing hall

    const testCandidate = {
      resource: facility,
      date: candidate.date,
      startTime: candidate.startTime,
      endTime: candidate.endTime
    };

    const clashes = findConflicts(testCandidate);
    if (clashes.length === 0) {
      suggestions.push({
        type: "facility",
        resource: facility,
        date: candidate.date,
        startTime: candidate.startTime,
        endTime: candidate.endTime,
        label: `${facility} is completely available at ${candidate.startTime} - ${candidate.endTime}`
      });
    }
  }

  return suggestions;
}


// ==============================================================================
// 6. FULLCALENDAR INITIALIZATION & SYNC
// ==============================================================================
/**
 * Transforms the mockBookings array into FullCalendar event objects.
 * Applies RED styling for conflicts, GREEN for confirmed.
 */
function getCalendarEvents() {
  const conflictedIds = getConflictedBookingIds();
  const selectedFilter = resourceFilter ? resourceFilter.value : "ALL";

  return mockBookings
    .filter(b => selectedFilter === "ALL" || b.resource === selectedFilter)
    .map(b => {
      const isConflict = conflictedIds.has(b.id);
      return {
        id: b.id,
        // Title shows resource and department for quick scannability
        title: `[${b.resource}] ${b.dept}: ${b.purpose}`,
        start: `${b.date}T${b.startTime}:00`,
        end: `${b.date}T${b.endTime}:00`,
        // Assign CSS classes and colors for visual distinction
        className: isConflict ? "event-conflict" : "event-clear",
        backgroundColor: isConflict ? "#dc2626" : "#059669",
        borderColor: isConflict ? "#b91c1c" : "#047857",
        textColor: "#ffffff",
        extendedProps: {
          ...b,
          isConflict: isConflict
        }
      };
    });
}

/**
 * Initializes the FullCalendar instance on page load
 */
function initCalendar() {
  const calendarEl = document.getElementById("calendar");

  calendar = new FullCalendar.Calendar(calendarEl, {
    // Start in week view showing time slots, with buttons to toggle to Day or Month list
    initialView: "timeGridWeek",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "timeGridWeek,timeGridDay,listWeek"
    },
    // Working hours for campus: 08:00 AM to 08:00 PM
    slotMinTime: "08:00:00",
    slotMaxTime: "20:00:00",
    allDaySlot: false,
    nowIndicator: true,
    height: "auto",
    events: getCalendarEvents(),

    // Clicking an event opens a modal showing full details
    eventClick: function(info) {
      showEventModal(info.event.extendedProps);
    }
  });

  calendar.render();
}

/**
 * Refreshes calendar events, metrics, and schedule table
 */
function refreshDashboard() {
  // Update FullCalendar
  if (calendar) {
    calendar.removeAllEvents();
    calendar.addEventSource(getCalendarEvents());
  }

  // Update schedule table
  renderBookingsTable();

  // Update top metrics
  updateMetrics();
}


// ==============================================================================
// 7. BOOKINGS SCHEDULE TABLE (Tabular View)
// ==============================================================================
function renderBookingsTable() {
  const tbody = document.getElementById("bookingsTableBody");
  const countBadge = document.getElementById("tableRecordCount");
  const conflictedIds = getConflictedBookingIds();
  const selectedFilter = resourceFilter ? resourceFilter.value : "ALL";

  const filtered = mockBookings.filter(b => selectedFilter === "ALL" || b.resource === selectedFilter);

  countBadge.textContent = `${filtered.length} Records`;
  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--slate-400); padding: 2rem;">
          No bookings match the selected resource filter.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(booking => {
    const isConflict = conflictedIds.has(booking.id);
    const tr = document.createElement("tr");
    if (isConflict) tr.classList.add("row-conflict");

    tr.innerHTML = `
      <td><span class="resource-tag">${escapeHtml(booking.resource)}</span></td>
      <td><strong>${escapeHtml(booking.dept)}</strong></td>
      <td>${booking.date}</td>
      <td>${booking.startTime} - ${booking.endTime}</td>
      <td>${escapeHtml(booking.purpose)}</td>
      <td>
        ${isConflict 
          ? `<span class="status-pill status-pill-conflict">⚠️ Conflict</span>` 
          : `<span class="status-pill status-pill-clear">✓ Confirmed</span>`}
      </td>
      <td>
        <button type="button" class="btn-icon-danger" title="Cancel Booking" onclick="deleteBooking('${booking.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Deletes a booking from the mock array (global helper called by table row button)
 */
window.deleteBooking = function(id) {
  const index = mockBookings.findIndex(b => b.id === id);
  if (index !== -1) {
    const removed = mockBookings.splice(index, 1)[0];
    showNotification("success", `Removed booking "${removed.purpose}" (${removed.resource}).`);
    refreshDashboard();
  }
};


// ==============================================================================
// 8. METRICS & COUNTERS UPDATE
// ==============================================================================
function updateMetrics() {
  const total = mockBookings.length;
  const conflictedSet = getConflictedBookingIds();
  const conflictCount = conflictedSet.size;
  const clearCount = total - conflictCount;

  if (statTotalBookings) statTotalBookings.textContent = total;
  if (statConflicts)     statConflicts.textContent     = conflictCount;
  if (statClearBookings) statClearBookings.textContent = clearCount;
}


// ==============================================================================
// 9. IN-PAGE NOTIFICATIONS (No alert() popups as requested)
// ==============================================================================
/**
 * Renders rich messages in the notificationBox container
 */
function showNotification(type, message, details = null, alternatives = []) {
  if (!notificationBox) return;

  if (type === "error") {
    // Conflict Alert Card
    let detailsHtml = "";
    if (details && details.length > 0) {
      detailsHtml = `
        <div class="clash-details">
          <div class="clash-details-title">
            <span>⚠️ Clashing Reservation(s):</span>
          </div>
          ${details.map(d => `
            <div class="clash-details-item">
              • <strong>${escapeHtml(d.dept)}</strong> booked for <em>"${escapeHtml(d.purpose)}"</em> 
              from <strong>${d.startTime}</strong> to <strong>${d.endTime}</strong>.
            </div>
          `).join("")}
        </div>
      `;
    }

    let altHtml = "";
    if (alternatives && alternatives.length > 0) {
      altHtml = `
        <div class="alternative-box">
          <div class="alternative-title">
            <span>💡 Suggested Conflict-Free Alternatives:</span>
          </div>
          <div class="alternative-list">
            ${alternatives.slice(0, 3).map(alt => `
              <div class="alternative-item">
                <span>${alt.label}</span>
                <button type="button" class="btn-apply-alt" onclick="applyAlternative('${alt.resource}')">
                  Switch to this
                </button>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    notificationBox.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <div class="alert-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>Resource Conflict Detected!</span>
        </div>
        <div class="alert-body">
          <p>${message}</p>
          ${detailsHtml}
          ${altHtml}
        </div>
      </div>
    `;
  } else if (type === "success") {
    // Success Alert Card
    notificationBox.innerHTML = `
      <div class="alert alert-success" role="status">
        <div class="alert-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>Booking Successful!</span>
        </div>
        <div class="alert-body">
          <p>${message}</p>
        </div>
      </div>
    `;
  } else {
    notificationBox.innerHTML = "";
  }
}

/**
 * Click handler to apply a suggested alternative facility
 */
window.applyAlternative = function(facilityName) {
  if (resourceSelect) {
    resourceSelect.value = facilityName;
    showNotification("success", `Facility updated to ${facilityName}! Click "Submit Booking Request" to confirm.`);
  }
};


// ==============================================================================
// 10. FORM SUBMISSION LOGIC
// Read inputs by exact IDs, validate, test conflicts, update data
// ==============================================================================
bookingForm.addEventListener("submit", function(event) {
  // Prevent normal browser page reload
  event.preventDefault();

  // 1. Read input values using their exact required element IDs
  const resourceVal  = resourceSelect.value.trim();
  const deptVal      = deptInput.value.trim();
  const purposeVal   = purposeInput.value.trim();
  const dateVal      = dateInput.value.trim();
  const startTimeVal = startTimeInput.value.trim();
  const endTimeVal   = endTimeInput.value.trim();

  // 2. Validate all fields are filled
  if (!resourceVal || !deptVal || !purposeVal || !dateVal || !startTimeVal || !endTimeVal) {
    showNotification("error", "Please fill in all required fields before submitting.");
    return;
  }

  // 3. Validate that end time is strictly after start time
  if (timeToMinutes(endTimeVal) <= timeToMinutes(startTimeVal)) {
    showNotification("error", "End time must be later than start time!");
    return;
  }

  // 4. Construct candidate booking object
  const newBooking = {
    id: "BKG-" + Math.floor(100 + Math.random() * 900), // Random 3-digit ID
    resource: resourceVal,
    dept: deptVal,
    purpose: purposeVal,
    date: dateVal,
    startTime: startTimeVal,
    endTime: endTimeVal
  };

  // 5. Run conflict check against current mock bookings
  const clashes = findConflicts(newBooking);

  if (clashes.length > 0) {
    // Conflict detected!
    // Find alternatives to assist the user
    const alternatives = findAlternatives(newBooking);

    showNotification(
      "error",
      `The requested slot for <strong>${resourceVal}</strong> on <strong>${dateVal}</strong> (${startTimeVal} - ${endTimeVal}) is already booked!`,
      clashes,
      alternatives
    );

    // Note: Per user spec, we do NOT add it as a confirmed booking, but we clearly
    // show which booking it clashes with.
    return;
  }

  // 6. No conflict! Add to mockBookings array
  mockBookings.push(newBooking);

  // 7. Show success message on the page
  showNotification(
    "success",
    `Your reservation for <strong>${resourceVal}</strong> on <strong>${dateVal}</strong> (${startTimeVal} - ${endTimeVal}) has been confirmed and added to the calendar.`
  );

  // 8. Refresh the dashboard calendar & table
  refreshDashboard();

  // 9. Reset form inputs
  bookingForm.reset();
  setDefaultFormDates();
});


// ==============================================================================
// 11. DEMO HELPERS (For live hackathon presentations)
// ==============================================================================
/**
 * Sets default date to Today and sensible default times
 */
function setDefaultFormDates() {
  if (dateInput && !dateInput.value) {
    dateInput.value = getRelativeDate(0);
  }
  if (startTimeInput && !startTimeInput.value) {
    startTimeInput.value = "10:00";
  }
  if (endTimeInput && !endTimeInput.value) {
    endTimeInput.value = "12:00";
  }
}

// Preset to demonstrate a CONFLICT clash
demoConflictBtn.addEventListener("click", function() {
  resourceSelect.value = "Seminar Hall 1";
  deptInput.value      = "Web Development Club";
  purposeInput.value   = "FullStack Hackathon Check-in";
  dateInput.value      = getRelativeDate(0); // Same day as BKG-101
  startTimeInput.value = "10:30";             // Overlaps 10:00 - 12:30
  endTimeInput.value   = "11:45";

  showNotification("error", "Demo values loaded! Click 'Submit Booking Request' to see conflict detection in action.");
});

// Preset to demonstrate a CLEAR booking
demoAvailableBtn.addEventListener("click", function() {
  resourceSelect.value = "Seminar Hall 2";
  deptInput.value      = "Aerospace Club";
  purposeInput.value   = "Satellite Design Workshop";
  dateInput.value      = getRelativeDate(1);
  startTimeInput.value = "15:00";
  endTimeInput.value   = "17:00";

  showNotification("success", "Open slot demo values loaded! Click 'Submit Booking Request' to see it added cleanly.");
});

// Reset button
resetBtn.addEventListener("click", function() {
  bookingForm.reset();
  setDefaultFormDates();
  notificationBox.innerHTML = "";
});

// Filter by resource change
resourceFilter.addEventListener("change", function() {
  refreshDashboard();
});


// ==============================================================================
// 12. EVENT DETAILS MODAL
// ==============================================================================
function showEventModal(props) {
  const modalTitle = document.getElementById("modalTitle");
  modalTitle.textContent = `${props.resource} Booking`;

  modalBody.innerHTML = `
    <div class="modal-detail-row">
      <span class="modal-detail-label">Status</span>
      <span class="modal-detail-value">
        ${props.isConflict 
          ? '<span class="status-pill status-pill-conflict">⚠️ Overlapping Conflict</span>' 
          : '<span class="status-pill status-pill-clear">✓ Confirmed</span>'}
      </span>
    </div>
    <div class="modal-detail-row">
      <span class="modal-detail-label">Resource</span>
      <span class="modal-detail-value">${escapeHtml(props.resource)}</span>
    </div>
    <div class="modal-detail-row">
      <span class="modal-detail-label">Department / Club</span>
      <span class="modal-detail-value">${escapeHtml(props.dept)}</span>
    </div>
    <div class="modal-detail-row">
      <span class="modal-detail-label">Purpose</span>
      <span class="modal-detail-value">${escapeHtml(props.purpose)}</span>
    </div>
    <div class="modal-detail-row">
      <span class="modal-detail-label">Date</span>
      <span class="modal-detail-value">${props.date}</span>
    </div>
    <div class="modal-detail-row">
      <span class="modal-detail-label">Time Window</span>
      <span class="modal-detail-value">${props.startTime} - ${props.endTime}</span>
    </div>
    <div class="modal-detail-row">
      <span class="modal-detail-label">Booking ID</span>
      <span class="modal-detail-value"><code>${props.id}</code></span>
    </div>
  `;

  detailModal.removeAttribute("hidden");
}

function hideEventModal() {
  detailModal.setAttribute("hidden", "true");
}

modalCloseBtn.addEventListener("click", hideEventModal);
modalDismissBtn.addEventListener("click", hideEventModal);
detailModal.addEventListener("click", function(e) {
  if (e.target === detailModal) hideEventModal();
});


// ==============================================================================
// 13. UTILITY FUNCTIONS
// ==============================================================================
/**
 * Simple HTML sanitizer to prevent XSS injection
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ==============================================================================
// 14. INITIALIZE ON DOM CONTENT LOADED
// ==============================================================================
document.addEventListener("DOMContentLoaded", function() {
  // Set default dates
  setDefaultFormDates();

  // Initialize FullCalendar
  initCalendar();

  // Render the initial bookings table
  renderBookingsTable();

  // Update counters
  updateMetrics();

  console.log("Smart Campus Resource Conflict Resolver ready. Loaded", mockBookings.length, "mock bookings.");
});
