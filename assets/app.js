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

/* =========================
   PORTFOLIO (GRID)
   ========================= */
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

      const isPhoto = String(type).toLowerCase() === "photo" || Array.isArray(w.images);

      // thumb는 상대경로든 절대URL이든 그대로 사용
      const safeBg = thumb ? `style="background-image:url('${thumb.replace(/'/g, "\\'")}')"` : "";

      return `
        <a class="card ${isPhoto ? "card--photo" : "card--video"}" href="/work/?id=${encodeURIComponent(w.id)}">
          <div class="thumb ${isPhoto ? "thumb--photo" : "thumb--video"}" ${safeBg}>
            ${isPhoto ? `<span class="badgePhoto">PHOTO</span>` : ``}
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

/* =========================
   WORK DETAIL (VIDEO / PHOTO)
   ========================= */
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

  const isPhoto = String(type).toLowerCase() === "photo" || Array.isArray(work.images);

  // 오른쪽 메타: "Type : Photo" 형태로 보이도록 (띄어쓰기 포함)
  const metaLines = [
    type ? `<div><b>Type</b><span>${escapeHTML(type)}</span></div>` : "",
    year ? `<div><b>Year</b><span>${escapeHTML(year)}</span></div>` : "",
    client ? `<div><b>Client</b><span>${escapeHTML(client)}</span></div>` : "",
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

  let leftHTML = "";

  if (isPhoto) {
    const imgs = Array.isArray(work.images) ? work.images : (work.thumb ? [work.thumb] : []);
    const safeImgs = imgs.map((x) => String(x || "").trim()).filter(Boolean);

    leftHTML = `
      <div class="workPlayer workPlayer--photo">
        <a class="workBackArrow" href="/portfolio/" aria-label="Back"></a>

        <div class="photoGrid" id="photoGrid">
          ${safeImgs
            .map(
              (src, i) => `
              <button class="photoItem" type="button" data-idx="${i}" data-src="${escapeAttr(src)}" aria-label="Open image ${i + 1}">
                <img src="${escapeAttr(src)}" alt="${escapeAttr(title)} ${i + 1}" loading="lazy" />
              </button>
            `
            )
            .join("")}
        </div>

        <div class="lightbox" id="lightbox" aria-hidden="true">
          <button class="lbClose" type="button" aria-label="Close"></button>
          <button class="lbPrev" type="button" aria-label="Previous"></button>
          <button class="lbNext" type="button" aria-label="Next"></button>
          <img class="lbImg" alt="" />
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

  // ===== Photo 라이트박스 + 좌우 네비 =====
  if (isPhoto) {
    const imgs = Array.isArray(work.images) ? work.images : [];
    let idx = 0;

    const lb = document.getElementById("lightbox");
    const lbImg = lb ? lb.querySelector(".lbImg") : null;
    const btnClose = lb ? lb.querySelector(".lbClose") : null;
    const btnPrev = lb ? lb.querySelector(".lbPrev") : null;
    const btnNext = lb ? lb.querySelector(".lbNext") : null;

    const open = (i) => {
      if (!lb || !lbImg) return;
      idx = (i + imgs.length) % imgs.length;
      lbImg.src = imgs[idx];
      lb.classList.add("show");
      lb.setAttribute("aria-hidden", "false");
    };

    const close = () => {
      if (!lb || !lbImg) return;
      lb.classList.remove("show");
      lb.setAttribute("aria-hidden", "true");
      lbImg.src = "";
    };

    const prev = () => open(idx - 1);
    const next = () => open(idx + 1);

    root.querySelectorAll(".photoItem").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-idx") || "0");
        open(i);
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
      if (!lb || !lb.classList.contains("show")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    });
  }
}

/* =========================
   CONTACT (Centered card 유지)
   ========================= */
function copyText(text) {
  return navigator.clipboard.writeText(text);
}

async function renderContact() {
  const root = document.getElementById("contactRoot");
  if (!root) return;

  // 네가 쓰던 이메일로 유지 (원하면 여기만 바꾸면 됨)
  const email = "safilm8206@gmail.com";

  root.innerHTML = `
    <div class="contactCenter">
      <div class="contactCard">
        <h1>Contact</h1>

        <div class="contactRow">
          <div class="contactLabel">Email</div>
          <div class="contactValue" id="emailValue">${escapeHTML(email)}</div>
          <button class="copyBtn" id="copyBtn" type="button">Copy</button>
        </div>

        <div class="toast" id="toast">Copied</div>
      </div>
    </div>
  `;

  const btn = document.getElementById("copyBtn");
  const toast = document.getElementById("toast");

  if (btn) {
    btn.addEventListener("click", async () => {
      try {
        await copyText(email);
        if (!toast) return;

        toast.classList.add("show");
        clearTimeout(window.__toastTimer);
        window.__toastTimer = setTimeout(() => {
          toast.classList.remove("show");
        }, 1200);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

/* =========================
   BOOT
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  renderPortfolio().catch(console.error);
  renderWork().catch(console.error);
  renderContact().catch(console.error);
});
