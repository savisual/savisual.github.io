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
  return String(str ?? "").replaceAll('"', "&quot;");
}

/**
 * video 스키마 지원:
 * 1) "videoId": "ABCDEFGHIJK"
 * 2) "video": { "provider": "youtube", "id": "ABCDEFGHIJK" }
 * 3) (옵션) "video": { "provider": "vimeo", "id": "123456" }
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

function isPhotoWork(work) {
  // type이 "Photo"이거나 images 배열이 있으면 Photo로 처리
  return String(work.type || "").toLowerCase() === "photo" || Array.isArray(work.images);
}

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

      const isPhoto = isPhotoWork(w);

      // ✅ 여기서 "영상/포토 썸네일 비율"을 클래스 분리
      const thumbClass = isPhoto ? "thumb thumbPhoto" : "thumb thumbVideo";

      // background-image로 통일(상대경로/절대URL 모두 OK)
      const thumbStyle = thumb
        ? `style="background-image:url('${thumb.replace(/'/g, "\\'")}')"`
        : "";

      return `
        <a class="card" href="/work/?id=${encodeURIComponent(w.id)}">
          <div class="${thumbClass}" ${thumbStyle}></div>
          <div class="meta">
            <b>${escapeHTML(title)}</b>
            <span>${escapeHTML(type)}${year ? " · " + escapeHTML(year) : ""}</span>
          </div>
        </a>
      `;
    })
    .join("");
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

  // ✅ 좌/우 정렬(띄어쓰기 문제 해결): 라벨/값을 분리해서 span으로 넣음
  const metaLines = [
    type ? `<div><b>Type</b><span>${escapeHTML(type)}</span></div>` : "",
    year ? `<div><b>Year</b><span>${escapeHTML(year)}</span></div>` : "",
    client ? `<div><b>Client</b><span>${escapeHTML(client)}</span></div>` : ""
  ].filter(Boolean).join("");

  const creditsArr = Array.isArray(work.credits) ? work.credits : [];
  const creditsHTML = creditsArr.length ? `
    <div class="workCredits">
      <h3>Credits</h3>
      <ul>
        ${creditsArr.map(c => `<li>${escapeHTML(String(c))}</li>`).join("")}
      </ul>
    </div>
  ` : "";

  const photo = isPhotoWork(work);

  let leftHTML = "";

  if (photo) {
    const imgs = Array.isArray(work.images) ? work.images : (work.thumb ? [work.thumb] : []);
    const safeImgs = imgs.map(x => String(x || "").trim()).filter(Boolean);

    // ✅ 포토 상세: 라이트박스 + 좌우 네비(버튼)
    leftHTML = `
      <div class="workPlayer">
        <a class="workBackArrow" href="/portfolio/" aria-label="Back"></a>

        <div class="photoGrid">
          ${safeImgs.map((src, i) => `
            <button class="photoItem" type="button" data-index="${i}" data-src="${escapeAttr(src)}" aria-label="Open image ${i + 1}">
              <img src="${escapeAttr(src)}" alt="${escapeAttr(title)} ${i + 1}" loading="lazy" />
            </button>
          `).join("")}
        </div>

        <div class="lightbox" id="lightbox" aria-hidden="true">
          <button class="lightboxClose" type="button" aria-label="Close"></button>

          <button class="lightboxNav prev" type="button" aria-label="Previous"></button>
          <button class="lightboxNav next" type="button" aria-label="Next"></button>

          <img class="lightboxImg" alt="" />
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

  // ✅ 포토 라이트박스 동작
  if (photo) {
    const items = Array.from(root.querySelectorAll(".photoItem"));
    const lb = document.getElementById("lightbox");
    const lbImg = lb ? lb.querySelector(".lightboxImg") : null;
    const closeBtn = lb ? lb.querySelector(".lightboxClose") : null;
    const prevBtn = lb ? lb.querySelector(".lightboxNav.prev") : null;
    const nextBtn = lb ? lb.querySelector(".lightboxNav.next") : null;

    let current = 0;

    const open = (index) => {
      if (!lb || !lbImg) return;
      current = index;
      const src = items[current]?.getAttribute("data-src");
      if (!src) return;
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

    const prev = () => {
      if (!items.length) return;
      open((current - 1 + items.length) % items.length);
    };

    const next = () => {
      if (!items.length) return;
      open((current + 1) % items.length);
    };

    items.forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-index"));
        if (!Number.isNaN(idx)) open(idx);
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    if (prevBtn) prevBtn.addEventListener("click", (e) => { e.stopPropagation(); prev(); });
    if (nextBtn) nextBtn.addEventListener("click", (e) => { e.stopPropagation(); next(); });

    if (lb) {
      lb.addEventListener("click", (e) => {
        // 배경 클릭 시 닫기
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

document.addEventListener("DOMContentLoaded", () => {
  renderPortfolio().catch(console.error);
  renderWork().catch(console.error);
});
