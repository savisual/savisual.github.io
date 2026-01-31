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

/**
 * works.json의 video 스키마를 모두 지원:
 * 1) "videoId": "ABCDEFGHIJK"
 * 2) "video": { "provider": "youtube", "id": "ABCDEFGHIJK" }
 * 3) (옵션) "video": { "provider": "vimeo", "id": "123456" }
 */
function normalizeVideo(work) {
  // videoId 우선
  if (work.videoId && typeof work.videoId === "string") {
    return { provider: "youtube", id: work.videoId };
  }
  // video 객체
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

  function photoGalleryHTML(images, title = "") {
  if (!Array.isArray(images) || images.length === 0) return "";

  const items = images
    .map((src) => `
      <a class="photoItem" href="${escapeAttr(src)}" target="_blank" rel="noopener">
        <img src="${escapeAttr(src)}" alt="${escapeAttr(title)}" loading="lazy" />
      </a>
    `)
    .join("");

  return `
    <div class="photoGallery">
      ${items}
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

async function renderPortfolio() {
  const works = await loadWorks();
  const grid = document.getElementById("worksGrid");
  if (!grid) return;

  grid.innerHTML = works.map(w => {
    const thumb = (w.thumb && String(w.thumb).trim()) ? String(w.thumb).trim() : "";
    const type = (w.type && String(w.type).trim()) ? String(w.type).trim() : "Work";
    const year = (w.year && String(w.year).trim()) ? String(w.year).trim() : "";
    const title = (w.title && String(w.title).trim()) ? String(w.title).trim() : "";

    // thumb가 상대경로(/assets/...)이든 절대URL이든 그대로 background-image로 사용
    const thumbStyle = thumb ? `style="background-image:url('${thumb.replace(/'/g, "\\'")}')"` : "";

    return `
      <a class="card" href="/work/?id=${encodeURIComponent(w.id)}">
        <div class="thumb" ${thumbStyle}></div>
        <div class="meta">
          <b>${escapeHTML(title)}</b>
          <span>${escapeHTML(type)}${year ? " · " + escapeHTML(year) : ""}</span>
        </div>
      </a>
    `;
  }).join("");
}
async function renderWork() {
  const works = await loadWorks();
  const id = qs("id");
  const work = works.find(w => w.id === id);
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

  // 메타(오른쪽)
  const metaLines = [
    type ? `<div><b>Type</b><span>${escapeHTML(type)}</span></div>` : "",
    year ? `<div><b>Year</b><span>${escapeHTML(year)}</span></div>` : "",
    client ? `<div><b>Client</b><span>${escapeHTML(client)}</span></div>` : ""
  ].filter(Boolean).join("");

  // 크레딧
  const creditsArr = Array.isArray(work.credits) ? work.credits : [];
  const creditsHTML = creditsArr.length ? `
    <div class="workCredits">
      <h3>Credits</h3>
      <ul>
        ${creditsArr.map(c => `<li>${escapeHTML(String(c))}</li>`).join("")}
      </ul>
    </div>
  ` : "";

  // ====== 핵심: Photo면 갤러리 / Video면 임베드 ======
  const isPhoto = (String(work.type || "").toLowerCase() === "photo") || Array.isArray(work.images);

  let leftHTML = "";

  if (isPhoto) {
    const imgs = Array.isArray(work.images) ? work.images : (work.thumb ? [work.thumb] : []);
    const safeImgs = imgs
      .map(x => String(x || "").trim())
      .filter(Boolean);

    leftHTML = `
      <a class="workBackArrow" href="/portfolio/" aria-label="Back"></a>

      <div class="photoGrid">
        ${safeImgs.map((src, i) => `
          <button class="photoItem" type="button" data-src="${escapeHTML(src)}" aria-label="Open image ${i + 1}">
            <img src="${escapeHTML(src)}" alt="${escapeHTML(title)} ${i + 1}" loading="lazy" />
          </button>
        `).join("")}
      </div>

      <div class="lightbox" id="lightbox" aria-hidden="true">
        <button class="lightboxClose" type="button" aria-label="Close"></button>
        <img class="lightboxImg" alt="" />
      </div>
    `;
  } else {
    // video object / videoId 둘 다 처리 (너희 기존 구조 호환)
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

  // Photo 라이트박스 이벤트 (Photo일 때만)
  if (isPhoto) {
    const lb = document.getElementById("lightbox");
    const lbImg = lb ? lb.querySelector(".lightboxImg") : null;
    const closeBtn = lb ? lb.querySelector(".lightboxClose") : null;

    const open = (src) => {
      if (!lb || !lbImg) return;
      lbImg.src = src;
      lb.setAttribute("aria-hidden", "false");
      lb.classList.add("show");
    };

    const close = () => {
      if (!lb || !lbImg) return;
      lb.classList.remove("show");
      lb.setAttribute("aria-hidden", "true");
      lbImg.src = "";
    };

    root.querySelectorAll(".photoItem").forEach(btn => {
      btn.addEventListener("click", () => {
        const src = btn.getAttribute("data-src");
        if (src) open(src);
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    if (lb) lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); }, { once: true });
  }
}

  const video = normalizeVideo(work);

  // 오른쪽 메타(있는 것만 표시)
  const metaLines = [
    work.type ? `<div><b>Type</b>: ${escapeHTML(work.type)}</div>` : "",
    work.year ? `<div><b>Year</b>: ${escapeHTML(work.year)}</div>` : "",
    work.client ? `<div><b>Client</b>: ${escapeHTML(work.client)}</div>` : "",
  ].filter(Boolean).join("");

  const credits = Array.isArray(work.credits) ? work.credits : [];
  const creditsHTML = credits.length
    ? `
      <div class="workCredits">
        <h3>Credits</h3>
        <ul>
          ${credits.map(c => `<li>${escapeHTML(c)}</li>`).join("")}
        </ul>
      </div>
    `
    : "";

root.innerHTML = `
  <div class="container">
    <div class="workLayout">
      <!-- LEFT -->
      <div class="workMain">
        <div class="workPlayer">
          <a class="workBackArrow" href="/portfolio/" aria-label="Back"></a>
          ${(work.images && work.images.length) ? photoGalleryHTML(work.images, work.title || "") : videoEmbedHTML(video)}
        </div>
      </div>

      <!-- RIGHT -->
      <aside class="workSidebar">
        <h1 class="workTitle">${escapeHTML(work.title || "")}</h1>

        <div class="workMeta">
          ${work.type ? `<div><b>Type</b><span>${escapeHTML(work.type)}</span></div>` : ""}
          ${work.year ? `<div><b>Year</b><span>${escapeHTML(work.year)}</span></div>` : ""}
          ${work.client ? `<div><b>Client</b><span>${escapeHTML(work.client)}</span></div>` : ""}
        </div>
      </aside>
    </div>

    ${creditsHTML}
  </div>
`;
}

document.addEventListener("DOMContentLoaded", () => {
  renderPortfolio().catch(console.error);
  renderWork().catch(console.error);
});
