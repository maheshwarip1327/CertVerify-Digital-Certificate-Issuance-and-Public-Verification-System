initLayout("statistics", { adminOnly: true });

let statsChart = null;
let allCourses = [];

async function initStats() {
  const selector = document.getElementById("course-selector");
  try {
    allCourses = await CoursesAPI.getAll();
    if (allCourses.length === 0) {
      selector.innerHTML = '<option value="">No courses available.</option>';
      return;
    }
    
    selector.innerHTML = '<option value="">-- Select a Course --</option>' + 
      allCourses.map(c => `<option value="${c.id}">${escHtml(c.title)}</option>`).join("");
      
  } catch (err) {
    Toast.error("Failed to load courses");
    selector.innerHTML = '<option value="">Error loading</option>';
  }
}

document.getElementById("course-selector")?.addEventListener("change", async (e) => {
  const courseId = e.target.value;
  
  if (!courseId) {
    document.getElementById("stats-empty").classList.remove("hidden");
    document.getElementById("stats-content").classList.add("hidden");
    return;
  }
  
  const course = allCourses.find(c => c.id == courseId);
  if (course) document.getElementById("info-course-title").textContent = course.title;
  
  try {
    const stats = await CertificatesAPI.stats(courseId);
    
    document.getElementById("stats-empty").classList.add("hidden");
    document.getElementById("stats-content").classList.remove("hidden");
    
    const active = stats.activeCount || 0;
    const revoked = stats.revokedCount || 0;
    const total = stats.totalIssued || 0;
    
    animateCount(document.getElementById("val-total"), total);
    animateCount(document.getElementById("val-active"), active);
    animateCount(document.getElementById("val-revoked"), revoked);
    
    const healthPct = total > 0 ? Math.round((active / total) * 100) : 100;
    document.getElementById("health-pct").textContent = healthPct + "%";
    
    const circle = document.getElementById("health-circle");
    const circum = 2 * Math.PI * 71; // r=71
    circle.style.strokeDasharray = circum;
    circle.style.strokeDashoffset = circum - (healthPct / 100) * circum;
    
    if (healthPct > 80) circle.style.stroke = "var(--green)";
    else if (healthPct > 50) circle.style.stroke = "var(--yellow)";
    else circle.style.stroke = "var(--red)";
    
    updateChart(active, revoked);
    
  } catch (err) { Toast.error("Failed to load stats"); }
});

function escHtml(s) { return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function updateChart(active, revoked) {
  const ctx = document.getElementById("statsChart").getContext("2d");
  if (statsChart) statsChart.destroy();
  
  statsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Active', 'Revoked'],
      datasets: [{
        data: [active, revoked],
        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderColor: ['#10b981', '#ef4444'],
        borderWidth: 1,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '75%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#9ca3af', padding: 20, font: { family: "'Inter', sans-serif" } } }
      }
    }
  });
}

initStats();
