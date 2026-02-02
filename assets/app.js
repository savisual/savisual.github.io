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
  return String(work.type || "").toLowerCase() === "photo" || Array.isArray(work.images);
}

/* =========================
   PORTFOLIO
   ========================= */
async function renderPortfolio() {
  const grid = document.getElementById("worksGrid");
  if (!grid) return; // 포트폴리오 페이지가 아니면 종료

  const works = await loadWorks();

  grid.innerHTML = works.map((w) => {
    const thumb = (w.thumb && String(w.thumb).trim()) ? String(w.thumb).trim() : "";
    const type = (w.type && String(w.type).trim()) ? String(w.type).trim() : "Work";
    const year = (w.year && String(w.year).trim()) ? String(w.year).trim() : "";
    const title = (w.title && String(w.title).trim()) ? String(w.title).trim() : "";

    const isPhoto = isPhotoWork(w);

    // ✅ 여기서 비율 분리 클래스가 "실제로" 들어감
    const thumbClass = isPhoto ? "thumb thumbPhoto" : "thumb thumbVideo";

    const thumbStyle = thumb ? `style="background-image:url('${thumb.replace(/'/g, "\\'")}')"` : "";

    return `
      <a class="card" href="/work/?id=${encodeURIComponent(w.id)}">
        <div class="${thumbClass}" ${thumbStyle}></div>
        <div class="meta">
          <b>${escapeHTML(title)}</b>
          <span>${escapeHTML(type)}${year ? " · " + escapeHTML(year) : ""}</span>
        </div>
      </a>
    `;
  }).join("");
}

/* =========================
   WORK DETAIL
   ========================= */
async function renderWork() {
  const root = document.getElementById("workRoot");
  if (!root) return; // 상세 페이지가 아니면 종료

  const works = await loadWorks();
  const id = qs("id");
  const work = works.find((w) => w.id === id);

  if (!work) {
    root.innerHTML = `<p>작업물을 찾을 수 없습니다. <a href="/portfolio/">포트폴리오로 돌아가기</a></p>`;
    return;
  }

  const title = String(work.title || "");
  const type = String(work.type || "");
  const year = String(work.year || "");
  const client = String(work.client || "");

  // ✅ 메타 라벨/값 좌우 정렬 (TypeFull Video 같은 문제 해결)
  const metaLines = [
    type ? `<div><b>Type</b><span>${escapeHTML(type)}</span></div>` : "",
    year ? `<div><b>Year</b><span>${escapeHTML(year)}</span></div>` : "",
    client ? `<div><b>Client</b><span>${escapeHTML(client)}</span></div>` : ""
  ].filter(Boolean).join("");

  const creditsArr = Array.isArray(work.credits) ? work.credits : [];
  const creditsHTML = creditsArr.length ? `
    <div class="workCredits">
      <h3>CREDIT</h3>
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

  // ✅ 포토 라이트박스 + 좌우
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

/* =========================
   CONTACT (사라지는 문제 방지 + Copy 토스트)
   - Contact 페이지에 아래 요소가 있으면 자동 동작:
     1) 버튼 .copyBtn
     2) 복사할 텍스트: .contactValue 또는 [data-copy-value]
     3) 토스트: .toast
   ========================= */
function bindContactCopy() {
  const btn = document.querySelector(".copyBtn");
  if (!btn) return; // Contact 페이지가 아니면 종료

  const valueEl =
    document.querySelector("[data-copy-value]") ||
    document.querySelector(".contactValue");

  const toast = document.querySelector(".toast");

  if (!valueEl) return;

  const getText = () => {
    const v = valueEl.getAttribute("data-copy-value");
    return (v && v.trim()) ? v.trim() : (valueEl.textContent || "").trim();
  };

  btn.addEventListener("click", async () => {
    const text = getText();
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // clipboard 실패 시 fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    // alert 없이 1.2초 "Copied" 표시 (toast가 있을 때만)
    if (toast) {
      toast.textContent = "Copied";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1200);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderPortfolio().catch(console.error);
  renderWork().catch(console.error);
  bindContactCopy();
});
