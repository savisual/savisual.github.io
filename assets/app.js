// =====================
// Utils
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
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * works.json video 스키마 지원:
 * 1) "videoId": "ABCDEFGHIJK"
 * 2) "video": { "provider": "youtube", "id": "ABCDEFGHIJK" }
 * 3) "video": { "provider": "vimeo", "id": "123456" }
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
// Portfolio Page
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

      const thumbStyle = thumb
        ? `style="background-image:url('${thumb.replace(/'/g, "\\'")}')"`
        : "";

      return `
        <a class="card" href="/work/?id=${encodeURIComponent(w.id)}">
          <div class="thumb" ${thumbStyle}></div>
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
// Work Detail Page
// =====================
function buildPhotoLeftHTML(work) {
  const title = String(work.title || "");
  const imgs = Array.isArray(work.images)
    ? work.images
    : (work.thumb ? [work.thumb] : []);

  const safeImgs = imgs
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  return `
    <div class="workPlayer">
      <a class="workBackArrow" href="/portfolio/" aria-label="Back"></a>

      <div class="photoGrid">
        ${safeImgs.map((src, i) => `
          <button class="photoItem" type="button" data-src="${escapeAttr(src)}" aria-label="Open image ${i + 1}">
            <img src="${escapeAttr(src)}" alt="${escapeAttr(title)} ${i + 1}" loading="lazy" />
          </button>
        `).join("")}
      </div>

      <div class="lightbox" id="lightbox" aria-hidden="true">
        <button class="lightboxClose" type="button" aria-label="Close"></button>
        <img class="lightboxImg" alt="" />
      </div>
    </div>
  `;
}

function bindLightbox(root) {
  const lb = document.getElementById("lightbox");
  if (!lb) return;

  const lbImg = lb.querySelector(".lightboxImg");
  const closeBtn = lb.querySelector(".lightboxClose");

  const open = (src) => {
    if (!lbImg) return;
    lbImg.src = src;
    lb.setAttribute("aria-hidden", "false");
    lb.classList.add("show");
  };

  const close = () => {
    if (!lbImg) return;
    lb.classList.remove("show");
    lb.setAttribute("aria-hidden", "true");
    lbImg.src = "";
  };

  root.querySelectorAll(".photoItem").forEach((btn) => {
    btn.addEventListener("click", () => {
      const src = btn.getAttribute("data-src");
      if (src) open(src);
    });
  });

  if (closeBtn) closeBtn.addEventListener("click", close);
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });

  // ESC 닫기(여러 번 들어가도 문제 없게: 매번 새로 등록)
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

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

  const metaLines = [
  type ? `<div><b>Type: </b><span>${escapeHTML(type)}</span></div>` : "",
  year ? `<div><b>Year: </b><span>${escapeHTML(year)}</span></div>` : "",
  client ? `<div><b>Client: </b><span>${escapeHTML(client)}</span></div>` : ""
].filter(Boolean).join("");

  const creditsArr = Array.isArray(work.credits) ? work.credits : [];
  const creditsHTML = creditsArr.length ? `
    <div class="workCredits">
      <h3>Credits</h3>
      <ul>
        ${creditsArr.map((c) => `<li>${escapeHTML(String(c))}</li>`).join("")}
      </ul>
    </div>
  ` : "";

  const isPhoto =
    String(work.type || "").toLowerCase() === "photo" ||
    Array.isArray(work.images);

  let leftHTML = "";

  if (isPhoto) {
    leftHTML = buildPhotoLeftHTML(work);
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

  if (isPhoto) {
    bindLightbox(root);
  }
}

// =====================
// Boot
// =====================
document.addEventListener("DOMContentLoaded", () => {
  renderPortfolio().catch(console.error);
  renderWork().catch(console.error);
});
