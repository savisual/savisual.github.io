// =====================
//  SA VISUAL - app.js
//  Portfolio + Work detail (Video/Photo)
// =====================

async function loadWorks() {
  const res = await fetch("/data/works.json");
  if (!res.ok) throw new Error("works.json 로드 실패");
  return await res.json();
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function escapeHTML(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(str) {
  return escapeHTML(str).replaceAll("'", "&#39;");
}

/**
 * Video 스키마 지원:
 * 1) videoId: "ABCDEFGHIJK"
 * 2) video: { provider: "youtube", id: "ABCDEFGHIJK" }
 * 3) video: { provider: "vimeo", id: "123456" }
 */
function normalizeVideo(work) {
  if (work.videoId && typeof work.videoId === "string") {
    return { provider: "youtube", id: work.videoId };
  }
  if (work.video && typeof work.video === "object") {
    const provider = String(work.video.provider || "").toLowerCase();
    const id = String(work.video.id || "");
    if ((provider === "youtube" || provider === "vimeo") && id) {
      return { provider, id };
    }
  }
  return null;
}

function videoEmbedHTML(video) {
  if (!video) return "";

  if (video.provider === "youtube") {
    const id = video.id;
    return `
      <div class="embed">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0"
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }

  if (video.provider === "vimeo") {
    const id = video.id;
    return `
      <div class="embed">
        <iframe
          src="https://player.vimeo.com/video/${encodeURIComponent(id)}"
          title="Vimeo video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }

  return "";
}

// =====================
// Portfolio page
// =====================
async function renderPortfolio() {
  const works = await loadWorks();
  const grid = document.getElementById("worksGrid");
  if (!grid) return;

  grid.innerHTML = works
    .map((w) => {
      const thumb = (w.thumb && String(w.thumb).trim()) ? String(w.thumb).trim() : "";
      const type = (w.type && String(w.type).trim()) ? String(w.type).trim() : "Work";
      const year = (w.year && String(w.year).trim()) ? String(w.year).trim() : "";
      const title = (w.title && String(w.title).trim()) ? String(w.title).trim() : "";

      const isPhoto = (String(w.type || "").toLowerCase() === "photo") || Array.isArray(w.images);

      const cardClass = isPhoto ? "card cardPhoto" : "card cardVideo";
      const thumbClass = isPhoto ? "thumb thumbPhoto" : "thumb thumbVideo";

      const thumbStyle = thumb
        ? `style="background-image:url('${thumb.replace(/'/g, "\\'")}')"`
        : "";

      return `
        <a class="${cardClass}" href="/work/?id=${encodeURIComponent(w.id)}">
          <div class="${thumbClass}" ${thumbStyle}>
            ${isPhoto ? `<div class="badgePhoto">PHOTO</div>` : ``}
          </div>
          <div class="meta">
            <b>${escapeHTML(title)}</b>
            <span>${escapeHTML(type)}${year ? " · " + escapeHTML(year) : ""}</span>
          </div>
        </a>
      `;
    })
    .join("");
}

// =====================
// Work detail page (Video / Photo)
// =====================
async function renderWork() {
  const works = await loadWorks();
  const id = qs("id");
  const work = works.find((w) => w.id === id);

  const root = document.getElementById("workRoot");
  if (!root) return;

  if (!work) {
    root.innerHTML = `<p>작업물을 찾을 수 없습니다. <a href="/portfolio/">포트폴리오로 돌아가기</a></p>`;
    return;
  }

  const title = String(work.title || "");
  const type = String(work.type || "");
  const year = String(work.year || "");
  const client = String(work.client || "");

  // ✅ 여기서 "Type: ___" 띄어쓰기/콜론 포맷 통일
  const metaLines = [
    type ? `<div><b>Type</b><span>: ${escapeHTML(type)}</span></div>` : "",
    year ? `<div><b>Year</b><span>: ${escapeHTML(year)}</span></div>` : "",
    client ? `<div><b>Client</b><span>: ${escapeHTML(client)}</span></div>` : "",
  ]
    .filter(Boolean)
    .join("");

  const creditsArr = Array.isArray(work.credits) ? work.credits : [];
  const creditsHTML = creditsArr.length
    ? `
      <div class="workCredits">
        <h3>Credits</h3>
        <ul>
          ${creditsArr.map((c) => `<li>${escapeHTML(String(c))}</li>`).join("")}
        </ul>
      </div>
    `
    : "";

  const isPhoto =
    String(work.type || "").toLowerCase() === "photo" || Array.isArray(work.images);

  // 왼쪽 영역 HTML
  let leftHTML = "";

  if (isPhoto) {
    const photoSources = (Array.isArray(work.images) ? work.images : [])
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    leftHTML = `
      <div class="workPlayer">
        <a class="workBackArrow" href="/portfolio/" aria-label="Back"></a>

        <div class="photoGrid">
          ${photoSources
            .map(
              (src, i) => `
              <button class="photoItem" type="button" data-idx="${i}" aria-label="Open image ${i + 1}">
                <img src="${escapeAttr(src)}" alt="${escapeAttr(title)} ${i + 1}" loading="lazy" />
              </button>
            `
            )
            .join("")}
        </div>

        <div class="lightbox" id="lightbox" aria-hidden="true">
          <button class="lightboxClose" type="button" aria-label="Close"></button>
          <button class="lightboxNav prev" type="button" aria-label="Previous"></button>
          <img class="lightboxImg" alt="" />
          <button class="lightboxNav next" type="button" aria-label="Next"></button>
          <div class="lightboxCount" id="lightboxCount"></div>
        </div>
      </div>
    `;
  } else {
    const video = normalizeVideo(work);
    leftHTML = `
      <div class="workPlayer">
        <a class="workBackArrow" href="/portfolio/" aria-label="Back"></a>
        ${videoEmbedHTML(video)}
      </div>
    `;
  }

  root.innerHTML = `
    <div class="container">
      <div class="workLayout">
        <div class="workMain">
          ${leftHTML}
        </div>

        <aside class="workSidebar">
          <h1 class="workTitle">${escapeHTML(title)}</h1>
          <div class="workMeta">${metaLines}</div>
          ${creditsHTML}
        </aside>
      </div>
    </div>
  `;

  // Photo 라이트박스 이벤트
  if (isPhoto) {
    const photoSources = (Array.isArray(work.images) ? work.images : [])
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    const lb = document.getElementById("lightbox");
    const lbImg = lb ? lb.querySelector(".lightboxImg") : null;
    const btnClose = lb ? lb.querySelector(".lightboxClose") : null;
    const btnPrev = lb ? lb.querySelector(".lightboxNav.prev") : null;
    const btnNext = lb ? lb.querySelector(".lightboxNav.next") : null;
    const lbCount = document.getElementById("lightboxCount");

    let current = 0;

    const render = () => {
      if (!lbImg) return;
      lbImg.src = photoSources[current];
      if (lbCount) lbCount.textContent = `${current + 1} / ${photoSources.length}`;
    };

    const open = (idx) => {
      if (!lb) return;
      current = Math.max(0, Math.min(photoSources.length - 1, idx));
      lb.setAttribute("aria-hidden", "false");
      lb.classList.add("show");
      render();
    };

    const close = () => {
      if (!lb || !lbImg) return;
      lb.classList.remove("show");
      lb.setAttribute("aria-hidden", "true");
      lbImg.src = "";
    };

    const prev = () => {
      if (photoSources.length <= 1) return;
      current = (current - 1 + photoSources.length) % photoSources.length;
      render();
    };

    const next = () => {
      if (photoSources.length <= 1) return;
      current = (current + 1) % photoSources.length;
      render();
    };

    root.querySelectorAll(".photoItem").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-idx"));
        if (!Number.isNaN(idx)) open(idx);
      });
    });

    if (btnClose) btnClose.addEventListener("click", close);
    if (btnPrev) btnPrev.addEventListener("click", prev);
    if (btnNext) btnNext.addEventListener("click", next);

    if (lb) {
      lb.addEventListener("click", (e) => {
        if (e.target === lb) close();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (!lb || lb.getAttribute("aria-hidden") === "true") return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    });
  }
}

// =====================
// Boot
// =====================
document.addEventListener("DOMContentLoaded", () => {
  renderPortfolio().catch(console.error);
  renderWork().catch(console.error);
});
